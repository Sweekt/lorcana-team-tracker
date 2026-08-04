import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";

export async function getCurrentTeamId() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return null;
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            activeTeamId: true,
            teams: {
                take: 1,
                select: { teamId: true }
            }
        }
    });

    if (!user) {
        return null;
    }

    return user.activeTeamId || user.teams[0]?.teamId || null;
}