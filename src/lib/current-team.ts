import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";

export async function getCurrentTeamId() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return null;
    }

    const userTeam = await prisma.teamMember.findFirst({
        where: { userId: session.user.id },
        select: { teamId: true }
    });

    return userTeam?.teamId || null;
}