"use client";

import ColorDots from "@/components/ColorDots";
import { TournamentDetailRound } from "./types";

interface HistoryViewProps {
    rounds: TournamentDetailRound[];
    onViewDecklist?: (playerName: string, decklist: string | null, colors?: string[]) => void;
}

export default function HistoryView({ rounds, onViewDecklist }: HistoryViewProps) {
    if (!rounds || rounds.length === 0) {
        return (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-16 text-center text-slate-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-semibold text-slate-400">Aucun historique de ronde pour l’instant.</p>
                <p className="text-xs text-slate-500 mt-1">L’historique se remplira au fur et à mesure des matchs disputés.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {rounds.map((round) => {
                const finishedCount = round.matches.filter((m) => m.status === "FINISHED").length;

                return (
                    <div
                        key={round.id}
                        className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl"
                    >
                        {/* En-tête de ronde */}
                        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
                            <div className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-sm font-mono">
                                    R{round.roundNumber}
                                </span>
                                <div>
                                    <h3 className="font-bold text-slate-100 text-base">
                                        {round.isTopCut
                                            ? `Top-Cut (Ronde ${round.roundNumber})`
                                            : `Ronde ${round.roundNumber}`}
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        {finishedCount} / {round.matches.length} match(s) terminé(s)
                                    </p>
                                </div>
                            </div>

                            <span
                                className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                                    round.status === "FINISHED"
                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                        : "bg-sky-500/10 text-sky-400 border-sky-500/20 animate-pulse"
                                }`}
                            >
                                {round.status === "FINISHED" ? "Ronde terminée" : "En cours"}
                            </span>
                        </div>

                        {/* Liste des matchs de la ronde */}
                        <div className="divide-y divide-slate-800/60">
                            {round.matches.map((match) => {
                                const p1Name = match.player1?.user?.name || "Joueur 1";
                                const p2Name = match.player2?.user?.name || (match.isBye ? "BYE" : "Joueur 2");

                                const p1DeckColors = match.player1DeckColors?.length > 0
                                    ? match.player1DeckColors
                                    : match.player1?.officialDeckColors || [];
                                const p2DeckColors = match.player2DeckColors?.length > 0
                                    ? match.player2DeckColors
                                    : match.player2?.officialDeckColors || [];

                                const p1Won = match.status === "FINISHED" && match.winnerId === match.player1Id;
                                const p2Won = match.status === "FINISHED" && match.winnerId === match.player2Id;

                                const replayLink = match.replayUrl || match.duelsTableUrl;

                                return (
                                    <div
                                        key={match.id}
                                        className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors"
                                    >
                                        {/* Table et Joueurs */}
                                        <div className="flex items-center gap-4 min-w-0">
                                            <span className="text-xs font-mono font-bold text-slate-500 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 shrink-0">
                                                T{match.tableNumber}
                                            </span>

                                            <div className="flex items-center gap-3 sm:gap-6 min-w-0">
                                                {/* Joueur 1 */}
                                                <div className="flex items-center gap-2 min-w-0">
                                                    {p1DeckColors.length > 0 && (
                                                        <ColorDots colors={p1DeckColors.join(" / ")} />
                                                    )}
                                                    <span
                                                        className={`text-xs font-bold truncate ${
                                                            p1Won ? "text-emerald-400" : "text-slate-200"
                                                        }`}
                                                    >
                                                        {p1Name}
                                                    </span>
                                                    {p1Won && <span className="text-xs">👑</span>}
                                                </div>

                                                {/* Score */}
                                                <div className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 font-mono font-black text-sm text-slate-200 shrink-0">
                                                    <span className={p1Won ? "text-emerald-400" : "text-slate-300"}>
                                                        {match.player1Score}
                                                    </span>
                                                    <span className="text-slate-600 mx-1.5">-</span>
                                                    <span className={p2Won ? "text-emerald-400" : "text-slate-300"}>
                                                        {match.player2Score}
                                                    </span>
                                                </div>

                                                {/* Joueur 2 */}
                                                <div className="flex items-center gap-2 min-w-0">
                                                    {p2Won && <span className="text-xs">👑</span>}
                                                    <span
                                                        className={`text-xs font-bold truncate ${
                                                            p2Won
                                                                ? "text-emerald-400"
                                                                : match.isBye
                                                                ? "text-slate-500 italic"
                                                                : "text-slate-200"
                                                        }`}
                                                    >
                                                        {p2Name}
                                                    </span>
                                                    {p2DeckColors.length > 0 && (
                                                        <ColorDots colors={p2DeckColors.join(" / ")} />
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions : Decklists & Replay */}
                                        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                                            {/* Decklist Joueur 1 */}
                                            {(match.player1Deck || match.player1?.officialDecklist) && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onViewDecklist?.(
                                                            p1Name,
                                                            match.player1Deck || match.player1?.officialDecklist || null,
                                                            p1DeckColors
                                                        )
                                                    }
                                                    className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                                                >
                                                    Deck {p1Name.split(" ")[0]}
                                                </button>
                                            )}

                                            {/* Decklist Joueur 2 */}
                                            {match.player2 && (match.player2Deck || match.player2?.officialDecklist) && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onViewDecklist?.(
                                                            p2Name,
                                                            match.player2Deck || match.player2?.officialDecklist || null,
                                                            p2DeckColors
                                                        )
                                                    }
                                                    className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                                                >
                                                    Deck {p2Name.split(" ")[0]}
                                                </button>
                                            )}

                                            {/* Lien Replay */}
                                            {replayLink && (
                                                <a
                                                    href={replayLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-colors"
                                                >
                                                    <span>Replay Duels</span>
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                    </svg>
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
