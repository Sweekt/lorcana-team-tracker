export default function PlayerStatsView({ games }: { games: any[] }) {
    if (games.length === 0) {
        return <div className="bg-slate-900 p-12 rounded-2xl border border-slate-800 text-center text-slate-500">Aucune donnée pour calculer les statistiques.</div>;
    }

    const total = games.length;
    const wins = games.filter(g => g.result === "win").length;
    const globalWr = Math.round((wins / total) * 100);

    // Stats Play vs Draw (Qui a commencé)
    const firstGames = games.filter(g => g.wentFirst === true);
    const firstWr = firstGames.length ? Math.round((firstGames.filter(g => g.result === "win").length / firstGames.length) * 100) : 0;

    const drawGames = games.filter(g => g.wentFirst === false);
    const drawWr = drawGames.length ? Math.round((drawGames.filter(g => g.result === "win").length / drawGames.length) * 100) : 0;

    // Stats par Archétype joué
    const decksMap = games.reduce((acc: any, g) => {
        const color = g.myDeckColors || "Inconnu";
        if (!acc[color]) acc[color] = { total: 0, wins: 0 };
        acc[color].total += 1;
        if (g.result === "win") acc[color].wins += 1;
        return acc;
    }, {});

    const deckStats = Object.entries(decksMap)
        .map(([color, d]: any) => ({ color, total: d.total, wr: Math.round((d.wins / d.total) * 100) }))
        .sort((a, b) => b.total - a.total);

    return (
        <div className="space-y-6">

            {/* Cartes du haut */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Winrate Global</span>
                    <div className="text-3xl font-extrabold text-indigo-400 mt-2">{globalWr}%</div>
                    <span className="text-xs text-slate-500 mt-1 block">Sur {total} parties jouées</span>
                </div>

                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">En commençant (Play)</span>
                    <div className="text-3xl font-extrabold text-emerald-400 mt-2">{firstWr}%</div>
                    <span className="text-xs text-slate-500 mt-1 block">{firstGames.length} parties</span>
                </div>

                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">En second (Draw)</span>
                    <div className="text-3xl font-extrabold text-amber-400 mt-2">{drawWr}%</div>
                    <span className="text-xs text-slate-500 mt-1 block">{drawGames.length} parties</span>
                </div>
            </div>

            {/* Tableau des decks */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
                <h3 className="text-lg font-bold text-slate-200 mb-4">🎨 Performances par Deck joué</h3>
                <div className="space-y-3">
                    {deckStats.map((d) => (
                        <div key={d.color} className="flex justify-between items-center bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/60">
                            <span className="font-semibold text-slate-300">{d.color}</span>
                            <div className="flex items-center gap-6">
                                <span className="text-sm text-slate-400">{d.total} games</span>
                                <span className={`font-bold text-sm px-2.5 py-1 rounded bg-slate-900 border ${d.wr >= 50 ? 'text-emerald-400 border-emerald-500/30' : 'text-red-400 border-red-500/30'}`}>
                  {d.wr}% WR
                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}