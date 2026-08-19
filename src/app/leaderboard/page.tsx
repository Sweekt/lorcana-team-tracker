import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Leaderboard from "@/components/Leaderboard";
import HistoryTable from "@/components/HistoryTable";
import QueueSelector from "@/components/QueueSelector";
import SyncButton from "@/components/SyncButton";
import StatsView from "@/components/StatsView";
import { getCurrentTeamId } from "@/lib/current-team";
import Link from "next/link";
import SettingsIcon from "@/assets/ic_settings.svg";
import HistoryIcon from "@/assets/ic_history.svg";
import StatIcon from "@/assets/ic_leaderboard.svg";

async function getAvailableQueues(teamId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { activeQueues: true }
  });

  const queues = team?.activeQueues || [];
  return queues.sort((a, b) => a.localeCompare(b));
}

async function getLeaderboard(queueId: string, teamId: string) {
  const users = await prisma.user.findMany({
    where: {
      teams: { some: { teamId } }
    },
    select: {
      name: true,
      image: true,
      _count: { select: { games: { where: { queueId } } } },
      games: { where: { queueId }, orderBy: { startedAt: "desc" }, take: 1, select: { mmrAfter: true } },
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
    where: {
      queueId: queueId,
      user: {
        teams: {
          some: { teamId: teamId }
        }
      }
    },
    orderBy: {startedAt: "desc"},
    take: 20,
    include: {user: {select: {name: true, image: true}}}
  });
}

export default async function LeaderboardPage(props: { searchParams: Promise<{ queue?: string; tab?: string }> }) {
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

  const defaultQueue = process.env.NEXT_PUBLIC_DEFAULT_SEASON_QUEUE || "Core BO1 - Set 13";
  const currentQueue = searchParams.queue || (queues.includes(defaultQueue) ? defaultQueue : queues[0] || "");

  const leaderboard = currentQueue ? await getLeaderboard(currentQueue, teamId) : [];
  const recentGames = currentQueue ? await getRecentHistory(currentQueue, teamId) : [];
  const currentTab = searchParams.tab || "history";

  let tabContent;

  if (currentTab === "stats") {
    const allStatsGames = await prisma.game.findMany({
      where: {
        queueId: currentQueue,
        user: { teams: { some: { teamId: teamId } } }
      },
      select: { result: true, wentFirst: true, myDeckColors: true, oppDeckColors: true, user: { select: { name: true } } }
    });
    tabContent = <StatsView games={allStatsGames} teamView={true}/>;
  } else {
    tabContent = (
        <HistoryTable games={recentGames} />
    );
  }

  return (
      <div className="flex-1 flex flex-col justify-center bg-slate-950 pb-4">
        <main className="flex-1 w-full max-w-4xl lg:max-w-7xl mx-auto p-8 space-y-8">

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

          {/* Onglets compacts */}
          <div className="inline-flex bg-slate-900 p-1 rounded-lg border border-slate-800">
            <Link
                href={`/leaderboard?queue=${currentQueue}&tab=history`}
                className={`inline-flex items-center justify-center gap-2 px-6 py-2 rounded-md font-semibold text-sm transition-all ${
                    currentTab !== "stats" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
                }`}
            >
              <HistoryIcon className="h-4 w-4" />
              Historique
            </Link>
            <Link
                href={`/leaderboard?queue=${currentQueue}&tab=stats`}
                className={`inline-flex items-center justify-center gap-2 px-6 py-2 rounded-md font-semibold text-sm transition-all ${
                    currentTab === "stats" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
                }`}
            >
              <StatIcon className="h-4 w-4" />
              Statistiques
            </Link>
          </div>

          {/* Content */}
          <section className="transition-all">
            {tabContent}
          </section>

        </main>
      </div>
  );
}