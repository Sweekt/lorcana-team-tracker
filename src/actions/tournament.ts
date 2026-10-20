"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { revalidatePath } from "next/cache";
import { getCurrentTeamId } from "@/lib/current-team";
import {
    CreateTournamentInput,
    UpdateTournamentInput,
    GeneratedMatch,
    MatchFormat,
    MatchStatus,
    TournamentFormat,
} from "@/lib/tournament/types";
import { generateSwissRound } from "@/lib/tournament/swiss";
import { generateSingleEliminationRound } from "@/lib/tournament/single-elimination";
import { generateRoundRobinRounds } from "@/lib/tournament/round-robin";
import { computeStandings } from "@/lib/tournament/standings";
import {
    resolveDropForfeits,
    calculateDefaultSwissRounds,
    canEditTournamentFormat,
} from "@/lib/tournament/tournament-lifecycle";
import {
    createDuelsTableForMatch,
    checkDuelsTableStatus,
} from "@/lib/tournament/duels-bot";

// --- Helpers d'authentification et de permissions ---

async function getAuthenticatedUser(): Promise<{ userId: string } | { error: string }> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return { error: "Vous devez être connecté pour effectuer cette action." };
    }
    return { userId: session.user.id };
}

async function checkTeamAdmin(teamId: string, userId: string): Promise<boolean> {
    const member = await prisma.teamMember.findUnique({
        where: {
            userId_teamId: {
                userId,
                teamId,
            },
        },
    });
    return member?.role === "ADMIN";
}

// --- Server Actions ---

/**
 * Crée un nouveau tournoi rattaché à l'équipe active.
 * Réservé aux administrateurs/capitaines (rôle ADMIN).
 */
export async function createTournamentAction(data: CreateTournamentInput & { teamId?: string }) {
    try {
        const auth = await getAuthenticatedUser();
        if ("error" in auth) return { error: auth.error };

        const teamId = data.teamId || (await getCurrentTeamId());
        if (!teamId) {
            return { error: "Équipe introuvable. Veuillez sélectionner une équipe active." };
        }

        const isAdmin = await checkTeamAdmin(teamId, auth.userId);
        if (!isAdmin) {
            return { error: "Action réservée aux capitaines et administrateurs de l'équipe." };
        }

        const name = data.name?.trim();
        if (!name) {
            return { error: "Le nom du tournoi est requis." };
        }

        const format: TournamentFormat = data.format || "SWISS";
        const matchFormat: MatchFormat = data.matchFormat || "BO3";
        const topCutSize = format === "SWISS_TOP_CUT"
            ? (data.topCutSize ? Number(data.topCutSize) : 4)
            : null;
        const roundsCount = data.roundsCount ? Number(data.roundsCount) : null;

        const tournament = await prisma.tournament.create({
            data: {
                teamId,
                createdById: auth.userId,
                name,
                format,
                matchFormat,
                set: data.set?.trim() || null,
                allowDeckChanges: Boolean(data.allowDeckChanges),
                topCutSize,
                roundsCount,
                status: "REGISTRATION",
                currentRoundNumber: 0,
            },
        });

        revalidatePath("/tournaments");
        revalidatePath(`/tournaments/${tournament.id}`);

        return { success: true, tournamentId: tournament.id, tournament };
    } catch (error) {
        console.error("[createTournamentAction] Erreur inattendue:", error);
        return { error: "Une erreur est survenue lors de la création du tournoi." };
    }
}

/**
 * Modifie les paramètres et le format d'un tournoi pendant la phase d'inscriptions.
 * Réservé aux administrateurs/capitaines (ADMIN).
 */
