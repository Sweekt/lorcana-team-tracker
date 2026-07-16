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
        const team = await prisma.team.create({
            data: {
                name: name.trim(),
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