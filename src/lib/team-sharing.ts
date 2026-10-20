import prisma from "@/lib/prisma";

export function getTeamShareWhereClause(teamId: string) {
    return {
        teams: {
            some: {
                teamId,
                shareData: true,
            }
        }
    };
}

export async function isPlayerSharingWithTeam(
    userId: string,
    teamId: string,
    prismaClient: typeof prisma = prisma
): Promise<boolean> {
    const member = await prismaClient.teamMember.findUnique({
        where: {
            userId_teamId: { userId, teamId }
        },
        select: { shareData: true }
    });
    return member?.shareData ?? false;
}

export function canViewPlayerStats({
    sessionUserId,
    targetUserId,
    shareData
}: {
    sessionUserId: string | null | undefined;
    targetUserId: string;
    shareData: boolean | null | undefined;
}): boolean {
    if (sessionUserId && sessionUserId === targetUserId) {
        return true;
    }
    return Boolean(shareData);
}

export function validateTeamSharingPermission(
    sessionUserId: string | null | undefined,
    membershipUserId: string | null | undefined
): { allowed: boolean; error?: string } {
    if (!sessionUserId) {
        return { allowed: false, error: "Non autorisé" };
    }
    if (!membershipUserId || sessionUserId !== membershipUserId) {
        return { allowed: false, error: "Vous n'êtes pas membre de cette équipe." };
    }
    return { allowed: true };
}
