"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createTeam(formData: FormData, userId: string) {
    const name = formData.get("name") as string;

    if (!name || name.trim() === "") {
        return { error: "Le nom de l'équipe est requis." };
    }

    try {
        const defaultQueue = process.env.NEXT_PUBLIC_DEFAULT_SEASON_QUEUE || "Core BO1 - Set 13";

        const team = await prisma.team.create({
            data: {
                name: name.trim(),
                activeQueues: [defaultQueue],
                members: {
                    create: {
                        userId: userId,
                        role: "ADMIN",
                    },
                },
            },
        });

        revalidatePath("/");

        return { success: true, teamId: team.id };
    } catch (error) {
        console.error("Erreur création team:", error);
        return { error: "Une erreur est survenue lors de la création de l'équipe." };
    }
}

export async function joinTeam(token: string, userId: string) {
    if (!token || token.trim() === "") {
        return { error: "Le code d'invitation est requis." };
    }

    try {
        const team = await prisma.team.findUnique({
            where: { inviteToken: token.trim() }
        });

        if (!team) {
            return { error: "Code d'invitation invalide ou expiré." };
        }

        const existingMember = await prisma.teamMember.findUnique({
            where: {
                userId_teamId: {
                    userId: userId,
                    teamId: team.id
                }
            }
        });

        if (existingMember) {
            return { error: "Vous faites déjà partie de cette équipe." };
        }

        await prisma.teamMember.create({
            data: {
                userId: userId,
                teamId: team.id,
                role: "MEMBER",
            }
        });

        revalidatePath("/");
        return { success: true, teamId: team.id };
    } catch (error) {
        console.error("Erreur pour rejoindre la team:", error);
        return { error: "Une erreur est survenue lors de l'ajout à l'équipe." };
    }
}

async function verifyAdmin(teamId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return false;

    const membership = await prisma.teamMember.findUnique({
        where: { userId_teamId: { userId: session.user.id, teamId } }
    });

    return membership?.role === "ADMIN";
}

export async function kickMember(targetUserId: string, teamId: string) {
    const isAdmin = await verifyAdmin(teamId);
    if (!isAdmin) return { error: "Action non autorisée. Vous n'êtes pas capitaine." };

    try {
        await prisma.teamMember.delete({
            where: { userId_teamId: { userId: targetUserId, teamId } }
        });
        revalidatePath("/team/settings");
        return { success: true };
    } catch (error) {
        return { error: "Erreur lors de l'expulsion du joueur." };
    }
}

export async function updateTeamQueues(teamId: string, formData: FormData) {
    const isAdmin = await verifyAdmin(teamId);
    if (!isAdmin) return { error: "Action non autorisée." };

    const selectedQueues = formData.getAll("queues") as string[];

    try {
        await prisma.team.update({
            where: { id: teamId },
            data: { activeQueues: selectedQueues }
        });
        revalidatePath("/team/settings");
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("ERREUR PRISMA UPDATE QUEUES:", error);
        return { error: "Erreur lors de la mise à jour des formats." };
    }
}

export async function updateTeamLogo(teamId: string, formData: FormData) {
    const isAdmin = await verifyAdmin(teamId);
    if (!isAdmin) return { error: "Action non autorisée." };

    const logoBase64 = formData.get("logo") as string;

    try {
        await prisma.team.update({
            where: { id: teamId },
            data: { logoUrl: logoBase64 }
        });

        revalidatePath("/");
        revalidatePath("/team/settings");

        return { success: true };
    } catch (error) {
        console.error("Erreur logo:", error);
        return { error: "Erreur lors de la mise à jour du logo." };
    }
}

export async function switchTeamAction(userId: string, targetTeamId: string) {
    if (!userId || !targetTeamId) return;

    await prisma.user.update({
        where: { id: userId },
        data: { activeTeamId: targetTeamId }
    });
}

export async function leaveTeamAction(userId: string, teamId: string) {
    try {
        // 1. On récupère le rôle de l'utilisateur qui veut partir
        const membership = await prisma.teamMember.findUnique({
            where: { userId_teamId: { userId, teamId } }
        });

        if (!membership) {
            return { error: "Vous ne faites pas partie de cette équipe." };
        }

        // 2. LA SÉCURITÉ : S'il est admin, on compte les autres admins
        if (membership.role === 'ADMIN') {
            const adminCount = await prisma.teamMember.count({
                where: {
                    teamId: teamId,
                    role: 'ADMIN'
                }
            });

            // S'il est le seul admin, on bloque l'action
            if (adminCount <= 1) {
                return {
                    error: "Impossible de quitter : vous êtes le dernier administrateur. Veuillez nommer un autre membre administrateur ou supprimer l'équipe."
                };
            }
        }

        // 3. S'il n'est pas le dernier admin, on procède à la suppression
        await prisma.teamMember.delete({
            where: { userId_teamId: { userId, teamId } }
        });

        // 4. Mise à jour de l'équipe active (comme vu précédemment)
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { activeTeamId: true }
        });

        if (user?.activeTeamId === teamId) {
            const remainingTeam = await prisma.teamMember.findFirst({
                where: { userId }
            });

            await prisma.user.update({
                where: { id: userId },
                data: { activeTeamId: remainingTeam ? remainingTeam.teamId : null }
            });
        }

        revalidatePath('/', 'layout');
        return { success: true };

    } catch (error) {
        console.error(error);
        return { error: "Une erreur est survenue lors de la tentative de départ de l'équipe." };
    }
}

export async function transferCaptaincy(targetUserId: string, teamId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { error: "Non autorisé" };

    const currentUserId = session.user.id;

    // 1. Vérifier que l'utilisateur actuel est bien l'ADMIN de l'équipe
    const currentMembership = await prisma.teamMember.findUnique({
        where: { userId_teamId: { userId: currentUserId, teamId } }
    });

    if (currentMembership?.role !== 'ADMIN') {
        return { error: "Seul un administrateur peut transférer le capitanat." };
    }

    try {
        // 2. Transaction pour garantir l'intégrité de la base de données
        await prisma.$transaction([
            // Rétrograder le capitaine actuel
            prisma.teamMember.update({
                where: { userId_teamId: { userId: currentUserId, teamId } },
                data: { role: 'MEMBER' }
            }),
            // Promouvoir le nouveau capitaine
            prisma.teamMember.update({
                where: { userId_teamId: { userId: targetUserId, teamId } },
                data: { role: 'ADMIN' }
            })
        ]);

        // Rafraîchit la page des paramètres (ajuste le chemin selon ton routing)
        revalidatePath('/settings');
        return { success: true };
    } catch (error) {
        console.error("Erreur lors du transfert :", error);
        return { error: "Une erreur est survenue lors du transfert de capitanat." };
    }
}