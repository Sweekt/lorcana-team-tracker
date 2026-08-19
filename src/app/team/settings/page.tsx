import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getCurrentTeamId } from "@/lib/current-team";
import TeamSettingsForm from "./TeamSettingsForm";

export default async function TeamSettingsPage() {
    const session = await getServerSession(authOptions);
    const teamId = await getCurrentTeamId();

    if (!session?.user?.id || !teamId) redirect("/");

    const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
            members: {
                include: { user: { select: { id: true, name: true, image: true, lorcanaApiKey: true } } },
                orderBy: { role: "asc" }
            }
        }
    });

    const currentMember = team?.members.find(m => m.userId === session.user.id);

    if (currentMember?.role !== "ADMIN" || !team) {
        redirect("/");
    }

    const distinctQueues = await prisma.game.findMany({
        where: {
            teamId: teamId,
            queueId: { not: null }
        },
        select: { queueId: true },
        distinct: ['queueId']
    });

    const availableQueues = distinctQueues.map(q => ({
        id: q.queueId as string,
        label: q.queueId as string // Le label et l'ID sont identiques puisque c'est le nom de la saison
    }));

    const inviteLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/invite/${team.inviteToken}`;

    return (
        <div className="min-h-screen bg-slate-950 pb-4 p-8">
            <main className="max-w-3xl mx-auto space-y-8 mt-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-200">Gestion de l'équipe : {team.name}</h1>
                    <p className="text-slate-500 text-sm mt-1">Espace réservé au capitaine.</p>
                </div>

                <TeamSettingsForm
                    team={team}
                    availableQueues={availableQueues}
                    inviteLink={inviteLink}
                    currentUserId={session.user.id}
                />
            </main>
        </div>
    );
}