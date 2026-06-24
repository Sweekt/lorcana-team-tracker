import GameRow from "./GameRow";

export default function HistoryTable({ games }: { games: any[] }) {
    if (games.length === 0) {
        return (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center text-slate-500">
                Aucun historique disponible pour ce format.
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                    <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Résultat</th>
                        <th className="py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Joueur</th>
                        <th className="py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">A commencé</th>
                        <th className="py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Matchup</th>
                        <th className="py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider text-right">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {games.map((game) => (
                        <GameRow key={game.id} game={game} />
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}