export async function updateTournamentAction(
    tournamentId: string,
    data: UpdateTournamentInput
) {
    try {
        const auth = await getAuthenticatedUser();
        if ("error" in auth) return { error: auth.error };

        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
        });
        if (!tournament) return { error: "Tournoi introuvable." };

        const isAdmin = await checkTeamAdmin(tournament.teamId, auth.userId);
        if (!isAdmin) {
            return { error: "Action réservée aux capitaines et administrateurs de l'équipe." };
        }

        if (!canEditTournamentFormat(tournament.status)) {
            return {
                error: "Le format et les paramètres du tournoi ne peuvent être modifiés que pendant la phase d'inscriptions.",
            };
        }

        const name = data.name !== undefined ? data.name.trim() : tournament.name;
        if (!name) {
            return { error: "Le nom du tournoi ne peut pas être vide." };
        }

        const format = data.format ?? tournament.format;
        const matchFormat = data.matchFormat ?? tournament.matchFormat;
        const topCutSize = format === "SWISS_TOP_CUT"
            ? (data.topCutSize ? Number(data.topCutSize) : (tournament.topCutSize || 4))
            : null;
        const roundsCount = data.roundsCount !== undefined
            ? (data.roundsCount ? Number(data.roundsCount) : null)
            : tournament.roundsCount;

        const updated = await prisma.tournament.update({
            where: { id: tournamentId },
            data: {
                name,
                format,
                matchFormat,
                set: data.set !== undefined ? (data.set?.trim() || null) : tournament.set,
                allowDeckChanges: data.allowDeckChanges !== undefined ? Boolean(data.allowDeckChanges) : tournament.allowDeckChanges,
                topCutSize,
                roundsCount,
            },
        });

        revalidatePath("/tournaments");
        revalidatePath(`/tournaments/${tournamentId}`);

        return { success: true, tournament: updated };
    } catch (error) {
        console.error("[updateTournamentAction] Erreur inattendue:", error);
        return { error: "Une erreur est survenue lors de la mise à jour du tournoi." };
    }
}

/**
 * Supprime définitivement un tournoi et toutes ses données associées (participants, rondes, matchs).
 * Accessible peu importe la phase du tournoi (inscriptions, en cours, terminé).
 * Réservé aux administrateurs/capitaines (ADMIN).
 */
export async function deleteTournamentAction(tournamentId: string) {
    try {
        const auth = await getAuthenticatedUser();
        if ("error" in auth) return { error: auth.error };

        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
        });
        if (!tournament) return { error: "Tournoi introuvable." };

        const isAdmin = await checkTeamAdmin(tournament.teamId, auth.userId);
        if (!isAdmin) {
            return { error: "Action réservée aux capitaines et administrateurs de l'équipe." };
        }

        await prisma.tournament.delete({
            where: { id: tournamentId },
        });

        revalidatePath("/tournaments");
        revalidatePath(`/tournaments/${tournamentId}`);

        return { success: true };
    } catch (error) {
        console.error("[deleteTournamentAction] Erreur inattendue:", error);
        return { error: "Une erreur est survenue lors de la suppression du tournoi." };
    }
}

/**
 * Permet à un membre de l'équipe de s'inscrire au tournoi en phase d'inscriptions.
 * Vérifie la présence d'une connexion Duels.ink (duelsUserId ou duelsAccessToken).
 */
export async function joinTournamentAction(
    tournamentId: string,
    options?: { officialDecklist?: string; officialDeckColors?: string[] }
) {
    try {
        const auth = await getAuthenticatedUser();
        if ("error" in auth) return { error: auth.error };

        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
        });
        if (!tournament) return { error: "Tournoi introuvable." };

        if (tournament.status !== "REGISTRATION") {
            return { error: "Les inscriptions à ce tournoi sont fermées." };
        }

        const user = await prisma.user.findUnique({
            where: { id: auth.userId },
            select: {
                id: true,
                duelsUserId: true,
                duelsAccessToken: true,
            },
        });

        if (!user || (!user.duelsUserId && !user.duelsAccessToken)) {
            return {
                error: "Vous devez connecter votre compte Duels.ink dans vos paramètres avant de rejoindre un tournoi.",
            };
        }

        const membership = await prisma.teamMember.findUnique({
            where: {
                userId_teamId: {
                    userId: auth.userId,
                    teamId: tournament.teamId,
                },
            },
        });
        if (!membership) {
            return { error: "Vous devez faire partie de cette équipe pour rejoindre le tournoi." };
        }

        const existing = await prisma.tournamentParticipant.findUnique({
            where: {
                tournamentId_userId: {
                    tournamentId,
                    userId: auth.userId,
                },
            },
        });
        if (existing) {
            return { error: "Vous êtes déjà inscrit à ce tournoi." };
        }

        const currentCount = await prisma.tournamentParticipant.count({
            where: { tournamentId },
        });

        const participant = await prisma.tournamentParticipant.create({
            data: {
                tournamentId,
                userId: auth.userId,
                seed: currentCount + 1,
                officialDecklist: options?.officialDecklist?.trim() || null,
                officialDeckColors: options?.officialDeckColors || [],
            },
        });

        revalidatePath("/tournaments");
        revalidatePath(`/tournaments/${tournamentId}`);

        return { success: true, participantId: participant.id };
    } catch (error) {
        console.error("[joinTournamentAction] Erreur inattendue:", error);
        return { error: "Une erreur est survenue lors de l'inscription au tournoi." };
    }
}

