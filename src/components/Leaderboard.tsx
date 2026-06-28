import Link from "next/link";

const getRankBadge = (index: number) => {
    switch (index) {
        case 0: return <span className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-500 font-bold border border-yellow-500/30 shadow-sm">1</span>;
        case 1: return <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-400/20 text-slate-300 font-bold border border-slate-400/30 shadow-sm">2</span>;
        case 2: return <span className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30 shadow-sm">3</span>;
        default: return <span className="flex items-center justify-center w-8 h-8 text-slate-500 font-medium">{index + 1}</span>;
    }
};

export default function Leaderboard({ leaderboard }: { leaderboard: any[] }) {
    return (
        <section>
            <h2 className="text-xl font-bold text-slate-200 mb-4">🏆 Classement Actuel</h2>
            <div className="bg-slate-900 rounded-2xl shadow-md border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[500px]">
                        <thead>
                        <tr className="bg-slate-950/50 border-b border-slate-800">
                            <th className="py-4 px-6 font-semibold text-slate-400 text-xs uppercase tracking-wider w-20">Rang</th>
                            <th className="py-4 px-6 font-semibold text-slate-400 text-xs uppercase tracking-wider">Joueur</th>
                            <th className="py-4 px-6 font-semibold text-slate-400 text-xs uppercase tracking-wider text-center">Parties Jouées</th>
                            <th className="py-4 px-6 font-semibold text-slate-400 text-xs uppercase tracking-wider text-right">MMR Actuel</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
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
                                <tr key={player.name} className="group hover:bg-indigo-500/10 transition-colors">
                                    <td className="py-4 px-6">{getRankBadge(index)}</td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            {player.avatarUrl ? (
                                                <img
                                                    src={player.avatarUrl}
                                                    alt={player.name}
                                                    className="w-8 h-8 rounded-full object-cover border border-slate-700 shadow-inner"
                                                />
                                            ) : (
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-inner ${
                                                    index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                                                        index === 1 ? 'bg-slate-400/20 text-slate-300' :
                                                            index === 2 ? 'bg-orange-500/20 text-orange-400' :
                                                                'bg-slate-800 text-slate-400'
                                                }`}>
                                                    {player.name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <Link
                                                href={`/player/${encodeURIComponent(player.name)}`}
                                                className={`font-semibold hover:text-indigo-400 hover:underline transition-colors ${index < 3 ? 'text-slate-200' : 'text-slate-400'}`}
                                            >
                                                {player.name}
                                            </Link>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-center text-slate-400 font-medium">{player.gamesPlayed}</td>
                                    <td className="py-4 px-6 text-right">
                      <span className={`font-bold text-lg ${index === 0 ? 'text-indigo-400' : 'text-slate-300'}`}>
                        {player.mmr}
                      </span>
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}