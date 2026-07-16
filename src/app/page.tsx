import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Leaderboard from "@/components/Leaderboard";
import HistoryTable from "@/components/HistoryTable";
import QueueSelector from "@/components/QueueSelector";
import SyncButton from "@/components/SyncButton";

async function getAvailableQueues() {
  const distinct = await prisma.game.findMany({
    where: { queueId: { not: null } },
    select: { queueId: true },
    distinct: ["queueId"],
  });
  const configs = await prisma.queueConfig.findMany({ where: { isActive: false } });
  const disabledQueues = new Set(configs.map(c => c.id));
  return distinct.map((g) => g.queueId as string).filter(queueId => !disabledQueues.has(queueId));
}

async function getLeaderboard(queueId: string) {
  const players = await prisma.player.findMany({
    select: {
      name: true,
      avatarUrl: true,
      _count: { select: { games: { where: { queueId } } } },
      games: { where: { queueId }, orderBy: { startedAt: "desc" }, take: 1, select: { mmrAfter: true } },
    },
  });

  const leaderboard = players
      .filter((p) => p._count.games > 0)
      .map((p) => ({
        name: p.name,
        avatarUrl: p.avatarUrl,
        gamesPlayed: p._count.games,
        mmr: p.games[0]?.mmrAfter ?? 1000
      }));

  return leaderboard.sort((a, b) => b.mmr - a.mmr);
}

async function getRecentHistory(queueId: string) {
  return await prisma.game.findMany({
    where: { queueId },
    orderBy: { startedAt: "desc" },
    take: 20,
    include: { player: { select: { name: true } } }
  });
}

// Composant Principal
export default async function Home(props: { searchParams: Promise<{ queue?: string }> }) {
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
  const searchParams = await props.searchParams;
  const queues = await getAvailableQueues();

  const currentQueue = searchParams.queue || (queues.includes("core-bo1") ? "core-bo1" : queues[0] || "");

  const leaderboard = currentQueue ? await getLeaderboard(currentQueue) : [];
  const recentGames = currentQueue ? await getRecentHistory(currentQueue) : [];

  return (
      <div className="min-h-screen bg-slate-950 pb-20">
        <main className="max-w-4xl lg:max-w-7xl mx-auto p-8 space-y-12">

          {/* Barre d'outils */}
          <section className="bg-slate-900 p-4 sm:px-6 sm:py-4 rounded-2xl shadow-sm border border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <span className="font-semibold text-slate-400 text-sm uppercase tracking-wider">Format</span>
              {queues.length > 0 ? (
                  <QueueSelector queues={queues} currentQueue={currentQueue} />
              ) : (
                  <span className="text-slate-500 italic text-sm">Aucun format actif</span>
              )}
            </div>
            <div className="w-full sm:w-auto"><SyncButton /></div>
          </section>

          <Leaderboard leaderboard={leaderboard} />

          {/* Historique */}
          <section>
            <div className="mb-4">
              <h2 className="text-xl font-bold text-slate-200">Historique</h2>
              <p className="text-slate-500 text-sm">Les 20 dernières parties de l'équipe dans ce format.</p>
            </div>
            <HistoryTable games={recentGames} />
          </section>

        </main>
      </div>
  );
}