/**
 * Permet à un joueur de se désinscrire tant que le tournoi est en phase REGISTRATION.
 */
export async function leaveTournamentAction(tournamentId: string) {
    try {
        const auth = await getAuthenticatedUser();
        if ("error" in auth) return { error: auth.error };

        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
        });
        if (!tournament) return { error: "Tournoi introuvable." };

        if (tournament.status !== "REGISTRATION") {
            return { error: "Impossible de quitter un tournoi déjà commencé. Vous devez abandonner (Drop)." };
        }

        const participant = await prisma.tournamentParticipant.findUnique({
            where: {
                tournamentId_userId: {
                    tournamentId,
                    userId: auth.userId,
                },
            },
        });
        if (!participant) {
            return { error: "Vous n'êtes pas inscrit à ce tournoi." };
        }

        await prisma.tournamentParticipant.delete({
            where: { id: participant.id },
        });

        revalidatePath("/tournaments");
        revalidatePath(`/tournaments/${tournamentId}`);

        return { success: true };
    } catch (error) {
        console.error("[leaveTournamentAction] Erreur inattendue:", error);
        return { error: "Une erreur est survenue lors de la désinscription." };
    }
}

/**
 * Expulse un joueur de la liste des participants avant le lancement du tournoi.
 * Réservé aux administrateurs (ADMIN).
 */
export async function kickParticipantAction(tournamentId: string, participantId: string) {
    try {
        const auth = await getAuthenticatedUser();
        if ("error" in auth) return { error: auth.error };

        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
        });
        if (!tournament) return { error: "Tournoi introuvable." };

        const isAdmin = await checkTeamAdmin(tournament.teamId, auth.userId);
        if (!isAdmin) {
            return { error: "Action réservée aux capitaines et administrateurs de l'équipe." };
        }

        if (tournament.status !== "REGISTRATION") {
            return { error: "Impossible d'expulser un joueur d'un tournoi déjà commencé." };
        }

        const participant = await prisma.tournamentParticipant.findFirst({
            where: { id: participantId, tournamentId },
        });
        if (!participant) {
            return { error: "Participant introuvable." };
        }

        await prisma.tournamentParticipant.delete({
            where: { id: participant.id },
        });

        revalidatePath("/tournaments");
        revalidatePath(`/tournaments/${tournamentId}`);

        return { success: true };
    } catch (error) {
        console.error("[kickParticipantAction] Erreur inattendue:", error);
        return { error: "Une erreur est survenue lors de l'expulsion du joueur." };
    }
}

/**
 * Gère l'abandon (Drop) d'un participant en cours de tournoi.
 * Peut être appelé par le joueur lui-même ou par un administrateur.
 * Applique resolveDropForfeits sur les matchs non terminés de la ronde courante.
 */
