"use client";

import { StandingRow } from "@/lib/tournament/types";
import { TournamentDetailParticipant } from "./types";

interface StandingsViewProps {
    standings: StandingRow[];
    participants: TournamentDetailParticipant[];
    currentUserId?: string;
}

export default function StandingsView({
    standings,
    participants,
    currentUserId,
}: StandingsViewProps) {
    const participantsMap = new Map<string, TournamentDetailParticipant>(
        participants.map((p) => [p.id, p])
    );

    const formatPercent = (val: number) => {
        if (val === undefined || isNaN(val)) return "0.0%";
        return (val * 100).toFixed(1) + "%";
    };

    return (
        <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                {/* En-tête du tableau */}
                <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900/60">
                    <div>
                        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                            <span>Classement Général</span>
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                                {standings.length} joueur{standings.length > 1 ? "s" : ""}
                            </span>
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                            Calculé en direct selon les règles officielles de départage Disney Lorcana (OMWP, PGWP, OGWP).
                        </p>
                    </div>
                </div>

                {/* Table de classement */}
                {standings.length === 0 ? (
                    <div className="p-16 text-center text-slate-500">
                        <p className="font-semibold text-sm">Aucun classement disponible pour le moment.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-slate-800/80 bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                    <th className="py-3.5 px-4 text-center w-12">#</th>
                                    <th className="py-3.5 px-4">Joueur</th>
                                    <th className="py-3.5 px-3 text-center">Points</th>
                                    <th className="py-3.5 px-3 text-center">V - D - N</th>
                                    <th className="py-3.5 px-3 text-center">Manches</th>
                                    <th className="py-3.5 px-3 text-center" title="Opponents' Match Win Percentage">OMWP %</th>
                                    <th className="py-3.5 px-3 text-center" title="Player Game Win Percentage">PGWP %</th>
                                    <th className="py-3.5 px-3 text-center" title="Opponents' Game Win Percentage">OGWP %</th>
                                    <th className="py-3.5 px-4 text-right">Statut</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {standings.map((row) => {
                                    const participant = participantsMap.get(row.participantId);
                                    const isSelf = participant?.userId === currentUserId;
                                    const displayName = row.name || participant?.user?.name || "Joueur";

                                    return (
                                        <tr
                                            key={row.participantId}
                                            className={`transition-colors ${
                                                isSelf
                                                    ? "bg-indigo-950/20 hover:bg-indigo-950/30"
                                                    : row.dropped
                                                    ? "bg-slate-950/20 text-slate-500 hover:bg-slate-900/60 opacity-75"
                                                    : "hover:bg-slate-800/40"
                                            }`}
                                        >
                                            {/* Rang */}
                                            <td className="py-3.5 px-4 text-center font-black">
                                                {row.rank === 1 ? (
                                                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/30 shadow-xs text-sm">
                                                        🥇
                                                    </span>
                                                ) : row.rank === 2 ? (
                                                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300/10 text-slate-200 border border-slate-300/30 shadow-xs text-sm">
                                                        🥈
                                                    </span>
                                                ) : row.rank === 3 ? (
                                                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/10 text-amber-500 border border-amber-600/30 shadow-xs text-sm">
                                                        🥉
                                                    </span>
                                                ) : (
                                                    <span className="font-mono text-slate-400 text-sm">{row.rank}</span>
                                                )}
                                            </td>

                                            {/* Joueur */}
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-3">
                                                    {participant?.user?.image ? (
                                                        <img
                                                            src={participant.user.image}
                                                            alt={displayName}
                                                            className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-300 shrink-0">
                                                            {displayName.slice(0, 2).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <span
                                                            className={`font-bold truncate block ${
                                                                isSelf
                                                                    ? "text-indigo-300"
                                                                    : row.dropped
                                                                    ? "text-slate-400 line-through"
                                                                    : "text-slate-200"
                                                            }`}
                                                        >
                                                            {displayName}
                                                        </span>
                                                        {isSelf && (
                                                            <span className="text-[10px] text-indigo-400 font-semibold">
                                                                (Vous)
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Points de match */}
                                            <td className="py-3.5 px-3 text-center">
                                                <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 font-black text-sm font-mono border border-indigo-500/20">
                                                    {row.matchPoints}
                                                </span>
                                            </td>

                                            {/* V - D - N */}
                                            <td className="py-3.5 px-3 text-center font-mono font-semibold text-slate-300 whitespace-nowrap">
                                                <span className="text-emerald-400 font-bold">{row.wins}V</span>
                                                <span className="text-slate-600 mx-1">-</span>
                                                <span className="text-rose-400 font-bold">{row.losses}D</span>
                                                <span className="text-slate-600 mx-1">-</span>
                                                <span className="text-slate-400">{row.draws}N</span>
                                            </td>

                                            {/* Manches disputées */}
                                            <td className="py-3.5 px-3 text-center font-mono text-slate-400 whitespace-nowrap">
                                                {row.gameWins} - {row.gameLosses}
                                            </td>

                                            {/* OMWP % */}
                                            <td className="py-3.5 px-3 text-center font-mono font-semibold text-slate-300">
                                                {formatPercent(row.omwp)}
                                            </td>

                                            {/* PGWP % */}
                                            <td className="py-3.5 px-3 text-center font-mono text-slate-400">
                                                {formatPercent(row.pgwp)}
                                            </td>

                                            {/* OGWP % */}
                                            <td className="py-3.5 px-3 text-center font-mono text-slate-400">
                                                {formatPercent(row.ogwp)}
                                            </td>

                                            {/* Statut Forfait / Actif */}
                                            <td className="py-3.5 px-4 text-right">
                                                {row.dropped ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                                        Forfait
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                        Actif
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Note explicative des critères de départage */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 text-xs text-slate-400 space-y-2">
                <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                    Règles de calcul du classement officiel Lorcana
                </h4>
                <p className="leading-relaxed">
                    • <strong className="text-slate-200">Points de match</strong> : 3 points par victoire, 1 point par match nul, 0 point par défaite.
                </p>
                <p className="leading-relaxed">
                    • <strong className="text-slate-200">OMWP (Opponents' Match Win %)</strong> : Moyenne des pourcentages de victoire de tous les adversaires rencontrés (hors Bye, plancher officiel à 33%).
                </p>
                <p className="leading-relaxed">
                    • <strong className="text-slate-200">PGWP / OGWP</strong> : Pourcentage individuel de manches gagnées, puis pourcentage de manches gagnées par les adversaires.
                </p>
            </div>
        </div>
    );
}
