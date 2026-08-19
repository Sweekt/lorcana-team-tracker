"use client";

import { useState } from "react";
import ColorDots from "@/components/ColorDots";
import DeckModal from "@/components/DeckModal";

export default function StatsView({ games, teamView = false }: { games: any[]; teamView?: boolean }) {
    const [selectedDeck, setSelectedDeck] = useState<any | null>(null);

    if (games.length === 0) {
        return <div className="bg-slate-900 p-12 rounded-2xl border border-slate-800 text-center text-slate-500">Aucune donnée pour calculer les statistiques.</div>;
    }

    const total = games.length;
    const wins = games.filter(g => g.result === "win").length;
    const globalWr = Math.round((wins / total) * 100);

    const firstGames = games.filter(g => g.wentFirst === true);
    const firstWr = firstGames.length ? Math.round((firstGames.filter(g => g.result === "win").length / firstGames.length) * 100) : 0;

    const drawGames = games.filter(g => g.wentFirst === false);
    const drawWr = drawGames.length ? Math.round((drawGames.filter(g => g.result === "win").length / drawGames.length) * 100) : 0;

    const decksMap = games.reduce((acc: any, g) => {
        const color = g.myDeckColors || "Inconnu";
        const oppColor = g.oppDeckColors || "Inconnu";
        const isWin = g.result === "win";
        const isOTP = g.wentFirst === true;
        const isOTD = g.wentFirst === false;

        const playerName = g.user?.name || "Inconnu";

        if (!acc[color]) {
            acc[color] = {
                total: 0,
                wins: 0,
                otpTotal: 0,
                otpWins: 0,
                otdTotal: 0,
                otdWins: 0,
                matchups: {},
                players: {}
            };
        }

        acc[color].total += 1;
        if (isWin) acc[color].wins += 1;
        if (isOTP) { acc[color].otpTotal += 1; if (isWin) acc[color].otpWins += 1; }
        if (isOTD) { acc[color].otdTotal += 1; if (isWin) acc[color].otdWins += 1; }

        // Enregistrement des stats par joueur pour ce deck
        if (!acc[color].players[playerName]) {
            acc[color].players[playerName] = { total: 0, wins: 0 };
        }
        acc[color].players[playerName].total += 1;
        if (isWin) acc[color].players[playerName].wins += 1;

        if (!acc[color].matchups[oppColor]) {
            acc[color].matchups[oppColor] = { total: 0, wins: 0, otpTotal: 0, otpWins: 0, otdTotal: 0, otdWins: 0 };
        }
        acc[color].matchups[oppColor].total += 1;
        if (isWin) acc[color].matchups[oppColor].wins += 1;
        if (isOTP) { acc[color].matchups[oppColor].otpTotal += 1; if (isWin) acc[color].matchups[oppColor].otpWins += 1; }
        if (isOTD) { acc[color].matchups[oppColor].otdTotal += 1; if (isWin) acc[color].matchups[oppColor].otdWins += 1; }

        return acc;
    }, {});

    const deckStats = Object.entries(decksMap)
        .map(([color, d]: any) => {
            let deckmaster = null;
            if (teamView) {
                let bestWr = -1;
                for (const [playerName, pStats] of Object.entries(d.players) as [string, any][]) {
                    if (pStats.total >= 10) {
                        const pWr = (pStats.wins / pStats.total) * 100;
                        if (pWr > bestWr) {
                            bestWr = pWr;
                            deckmaster = {
                                name: playerName,
                                wr: Math.round(pWr),
                                total: pStats.total
                            };
                        }
                    }
                }
            }

            return {
                color,
                total: d.total,
                wins: d.wins,
                wr: Math.round((d.wins / d.total) * 100),
                otpWr: d.otpTotal > 0 ? Math.round((d.otpWins / d.otpTotal) * 100) : null,
                otdWr: d.otdTotal > 0 ? Math.round((d.otdWins / d.otdTotal) * 100) : null,
                otpTotal: d.otpTotal,
                otpWins: d.otpWins,
                otdTotal: d.otdTotal,
                otdWins: d.otdWins,
                deckmaster,
                matchups: Object.entries(d.matchups)
                    .map(([opponent, m]: any) => ({ opponent, ...m }))
                    .sort((a, b) => b.total - a.total)
            };
        })
        .sort((a, b) => b.total - a.total);

    return (
        <div className="space-y-8">

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

            <div>
                <h3 className="text-lg font-bold text-slate-200 mb-4 px-1">Performances par Deck joué</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {deckStats.map((d) => (
                        <div
                            key={d.color}
                            onClick={() => setSelectedDeck(d)}
                            className="group cursor-pointer bg-slate-900 rounded-2xl border border-slate-800 flex flex-col justify-between overflow-hidden hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10 transition-all"
                        >
                            <div className="p-5 grow flex flex-col">
                                <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800/60">
                                    <div className="flex items-center gap-3">
                                        <ColorDots colors={d.color} />
                                        <h4 className="font-bold text-slate-200 truncate">{d.color}</h4>
                                    </div>
                                    <span className="text-slate-600 group-hover:text-indigo-400 transition-colors">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    </span>
                                </div>

                                <div className="flex items-end gap-3 mb-5">
                                    <span className={`text-4xl font-black tracking-tight ${d.wr >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {d.wr}%
                                    </span>
                                    <div className="flex flex-col pb-1">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Win Rate</span>
                                        <span className="text-xs text-slate-400 font-medium">{d.total} games</span>
                                    </div>
                                </div>

                                {/* Affichage du Deckmaster si l'option est active et qu'il y a un profil éligible */}
                                {teamView && d.deckmaster && (
                                    <div className="mb-4 bg-indigo-950/30 border border-indigo-900/50 rounded-xl p-2.5 flex items-center justify-between">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Deckmaster</span>
                                        <div className="text-right">
                                            <p className="text-xs font-bold text-slate-200">{d.deckmaster.name}</p>
                                            <p className="text-[10px] text-emerald-400 font-medium">{d.deckmaster.wr}% WR ({d.deckmaster.total}g)</p>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3 mt-auto">
                                    <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50 group-hover:bg-slate-900 transition-colors">
                                        <p className="text-[10px] text-slate-500 mb-1 font-bold uppercase tracking-wider">Play (1st)</p>
                                        {d.otpWr !== null ? (
                                            <p className="font-bold text-slate-200">
                                                {d.otpWr}% <span className="text-[10px] font-medium text-slate-600 ml-1">({d.otpTotal})</span>
                                            </p>
                                        ) : <p className="text-slate-600 text-sm">-</p>}
                                    </div>

                                    <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50 group-hover:bg-slate-900 transition-colors">
                                        <p className="text-[10px] text-slate-500 mb-1 font-bold uppercase tracking-wider">Draw (2nd)</p>
                                        {d.otdWr !== null ? (
                                            <p className="font-bold text-slate-200">
                                                {d.otdWr}% <span className="text-[10px] font-medium text-slate-600 ml-1">({d.otdTotal})</span>
                                            </p>
                                        ) : <p className="text-slate-600 text-sm">-</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {selectedDeck && (
                <DeckModal deck={selectedDeck} onClose={() => setSelectedDeck(null)} />
            )}

        </div>
    );
}