export async function dropTournamentAction(tournamentId: string, participantId: string) {
    try {
        const auth = await getAuthenticatedUser();
        if ("error" in auth) return { error: auth.error };

        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
            include: {
                rounds: {
                    where: { roundNumber: { gte: 1 } },
                    include: { matches: true },
                },
            },
        });
        if (!tournament) return { error: "Tournoi introuvable." };

        if (tournament.status === "FINISHED") {
            return { error: "Impossible d'abandonner un tournoi déjà terminé." };
        }

        const participant = await prisma.tournamentParticipant.findFirst({
            where: { id: participantId, tournamentId },
        });
        if (!participant) return { error: "Participant introuvable." };

        const isAdmin = await checkTeamAdmin(tournament.teamId, auth.userId);
        const isSelf = participant.userId === auth.userId;
        if (!isAdmin && !isSelf) {
            return { error: "Vous n'avez pas l'autorisation d'abandonner à la place de ce joueur." };
        }

        if (participant.dropped) {
            return { error: "Ce joueur a déjà abandonné le tournoi." };
        }

        // Marquer le participant comme abandonné
        await prisma.tournamentParticipant.update({
            where: { id: participantId },
            data: {
                dropped: true,
                droppedAtRound: tournament.currentRoundNumber || 1,
            },
        });

        // Si le tournoi est en cours, résoudre les forfaits pour les matchs actifs de la ronde courante
        if (tournament.status === "RUNNING" || tournament.status === "TOP_CUT") {
            const currentRound = tournament.rounds.find(
                r => r.roundNumber === tournament.currentRoundNumber
            );
            if (currentRound && currentRound.matches.length > 0) {
                const updatedMatches = resolveDropForfeits(currentRound.matches, participantId);
                for (const updated of updatedMatches) {
                    const original = currentRound.matches.find(m => m.id === updated.id);
                    if (
                        original &&
                        (original.status !== updated.status ||
                            original.isForfeit !== updated.isForfeit ||
                            original.winnerId !== updated.winnerId)
                    ) {
                        await prisma.tournamentMatch.update({
                            where: { id: updated.id },
                            data: {
                                status: updated.status as MatchStatus,
                                isForfeit: updated.isForfeit,
                                player1Score: updated.player1Score ?? (updated as any).p1Score ?? 0,
                                player2Score: updated.player2Score ?? (updated as any).p2Score ?? 0,
                                winnerId: updated.winnerId,
                            },
                        });
                    }
                }
            }
        }

        revalidatePath("/tournaments");
        revalidatePath(`/tournaments/${tournamentId}`);

        return { success: true };
    } catch (error) {
        console.error("[dropTournamentAction] Erreur inattendue:", error);
        return { error: "Une erreur est survenue lors de l'enregistrement de l'abandon." };
    }
}

/**
 * Lance le tournoi : verrouille les inscriptions, génère la ronde 1,
 * crée les tables Duels privées et initialise les matchs.
 * Réservé aux administrateurs (ADMIN).
 */
