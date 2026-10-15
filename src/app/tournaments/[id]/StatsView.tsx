"use client";

import ColorDots from "@/components/ColorDots";
import { TournamentStatsResult } from "@/lib/tournament/types";

interface StatsViewProps {
    stats: TournamentStatsResult;
}

export default function StatsView({ stats }: StatsViewProps) {
    const hasData = stats.totalMatches > 0 || stats.inkCombos.length > 0;

    if (!hasData) {
        return (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-16 text-center text-slate-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-sm font-semibold text-slate-400">Statistiques indisponibles pour le moment.</p>
                <p className="text-xs text-slate-500 mt-1">Les statistiques d'archétypes et de premier tour apparaîtront dès les premiers matchs disputés.</p>
            </div>
        );
    }

    const mostPlayedCombo = stats.inkCombos.length > 0 ? stats.inkCombos[0] : null;
    const highestWinrateCombo = stats.inkCombos.length > 0
        ? [...stats.inkCombos].sort((a, b) => b.matchWinrate - a.matchWinrate || b.matchesPlayed - a.matchesPlayed)[0]
        : null;

    return (
        <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Total Matchs */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Matchs disputés
                    </span>
                    <span className="text-3xl font-black text-slate-100 font-mono">
                        {stats.totalMatches}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-1">
                        Rencontres prises en compte
                    </span>
                </div>

                {/* Total Manches */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Manches jouées
                    </span>
                    <span className="text-3xl font-black text-indigo-400 font-mono">
                        {stats.totalGamesDecided}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-1">
                        Games décidées
                    </span>
                </div>

                {/* Archétype dominant */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Archétype le plus joué
                    </span>
                    {mostPlayedCombo ? (
                        <>
                            <div className="flex items-center gap-2 mt-1 mb-1">
                                <ColorDots colors={mostPlayedCombo.name} />
                                <span className="text-sm font-bold text-slate-200 truncate">
                                    {mostPlayedCombo.name}
                                </span>
                            </div>
                            <span className="text-[11px] text-slate-500">
                                {mostPlayedCombo.matchesPlayed} match(s) ({mostPlayedCombo.matchWinrate}% WR)
                            </span>
                        </>
                    ) : (
                        <span className="text-slate-500 text-sm">-</span>
                    )}
                </div>

                {/* Archétype le plus victorieux */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Meilleur Winrate
                    </span>
                    {highestWinrateCombo ? (
                        <>
                            <div className="flex items-center gap-2 mt-1 mb-1">
                                <ColorDots colors={highestWinrateCombo.name} />
                                <span className="text-sm font-bold text-emerald-400 truncate">
                                    {highestWinrateCombo.matchWinrate}%
                                </span>
                            </div>
                            <span className="text-[11px] text-slate-500 truncate block">
                                {highestWinrateCombo.name} ({highestWinrateCombo.matchesWon}/{highestWinrateCombo.matchesPlayed})
                            </span>
                        </>
                    ) : (
                        <span className="text-slate-500 text-sm">-</span>
                    )}
                </div>
            </div>

            {/* Avantage au Premier Tour (Play vs Draw / OTP vs OTD) */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                        <span>Avantage au Premier Tour (Play vs Draw)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                        Impact de commencer la partie (OTP) par rapport à piocher en second (OTD).
                    </p>
                </div>

                {stats.wentFirst.totalGames > 0 ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            {/* Joueur 1 (Play / OTP) */}
                            <div className="bg-slate-950/60 border border-indigo-500/30 rounded-2xl p-5 flex flex-col items-center text-center">
                                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
                                    En premier (OTP - Play)
                                </span>
                                <span className="text-4xl font-black text-indigo-300 font-mono">
                                    {stats.wentFirst.firstPlayerWinrate}%
                                </span>
                                <span className="text-xs text-slate-500 mt-2">
                                    {stats.wentFirst.firstPlayerWins} victoires sur {stats.wentFirst.totalGames} games
                                </span>
                            </div>

                            {/* Joueur 2 (Draw / OTD) */}
                            <div className="bg-slate-950/60 border border-amber-500/30 rounded-2xl p-5 flex flex-col items-center text-center">
                                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
                                    En second (OTD - Draw)
                                </span>
                                <span className="text-4xl font-black text-amber-300 font-mono">
                                    {stats.wentFirst.secondPlayerWinrate}%
                                </span>
                                <span className="text-xs text-slate-500 mt-2">
                                    {stats.wentFirst.secondPlayerWins} victoires sur {stats.wentFirst.totalGames} games
                                </span>
                            </div>
                        </div>

                        {/* Barre de répartition visuelle */}
                        <div className="w-full h-4 bg-slate-950 rounded-full overflow-hidden flex p-0.5 border border-slate-800">
                            <div
                                style={{ width: `${stats.wentFirst.firstPlayerWinrate}%` }}
                                className="bg-indigo-500 rounded-l-full transition-all duration-500"
                            />
                            <div
                                style={{ width: `${stats.wentFirst.secondPlayerWinrate}%` }}
                                className="bg-amber-500 rounded-r-full transition-all duration-500"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs">
                        Données de premier tour en cours de collecte...
                    </div>
                )}
            </div>

            {/* Performance par Combinaison d'Encres (Archétypes) */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="p-6 border-b border-slate-800 bg-slate-900/60">
                    <h3 className="text-lg font-bold text-slate-100">
                        Performance des Archétypes & Encres
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                        Winrates de match et de manche par association de couleurs enregistrée.
                    </p>
                </div>

                {stats.inkCombos.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 text-xs">
                        Aucun archétype identifié pour l'instant.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-slate-800/80 bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                    <th className="py-3.5 px-6">Archétype</th>
                                    <th className="py-3.5 px-4 text-center">Matchs Joués</th>
                                    <th className="py-3.5 px-4 text-center">Victoires Match</th>
                                    <th className="py-3.5 px-6 text-center">Winrate Match</th>
                                    <th className="py-3.5 px-4 text-center">Manches Jouées</th>
                                    <th className="py-3.5 px-6 text-center">Winrate Manches</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {stats.inkCombos.map((combo) => (
                                    <tr key={combo.name} className="hover:bg-slate-800/40 transition-colors">
                                        <td className="py-4 px-6 font-semibold text-slate-200">
                                            <div className="flex items-center gap-3">
                                                <ColorDots colors={combo.name} />
                                                <span className="text-sm font-bold">{combo.name}</span>
                                            </div>
                                        </td>

                                        <td className="py-4 px-4 text-center font-mono font-bold text-slate-300">
                                            {combo.matchesPlayed}
                                        </td>

                                        <td className="py-4 px-4 text-center font-mono text-slate-400">
                                            {combo.matchesWon}
                                        </td>

                                        {/* Winrate match */}
                                        <td className="py-4 px-6 text-center">
                                            <div className="inline-flex items-center gap-2">
                                                <span
                                                    className={`font-mono font-bold text-sm ${
                                                        combo.matchWinrate >= 50 ? "text-emerald-400" : "text-rose-400"
                                                    }`}
                                                >
                                                    {combo.matchWinrate}%
                                                </span>
                                            </div>
                                        </td>

                                        <td className="py-4 px-4 text-center font-mono text-slate-400">
                                            {combo.gamesPlayed}
                                        </td>

                                        {/* Winrate manche */}
                                        <td className="py-4 px-6 text-center">
                                            <span
                                                className={`font-mono font-semibold ${
                                                    combo.gameWinrate >= 50 ? "text-emerald-400" : "text-rose-400"
                                                }`}
                                            >
                                                {combo.gameWinrate}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
