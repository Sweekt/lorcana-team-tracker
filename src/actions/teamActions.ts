'use server'

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

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