export async function startTournamentAction(tournamentId: string) {
    try {
        const auth = await getAuthenticatedUser();
        if ("error" in auth) return { error: auth.error };

        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
            include: {
                participants: {
                    include: { user: true },
                },
            },
        });
        if (!tournament) return { error: "Tournoi introuvable." };

        const isAdmin = await checkTeamAdmin(tournament.teamId, auth.userId);
        if (!isAdmin) {
            return { error: "Action réservée aux capitaines et administrateurs de l'équipe." };
        }

        if (tournament.status !== "REGISTRATION") {
            return { error: "Le tournoi ne peut pas être démarré car il n'est plus en phase d'inscriptions." };
        }

        const activeParticipants = tournament.participants.filter(p => !p.dropped);
        if (activeParticipants.length < 2) {
            return { error: "Un minimum de 2 participants est requis pour démarrer le tournoi." };
        }

        // Préparation des participants pour les générateurs
        const pairingPlayers = activeParticipants.map(p => ({
            id: p.id,
            name: p.user?.name || undefined,
            seed: p.seed ?? undefined,
            dropped: p.dropped,
            officialDecklist: p.officialDecklist,
            officialDeckColors: p.officialDeckColors,
        }));

        let generatedMatches: GeneratedMatch[] = [];
        let calculatedRoundsCount = tournament.roundsCount;

        if (tournament.format === "SWISS" || tournament.format === "SWISS_TOP_CUT") {
            calculatedRoundsCount = tournament.roundsCount || calculateDefaultSwissRounds(activeParticipants.length);
            generatedMatches = generateSwissRound(pairingPlayers, [], 1);
        } else if (tournament.format === "SINGLE_ELIMINATION") {
            calculatedRoundsCount = Math.ceil(Math.log2(activeParticipants.length));
            generatedMatches = generateSingleEliminationRound(pairingPlayers, 1, []);
        } else if (tournament.format === "ROUND_ROBIN") {
            const allRounds = generateRoundRobinRounds(pairingPlayers);
            calculatedRoundsCount = allRounds.length;
            generatedMatches = allRounds[0] || [];
        }

        if (generatedMatches.length === 0) {
            return { error: "Impossible de générer les appariements de la ronde 1." };
        }

        // Créer la Ronde 1
        const round1 = await prisma.tournamentRound.create({
            data: {
                tournamentId,
                roundNumber: 1,
                isTopCut: false,
                status: "IN_PROGRESS",
            },
        });

        // Créer les matchs de la Ronde 1
        for (const gm of generatedMatches) {
            const p1 = activeParticipants.find(p => p.id === gm.p1Id);
            const p2 = gm.p2Id ? activeParticipants.find(p => p.id === gm.p2Id) : null;

            if (gm.isBye || !p2) {
                await prisma.tournamentMatch.create({
                    data: {
                        roundId: round1.id,
                        tableNumber: gm.tableNumber,
                        player1Id: gm.p1Id,
                        player2Id: null,
                        isBye: true,
                        status: "FINISHED",
                        player1Score: 2,
                        player2Score: 0,
                        winnerId: gm.p1Id,
                        player1Deck: p1?.officialDecklist || null,
                        player1DeckColors: p1?.officialDeckColors || [],
                    },
                });
            } else {
                let duelsTableId: string | null = null;
                let duelsTableUrl: string | null = null;

                if (p1?.user.duelsUserId && p2.user.duelsUserId) {
                    const table = await createDuelsTableForMatch({
                        p1DuelsId: p1.user.duelsUserId,
                        p2DuelsId: p2.user.duelsUserId,
                        matchFormat: tournament.matchFormat.toLowerCase(),
                        p1Deck: tournament.allowDeckChanges ? undefined : (p1.officialDecklist || undefined),
                        p2Deck: tournament.allowDeckChanges ? undefined : (p2.officialDecklist || undefined),
                    });
                    if (table) {
                        duelsTableId = table.tableId;
                        duelsTableUrl = table.url;
                    }
                }

                await prisma.tournamentMatch.create({
                    data: {
                        roundId: round1.id,
                        tableNumber: gm.tableNumber,
                        player1Id: gm.p1Id,
                        player2Id: gm.p2Id,
                        isBye: false,
                        status: "PENDING",
                        duelsTableId,
                        duelsTableUrl,
                        player1Deck: p1?.officialDecklist || null,
                        player2Deck: p2?.officialDecklist || null,
                        player1DeckColors: p1?.officialDeckColors || [],
                        player2DeckColors: p2?.officialDeckColors || [],
                    },
                });
            }
        }

        // Mettre à jour le statut du tournoi
        await prisma.tournament.update({
            where: { id: tournamentId },
            data: {
                status: "RUNNING",
                currentRoundNumber: 1,
                roundsCount: calculatedRoundsCount,
            },
        });

        revalidatePath("/tournaments");
        revalidatePath(`/tournaments/${tournamentId}`);

        return { success: true, roundId: round1.id };
    } catch (error) {
        console.error("[startTournamentAction] Erreur inattendue:", error);
        return { error: "Une erreur est survenue lors du lancement du tournoi." };
    }
}

/**
 * Lance la ronde suivante du tournoi (ou bascule en Top-Cut, ou marque FINISHED).
 * Vérifie impérativement que tous les matchs de la ronde active sont terminés.
 * Réservé aux administrateurs (ADMIN).
 */
