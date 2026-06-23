import prisma from "@/lib/prisma";
import SyncButton from "@/components/SyncButton";

// Fonction pour récupérer et trier le classement
async function getLeaderboard() {
  const players = await prisma.player.findMany({
    select: {
      name: true,
      _count: {
        select: { games: true }, // Compte le nombre de parties totales
      },
      games: {
        orderBy: { startedAt: "desc" }, // Trie du plus récent au plus ancien
        take: 1, // Ne prend que la dernière partie
        select: { mmrAfter: true }, // Récupère uniquement le MMR de cette partie
      },
    },
  });

  // On formate les données pour l'affichage
  const leaderboard = players.map((p) => {
    // Si le joueur n'a pas de partie, on lui donne un MMR de base (par ex 1000, ou 0)
    const currentMmr = p.games[0]?.mmrAfter ?? 1000;

    return {
      name: p.name,
      gamesPlayed: p._count.games,
      mmr: currentMmr,
    };
  });

  // On trie le tableau par MMR décroissant
  return leaderboard.sort((a, b) => b.mmr - a.mmr);
}

export default async function Home() {
  const leaderboard = await getLeaderboard();

  return (
      <main className="max-w-4xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">🏆 Leaderboard Team</h1>
          <SyncButton />
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="py-4 px-6 font-semibold text-slate-600">Rang</th>
              <th className="py-4 px-6 font-semibold text-slate-600">Joueur</th>
              <th className="py-4 px-6 font-semibold text-slate-600">Parties Jouées</th>
              <th className="py-4 px-6 font-semibold text-slate-600 text-right">MMR Actuel</th>
            </tr>
            </thead>
            <tbody>
            {leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    Aucun joueur en base de données. N'oublie pas d'en ajouter !
                  </td>
                </tr>
            ) : (
                leaderboard.map((player, index) => (
                    <tr
                        key={player.name}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-4 px-6">
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-800">
                        {player.name}
                      </td>
                      <td className="py-4 px-6 text-slate-600">
                        {player.gamesPlayed}
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-blue-600">
                        {player.mmr}
                      </td>
                    </tr>
                ))
            )}
            </tbody>
          </table>
        </div>
      </main>
  );
}