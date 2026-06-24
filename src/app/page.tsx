import prisma from "@/lib/prisma";
import SyncButton from "@/components/SyncButton";
import QueueSelector from "@/components/QueueSelector";
import Link from "next/link";
import HistoryTable from "@/components/HistoryTable";

// 1. Récupère dynamiquement toutes les queues (actives uniquement)
async function getAvailableQueues() {
  const distinct = await prisma.game.findMany({
    where: { queueId: { not: null } },
    select: { queueId: true },
    distinct: ["queueId"],
  });

  const configs = await prisma.queueConfig.findMany({ where: { isActive: false } });
  const disabledQueues = new Set(configs.map(c => c.id));

  return distinct
      .map((g) => g.queueId as string)
      .filter(queueId => !disabledQueues.has(queueId));
}

// 2. Récupère le classement filtré par queue
async function getLeaderboard(queueId: string) {
  const players = await prisma.player.findMany({
    select: {
      name: true,
      _count: {
        select: { games: { where: { queueId } } },
      },
      games: {
        where: { queueId },
        orderBy: { startedAt: "desc" },
        take: 1,
        select: { mmrAfter: true },
      },
    },
  });

  const leaderboard = players
      .filter((p) => p._count.games > 0)
      .map((p) => {
        const currentMmr = p.games[0]?.mmrAfter ?? 1000;
        return {
          name: p.name,
          gamesPlayed: p._count.games,
          mmr: currentMmr,
        };
      });

  return leaderboard.sort((a, b) => b.mmr - a.mmr);
}

async function getRecentHistory(queueId: string) {
  return await prisma.game.findMany({
    where: { queueId },
    orderBy: { startedAt: "desc" }, // Les plus récentes d'abord
    take: 20, // Limite à 20
    include: {
      player: { select: { name: true } } // On a besoin du nom du joueur !
    }
  });
}

// 3. Fonction pour styliser le Top 3
const getRankBadge = (index: number) => {
  switch (index) {
    case 0: return <span className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-600 font-bold border border-yellow-200 shadow-sm">1</span>;
    case 1: return <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 text-slate-600 font-bold border border-slate-300 shadow-sm">2</span>;
    case 2: return <span className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-amber-700 font-bold border border-orange-200 shadow-sm">3</span>;
    default: return <span className="flex items-center justify-center w-8 h-8 text-slate-400 font-medium">{index + 1}</span>;
  }
};

export default async function Home(props: { searchParams: Promise<{ queue?: string }> }) {
  const searchParams = await props.searchParams;
  const queues = await getAvailableQueues();

  const currentQueue = searchParams.queue || (queues.includes("core-bo1") ? "core-bo1" : queues[0] || "");

  const leaderboard = currentQueue ? await getLeaderboard(currentQueue) : [];
  // Appel de la nouvelle fonction
  const recentGames = currentQueue ? await getRecentHistory(currentQueue) : [];

  return (
      <div className="min-h-screen bg-slate-50/50 pb-20">
        <main className="max-w-4xl mx-auto p-8 space-y-12"> {/* J'ai passé l'espacement global de 8 à 12 */}

          {/* EN-TÊTE ET NAVIGATION (inchangé) */}
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-6">
            <div>
              <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600">
                Lorcana Team Tracker
              </h1>
              <p className="text-slate-500 text-sm mt-1">Suivez le classement et l'historique de l'équipe.</p>
            </div>
            <Link href="/admin" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
              ⚙️ Administration
            </Link>
          </header>

          {/* BARRE D'OUTILS (inchangée) */}
          <section className="bg-white p-4 sm:px-6 sm:py-4 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <span className="font-semibold text-slate-700 text-sm uppercase tracking-wider">Format</span>
              {queues.length > 0 ? (
                  <QueueSelector queues={queues} currentQueue={currentQueue} />
              ) : (
                  <span className="text-slate-400 italic text-sm">Aucun format actif</span>
              )}
            </div>
            <div className="w-full sm:w-auto"><SyncButton /></div>
          </section>

          {/* TABLEAU DES SCORES (inchangé) */}
          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-4">🏆 Classement Actuel</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
              {/* ... Reste du code du tableau de classement ... */}
              <table className="w-full text-left border-collapse min-w-[500px]">
                {/* Garde ton <thead> et ton <tbody> tel quel ici */}
                <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="py-4 px-6 font-semibold text-slate-500 text-xs uppercase tracking-wider w-20">Rang</th>
                  <th className="py-4 px-6 font-semibold text-slate-500 text-xs uppercase tracking-wider">Joueur</th>
                  <th className="py-4 px-6 font-semibold text-slate-500 text-xs uppercase tracking-wider text-center">Parties Jouées</th>
                  <th className="py-4 px-6 font-semibold text-slate-500 text-xs uppercase tracking-wider text-right">MMR Actuel</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {leaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-3xl">📉</span>
                          <p>Aucun joueur de l'équipe n'a joué dans ce format.</p>
                        </div>
                      </td>
                    </tr>
                ) : (
                    leaderboard.map((player, index) => (
                        <tr key={player.name} className="group hover:bg-indigo-50/30 transition-colors">
                          <td className="py-4 px-6">{getRankBadge(index)}</td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-inner ${
                                  index === 0 ? 'bg-gradient-to-br from-yellow-200 to-amber-100 text-yellow-700' :
                                      index === 1 ? 'bg-gradient-to-br from-slate-200 to-slate-100 text-slate-600' :
                                          index === 2 ? 'bg-gradient-to-br from-orange-200 to-orange-100 text-amber-800' :
                                              'bg-slate-100 text-slate-500'
                              }`}>
                                {player.name.charAt(0).toUpperCase()}
                              </div>
                              <span className={`font-semibold ${index < 3 ? 'text-slate-800' : 'text-slate-600'}`}>
                            {player.name}
                          </span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center text-slate-500 font-medium">{player.gamesPlayed}</td>
                          <td className="py-4 px-6 text-right">
                        <span className={`font-bold text-lg ${index === 0 ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600' : 'text-slate-700'}`}>
                          {player.mmr}
                        </span>
                          </td>
                        </tr>
                    ))
                )}
                </tbody>
              </table>
            </div>
          </section>

          {/* NOUVELLE SECTION : HISTORIQUE DES DERNIÈRES PARTIES */}
          <section>
            <div className="mb-4">
              <h2 className="text-xl font-bold text-slate-800">⚔️ Derniers Affrontements</h2>
              <p className="text-slate-500 text-sm">Les 20 dernières parties de l'équipe dans ce format.</p>
            </div>
            <HistoryTable games={recentGames} />
          </section>

        </main>
      </div>
  );
}