export async function nextRoundAction(tournamentId: string) {
    try {
        const auth = await getAuthenticatedUser();
        if ("error" in auth) return { error: auth.error };

        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
            include: {
                rounds: {
                    orderBy: { roundNumber: "asc" },
                    include: {
                        matches: true,
                    },
                },
                participants: {
                    include: { user: true },
                },
            },
        });
        if (!tournament) return { error: "Tournoi introuvable." };

        const isAdmin = await checkTeamAdmin(tournament.teamId, auth.userId);
        if (!isAdmin) {
            return { error: "Action réservée aux capitaines et administrateurs de l'équipe." };
        }

        if (tournament.status !== "RUNNING" && tournament.status !== "TOP_CUT") {
            return { error: "Le tournoi n'est pas en cours." };
        }

        const currentRound = tournament.rounds.find(
            r => r.roundNumber === tournament.currentRoundNumber
        );
        if (!currentRound) {
            return { error: "Ronde active introuvable." };
        }

        const unfinishedMatches = currentRound.matches.filter(m => m.status !== "FINISHED");
        if (unfinishedMatches.length > 0) {
            return {
                error: `Impossible de lancer la ronde suivante : ${unfinishedMatches.length} match(s) ne sont pas encore terminés.`,
            };
        }

        // Marquer la ronde actuelle comme FINISHED si pas déjà fait
        if (currentRound.status !== "FINISHED") {
            await prisma.tournamentRound.update({
                where: { id: currentRound.id },
                data: { status: "FINISHED" },
            });
        }

        const allMatchesMapped = tournament.rounds.flatMap(r =>
            r.matches.map(m => ({
                id: m.id,
                roundNumber: r.roundNumber,
                tableNumber: m.tableNumber,
                p1Id: m.player1Id,
                p2Id: m.player2Id,
                p1Score: m.player1Score,
                p2Score: m.player2Score,
                winnerId: m.winnerId,
                isBye: m.isBye,
                isForfeit: m.isForfeit,
                status: m.status,
            }))
        );

        const activeParticipants = tournament.participants.filter(p => !p.dropped);
        const pairingPlayers = activeParticipants.map(p => ({
            id: p.id,
            name: p.user?.name || undefined,
            seed: p.seed ?? undefined,
            dropped: p.dropped,
        }));

        let nextRoundNumber = tournament.currentRoundNumber + 1;
        let nextMatches: GeneratedMatch[] = [];
        let isTopCutRound = currentRound.isTopCut;
        let tournamentFinished = false;

        if (tournament.format === "ROUND_ROBIN") {
            const totalRounds = tournament.roundsCount || activeParticipants.length;
            if (tournament.currentRoundNumber >= totalRounds) {
                tournamentFinished = true;
            } else {
                const allRounds = generateRoundRobinRounds(pairingPlayers);
                nextMatches = allRounds[nextRoundNumber - 1] || [];
                if (nextMatches.length === 0) tournamentFinished = true;
            }
        } else if (tournament.format === "SINGLE_ELIMINATION") {
            if (currentRound.matches.length === 1) {
                tournamentFinished = true;
            } else {
                nextMatches = generateSingleEliminationRound(
                    pairingPlayers,
                    nextRoundNumber,
                    allMatchesMapped
                );
                if (nextMatches.length === 0) tournamentFinished = true;
            }
        } else if (tournament.format === "SWISS") {
            const maxRounds = tournament.roundsCount || calculateDefaultSwissRounds(activeParticipants.length);
            if (tournament.currentRoundNumber >= maxRounds) {
                tournamentFinished = true;
            } else {
                nextMatches = generateSwissRound(pairingPlayers, allMatchesMapped, nextRoundNumber);
                if (nextMatches.length === 0) tournamentFinished = true;
            }
        } else if (tournament.format === "SWISS_TOP_CUT") {
            const maxSwissRounds = tournament.roundsCount || calculateDefaultSwissRounds(activeParticipants.length);

            if (tournament.status === "RUNNING") {
                if (tournament.currentRoundNumber < maxSwissRounds) {
                    // Ronde suisse suivante
                    nextMatches = generateSwissRound(pairingPlayers, allMatchesMapped, nextRoundNumber);
                    if (nextMatches.length === 0) tournamentFinished = true;
                } else {
                    // Fin des rondes suisses -> Démarrage du TOP-CUT
                    const standings = computeStandings(
                        tournament.participants.map(p => ({
                            id: p.id,
                            name: p.user?.name || undefined,
                            dropped: p.dropped,
                        })),
                        allMatchesMapped
                    );

                    const topCutSize = tournament.topCutSize || 4;
                    const topCutPlayers = standings.filter(s => !s.dropped).slice(0, topCutSize);

                    if (topCutPlayers.length < 2) {
                        tournamentFinished = true;
                    } else {
                        isTopCutRound = true;
                        const topParticipants = topCutPlayers.map((tp, idx) => ({
                            id: tp.participantId,
                            seed: idx + 1,
                            dropped: false,
                        }));
                        const generatedTopCut = generateSingleEliminationRound(topParticipants, 1, []);
                        nextMatches = generatedTopCut.map(gm => ({
                            ...gm,
                            roundNumber: nextRoundNumber,
                        }));
                    }
                }
            } else if (tournament.status === "TOP_CUT") {
                if (currentRound.matches.length === 1) {
                    tournamentFinished = true;
                } else {
                    isTopCutRound = true;
                    nextMatches = generateSingleEliminationRound(
                        pairingPlayers,
                        nextRoundNumber,
                        allMatchesMapped
                    );
                    if (nextMatches.length === 0) tournamentFinished = true;
                }
            }
        }

        if (tournamentFinished) {
            await prisma.tournament.update({
                where: { id: tournamentId },
                data: { status: "FINISHED" },
            });

            revalidatePath("/tournaments");
            revalidatePath(`/tournaments/${tournamentId}`);

            return { success: true, finished: true };
        }

        // Créer la nouvelle ronde
        const newRound = await prisma.tournamentRound.create({
            data: {
                tournamentId,
                roundNumber: nextRoundNumber,
                isTopCut: isTopCutRound,
                status: "IN_PROGRESS",
            },
        });

        // Créer les matchs et les tables Duels
        for (const gm of nextMatches) {
            const p1 = tournament.participants.find(p => p.id === gm.p1Id);
            const p2 = gm.p2Id ? tournament.participants.find(p => p.id === gm.p2Id) : null;

            if (gm.isBye || !p2) {
                await prisma.tournamentMatch.create({
                    data: {
                        roundId: newRound.id,
                        tableNumber: gm.tableNumber,
                        player1Id: gm.p1Id,
                        player2Id: null,
                        isBye: true,
                        status: "FINISHED",
                        player1Score: 2,
                        player2Score: 0,
                        winnerId: gm.p1Id,
                        player1Deck: p1?.officialDecklist || null,
                        player1DeckColors: p1?.officialDeckColors || [],
                    },
                });
            } else {
                let duelsTableId: string | null = null;
                let duelsTableUrl: string | null = null;

                if (p1?.user.duelsUserId && p2.user.duelsUserId) {
                    const table = await createDuelsTableForMatch({
                        p1DuelsId: p1.user.duelsUserId,
                        p2DuelsId: p2.user.duelsUserId,
                        matchFormat: tournament.matchFormat.toLowerCase(),
                        p1Deck: tournament.allowDeckChanges ? undefined : (p1.officialDecklist || undefined),
                        p2Deck: tournament.allowDeckChanges ? undefined : (p2.officialDecklist || undefined),
                    });
                    if (table) {
                        duelsTableId = table.tableId;
                        duelsTableUrl = table.url;
                    }
                }

                await prisma.tournamentMatch.create({
                    data: {
                        roundId: newRound.id,
                        tableNumber: gm.tableNumber,
                        player1Id: gm.p1Id,
                        player2Id: gm.p2Id,
                        isBye: false,
                        status: "PENDING",
                        duelsTableId,
                        duelsTableUrl,
                        player1Deck: p1?.officialDecklist || null,
                        player2Deck: p2?.officialDecklist || null,
                        player1DeckColors: p1?.officialDeckColors || [],
                        player2DeckColors: p2?.officialDeckColors || [],
                    },
                });
            }
        }

        // Mettre à jour l'état du tournoi
        await prisma.tournament.update({
            where: { id: tournamentId },
            data: {
                currentRoundNumber: nextRoundNumber,
                status: isTopCutRound ? "TOP_CUT" : tournament.status,
            },
        });

        revalidatePath("/tournaments");
        revalidatePath(`/tournaments/${tournamentId}`);

        return { success: true, finished: false, roundNumber: nextRoundNumber };
    } catch (error) {
        console.error("[nextRoundAction] Erreur inattendue:", error);
        return { error: "Une erreur est survenue lors de la transition de ronde." };
    }
}

