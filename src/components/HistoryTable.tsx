import GameRow from "./GameRow";

export default function HistoryTable({ games }: { games: any[] }) {
    if (games.length === 0) {
        return (
            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 text-center text-slate-500">
                Aucun historique disponible pour ce format.
            </div>
        );
    }

    return (
        <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                    <thead>
                    <tr className="bg-slate-950/50 border-b border-slate-800">
                        <th className="py-3 px-4 font-semibold text-slate-400 text-xs uppercase tracking-wider w-24">Résultat</th>
                        <th className="py-3 px-4 font-semibold text-slate-400 text-xs uppercase tracking-wider text-center">OTP / OTD</th>
                        <th className="py-3 px-4 font-semibold text-slate-400 text-xs uppercase tracking-wider w-36">Date</th>
                        <th className="py-3 px-4 font-semibold text-slate-400 text-xs uppercase tracking-wider">Joueur</th>
                        <th className="py-3 px-4 font-semibold text-slate-400 text-xs uppercase tracking-wider text-center">Matchup</th>
                        <th className="py-3 px-4 font-semibold text-slate-400 text-xs uppercase tracking-wider">Adversaire</th>
                        <th className="py-3 px-4 font-semibold text-slate-400 text-xs uppercase tracking-wider text-right">Actions</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                    {games.map((game) => (
                        <GameRow key={game.id} game={game} />
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}