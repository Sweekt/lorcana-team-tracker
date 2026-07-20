import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Leaderboard from "@/components/Leaderboard";
import HistoryTable from "@/components/HistoryTable";
import QueueSelector from "@/components/QueueSelector";
import SyncButton from "@/components/SyncButton";
import { getCurrentTeamId } from "@/lib/current-team";
import Link from "next/link";
import SettingsIcon from "@/assets/ic_settings.svg"
import HistoryIcon from "@/assets/ic_history.svg"

async function getAvailableQueues(teamId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { activeQueues: true }
  });

  return team?.activeQueues || [];
}

async function getLeaderboard(queueId: string, teamId: string) {
  const users = await prisma.user.findMany({
    where: {
      teams: { some: { teamId } }
    },
    select: {
      name: true,
      image: true,
      _count: { select: { games: { where: { teamId, queueId } } } },
      games: { where: { teamId, queueId }, orderBy: { startedAt: "desc" }, take: 1, select: { mmrAfter: true } },
    },
  });

  const leaderboard = users
      .filter((u) => u._count.games > 0)
      .map((u) => ({
        name: u.name || "Joueur Inconnu",
        avatarUrl: u.image,
        gamesPlayed: u._count.games,
        mmr: u.games[0]?.mmrAfter ?? 1000
      }));

  return leaderboard.sort((a, b) => b.mmr - a.mmr);
}

async function getRecentHistory(queueId: string, teamId: string) {
  return prisma.game.findMany({
    where: {queueId, teamId},
    orderBy: {startedAt: "desc"},
    take: 20,
    include: {user: {select: {name: true, image: true}}}
  });
}

export default async function LeaderboardPage(props: { searchParams: Promise<{ queue?: string }> }) {
  const session = await getServerSession(authOptions);

  if (session?.user?.email) {
    const userWithTeams = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { teams: true }
    });

    if (userWithTeams && userWithTeams.teams.length === 0) {
      redirect("/onboarding");
    }
  }

  const teamId = await getCurrentTeamId();
  if (!teamId) {
    redirect("/onboarding");
  }

  const currentMember = await prisma.teamMember.findUnique({
    where: { userId_teamId: { userId: session?.user?.id as string, teamId: teamId } }
  });
  const isAdmin = currentMember?.role === "ADMIN";

  const searchParams = await props.searchParams;
  const queues = await getAvailableQueues(teamId);

  const currentQueue = searchParams.queue || (queues.includes("core-bo1") ? "core-bo1" : queues[0] || "");

  const leaderboard = currentQueue ? await getLeaderboard(currentQueue, teamId) : [];
  const recentGames = currentQueue ? await getRecentHistory(currentQueue, teamId) : [];

  return (
      <div className="min-h-screen bg-slate-950 pb-4">
        <main className="max-w-4xl lg:max-w-7xl mx-auto p-8 space-y-8">

          {/* Barre d'outils */}
          <section className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="w-full sm:w-auto flex gap-3">
              <SyncButton />
              {isAdmin && (
                  <Link href="/team/settings" className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm text-slate-300 transition-colors border border-slate-700">
                    <SettingsIcon className="w-4 h-4" />Gérer l'équipe
                  </Link>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <span className="font-semibold text-slate-400 text-xs uppercase tracking-wider">Format</span>
              {queues.length > 0 ? (
                  <QueueSelector queues={queues} currentQueue={currentQueue} />
              ) : (
                  <span className="text-slate-500 italic text-xs">Aucun format actif</span>
              )}
            </div>
          </section>

          <Leaderboard leaderboard={leaderboard} />

          {/* Historique */}
          <section>
            <div className="mb-4">
              <div className="flex flex-row items-center gap-2">
                <HistoryIcon className="w-5 h-5" />
                <span className="text-xl font-bold text-slate-200">Historique</span>
              </div>
              <p className="text-slate-500 text-sm">Les 20 dernières parties de l'équipe dans ce format.</p>
            </div>
            <HistoryTable games={recentGames} />
          </section>

        </main>
      </div>
  );
}