/**
 * Arbitrage manuel par le capitaine : modifie le score et le vainqueur d'un match.
 * Réservé aux administrateurs (ADMIN).
 */
export async function updateMatchScoreAction(
    matchId: string,
    p1Score: number,
    p2Score: number,
    winnerId: string
) {
    try {
        const auth = await getAuthenticatedUser();
        if ("error" in auth) return { error: auth.error };

        const match = await prisma.tournamentMatch.findUnique({
            where: { id: matchId },
            include: {
                round: {
                    include: {
                        tournament: true,
                    },
                },
            },
        });
        if (!match) return { error: "Match introuvable." };

        const isAdmin = await checkTeamAdmin(match.round.tournament.teamId, auth.userId);
        if (!isAdmin) {
            return { error: "Action réservée aux capitaines et administrateurs de l'équipe." };
        }

        if (winnerId !== match.player1Id && winnerId !== match.player2Id) {
            return { error: "Le vainqueur doit être l'un des deux joueurs du match." };
        }

        const safeP1Score = Math.max(0, Math.floor(p1Score));
        const safeP2Score = Math.max(0, Math.floor(p2Score));

        await prisma.tournamentMatch.update({
            where: { id: matchId },
            data: {
                player1Score: safeP1Score,
                player2Score: safeP2Score,
                winnerId,
                status: "FINISHED",
            },
        });

        revalidatePath("/tournaments");
        revalidatePath(`/tournaments/${match.round.tournamentId}`);

        return { success: true };
    } catch (error) {
        console.error("[updateMatchScoreAction] Erreur inattendue:", error);
        return { error: "Une erreur est survenue lors de la mise à jour du score." };
    }
}

