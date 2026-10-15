import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { computeStandings } from "@/lib/tournament/standings";
import { computeTournamentStats } from "@/lib/tournament/stats";
import TournamentDetailClient from "./TournamentDetailClient";
import { TournamentDetailData } from "./types";

interface TournamentDetailPageProps {
    params: Promise<{ id: string }>;
}

export default async function TournamentDetailPage({ params }: TournamentDetailPageProps) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect("/");
    }

    const { id } = await params;
    if (!id) {
        notFound();
    }

    // Récupération complète du tournoi avec relations
    const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: {
            team: {
                select: {
                    id: true,
                    name: true,
                },
            },
            createdBy: {
                select: {
                    id: true,
                    name: true,
                },
            },
            participants: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            image: true,
                            duelsUserId: true,
                            duelsUsername: true,
                        },
                    },
                },
                orderBy: [
                    { dropped: "asc" },
                    { seed: "asc" },
                    { joinedAt: "asc" },
                ],
            },
            rounds: {
                orderBy: { roundNumber: "asc" },
                include: {
                    matches: {
                        orderBy: { tableNumber: "asc" },
                        include: {
                            player1: {
                                include: {
                                    user: {
                                        select: {
                                            id: true,
                                            name: true,
                                            image: true,
                                            duelsUserId: true,
                                            duelsUsername: true,
                                        },
                                    },
                                },
                            },
                            player2: {
                                include: {
                                    user: {
                                        select: {
                                            id: true,
                                            name: true,
                                            image: true,
                                            duelsUserId: true,
                                            duelsUsername: true,
                                        },
                                    },
                                },
                            },
                            winner: {
                                select: {
                                    id: true,
                                    userId: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    if (!tournament) {
        notFound();
    }

    // Vérification de l'appartenance à l'équipe
    const member = await prisma.teamMember.findUnique({
        where: {
            userId_teamId: {
                userId: session.user.id,
                teamId: tournament.teamId,
            },
        },
    });

    if (!member) {
        redirect("/tournaments");
    }

    const isAdmin = member.role === "ADMIN";

    // Vérification de la connexion Duels.ink de l'utilisateur courant
    const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            duelsUserId: true,
            duelsAccessToken: true,
        },
    });
    const hasDuelsAccount = Boolean(currentUser?.duelsUserId || currentUser?.duelsAccessToken);

    // Extraction et aplatissement des matchs pour les calculs statistiques et de classement
    const allMatches = tournament.rounds.flatMap((r) => r.matches);

    // Calcul du classement en direct
    const standingsParticipants = tournament.participants.map((p) => ({
        id: p.id,
        name: p.user?.name || undefined,
        dropped: p.dropped,
    }));

    const standingsMatches = allMatches.map((m) => ({
        id: m.id,
        roundNumber: tournament.rounds.find((r) => r.id === m.roundId)?.roundNumber,
        p1Id: m.player1Id,
        p2Id: m.player2Id,
        p1Score: m.player1Score,
        p2Score: m.player2Score,
        winnerId: m.winnerId,
        isBye: m.isBye,
        isForfeit: m.isForfeit,
        status: m.status,
    }));

    const standings = computeStandings(standingsParticipants, standingsMatches);

    // Calcul des statistiques du tournoi (winrate des encres, avantage toss/went first)
    const stats = computeTournamentStats(allMatches);

    // Normalisation typée des données pour le composant client
    const serializedTournament: TournamentDetailData = {
        ...tournament,
        createdAt: tournament.createdAt.toISOString(),
        participants: tournament.participants.map((p) => ({
            ...p,
            joinedAt: p.joinedAt.toISOString(),
        })),
        rounds: tournament.rounds.map((r) => ({
            ...r,
            createdAt: r.createdAt.toISOString(),
            matches: r.matches.map((m) => ({
                ...m,
                player1: {
                    ...m.player1,
                    joinedAt: m.player1.joinedAt.toISOString(),
                },
                player2: m.player2
                    ? {
                          ...m.player2,
                          joinedAt: m.player2.joinedAt.toISOString(),
                      }
                    : null,
            })),
        })),
    };

    return (
        <TournamentDetailClient
            tournament={serializedTournament}
            standings={standings}
            stats={stats}
            currentUserId={session.user.id}
            isAdmin={isAdmin}
            hasDuelsAccount={hasDuelsAccount}
        />
    );
}