/**
 * Interroge l'API Duels.ink pour actualiser l'état d'un match lié à une table privée.
 */
export async function syncMatchFromDuelsAction(matchId: string) {
    try {
        const auth = await getAuthenticatedUser();
        if ("error" in auth) return { error: auth.error };

        const match = await prisma.tournamentMatch.findUnique({
            where: { id: matchId },
            include: {
                round: { include: { tournament: true } },
                player1: { include: { user: true } },
                player2: { include: { user: true } },
            },
        });
        if (!match) return { error: "Match introuvable." };

        const isMember = await prisma.teamMember.findUnique({
            where: {
                userId_teamId: {
                    userId: auth.userId,
                    teamId: match.round.tournament.teamId,
                },
            },
        });
        if (!isMember) {
            return { error: "Vous n'avez pas l'autorisation d'accéder à ce tournoi." };
        }

        if (!match.duelsTableId) {
            return { error: "Aucune table Duels.ink associée à ce match." };
        }

        const result = await checkDuelsTableStatus(match.duelsTableId);
        if (!result) {
            return { error: "Impossible de joindre l'API Duels.ink pour ce match." };
        }

        let winnerId = match.winnerId;
        let p1Score = match.player1Score;
        let p2Score = match.player2Score;
        let status: MatchStatus = match.status;

        if (result.finished) {
            status = "FINISHED";
            if (result.winnerDuelsId) {
                if (match.player1.user?.duelsUserId === result.winnerDuelsId) {
                    winnerId = match.player1Id;
                    p1Score = Math.max(p1Score, match.round.tournament.matchFormat === "BO1" ? 1 : 2);
                } else if (match.player2?.user?.duelsUserId === result.winnerDuelsId) {
                    winnerId = match.player2Id;
                    p2Score = Math.max(p2Score, match.round.tournament.matchFormat === "BO1" ? 1 : 2);
                }
            }
        } else if (match.status === "PENDING" && result.status !== "pending") {
            status = "IN_PROGRESS";
        }

        await prisma.tournamentMatch.update({
            where: { id: matchId },
            data: {
                status,
                winnerId,
                player1Score: p1Score,
                player2Score: p2Score,
            },
        });

        revalidatePath("/tournaments");
        revalidatePath(`/tournaments/${match.round.tournamentId}`);

        return { success: true, finished: result.finished, status: result.status };
    } catch (error) {
        console.error("[syncMatchFromDuelsAction] Erreur inattendue:", error);
        return { error: "Une erreur est survenue lors de la synchronisation avec Duels.ink." };
    }
}

/**
 * Enregistre ou met à jour la decklist officielle d'un participant.
 */
export async function registerDecklistAction(
    tournamentId: string,
    decklist: string,
    deckColors: string[] = []
) {
    try {
        const auth = await getAuthenticatedUser();
        if ("error" in auth) return { error: auth.error };

        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
        });
        if (!tournament) return { error: "Tournoi introuvable." };

        const participant = await prisma.tournamentParticipant.findUnique({
            where: {
                tournamentId_userId: {
                    tournamentId,
                    userId: auth.userId,
                },
            },
        });
        if (!participant) return { error: "Vous n'êtes pas inscrit à ce tournoi." };

        if (!tournament.allowDeckChanges && tournament.status !== "REGISTRATION") {
            return {
                error: "La modification de decklist est verrouillée car le tournoi a déjà commencé.",
            };
        }

        await prisma.tournamentParticipant.update({
            where: { id: participant.id },
            data: {
                officialDecklist: decklist.trim() || null,
                officialDeckColors: deckColors,
            },
        });

        revalidatePath("/tournaments");
        revalidatePath(`/tournaments/${tournamentId}`);

        return { success: true };
    } catch (error) {
        console.error("[registerDecklistAction] Erreur inattendue:", error);
        return { error: "Une erreur est survenue lors de l'enregistrement de la decklist." };
    }
}
