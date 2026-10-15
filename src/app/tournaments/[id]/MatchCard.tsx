"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ColorDots from "@/components/ColorDots";
import { syncMatchFromDuelsAction, dropTournamentAction } from "@/actions/tournament";
import { TournamentDetailMatch } from "./types";

interface MatchCardProps {
    match: TournamentDetailMatch;
    currentUserId?: string;
    isAdmin: boolean;
    tournamentId: string;
    onEditScore?: (match: TournamentDetailMatch) => void;
    onViewDecklist?: (playerName: string, decklist: string | null, deckColors?: string[]) => void;
}

export default function MatchCard({
    match,
    currentUserId,
    isAdmin,
    tournamentId,
    onEditScore,
    onViewDecklist,
}: MatchCardProps) {
    const router = useRouter();
    const [isSyncing, setIsSyncing] = useState(false);
    const [isDropping, setIsDropping] = useState(false);
    const [confirmDropFor, setConfirmDropFor] = useState<{ id: string; name: string } | null>(null);

    const isP1 = match.player1?.userId === currentUserId;
    const isP2 = match.player2?.userId === currentUserId;
    const isPlayerInMatch = isP1 || isP2;

    const p1Name = match.player1?.user?.name || "Joueur 1";
    const p2Name = match.player2?.user?.name || (match.isBye ? "BYE" : "En attente");

    const p1DeckColors = match.player1DeckColors?.length > 0
        ? match.player1DeckColors
        : match.player1?.officialDeckColors || [];
    const p2DeckColors = match.player2DeckColors?.length > 0
        ? match.player2DeckColors
        : match.player2?.officialDeckColors || [];

    const isFinished = match.status === "FINISHED";
    const isInProgress = match.status === "IN_PROGRESS";
    const p1Won = isFinished && match.winnerId === match.player1Id;
    const p2Won = isFinished && match.winnerId === match.player2Id;

    // Synchronisation manuelle avec Duels.ink
    const handleSyncDuels = async () => {
        if (!match.duelsTableId) return;
        setIsSyncing(true);
        try {
            const res = await syncMatchFromDuelsAction(match.id);
            if (res.error) {
                toast.error(res.error);
            } else {
                if (res.finished) {
                    toast.success("Match terminé synchronisé depuis Duels.ink !");
                } else {
                    toast.info(`Match synchronisé : statut ${res.status || "en cours"}.`);
                }
                router.refresh();
            }
        } catch (error) {
            console.error("[MatchCard] Erreur sync:", error);
            toast.error("Erreur lors de la synchronisation avec Duels.ink.");
        } finally {
            setIsSyncing(false);
        }
    };

    // Abandon (Drop)
    const handleConfirmDrop = async () => {
        if (!confirmDropFor) return;
        setIsDropping(true);
        try {
            const res = await dropTournamentAction(tournamentId, confirmDropFor.id);
            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success(`${confirmDropFor.name} a abandonné le tournoi.`);
                setConfirmDropFor(null);
                router.refresh();
            }
        } catch (error) {
            console.error("[MatchCard] Erreur abandon:", error);
            toast.error("Erreur lors de l'enregistrement de l'abandon.");
        } finally {
            setIsDropping(false);
        }
    };

    return (
        <div
            className={`flex flex-col bg-slate-900 border rounded-2xl p-5 transition-all duration-200 shadow-md ${
                isFinished
                    ? "border-slate-800/80 bg-slate-900/60"
                    : isInProgress
                    ? "border-sky-500/40 bg-slate-900 ring-1 ring-sky-500/20"
                    : "border-slate-800"
            }`}
        >
            {/* Ligne d'en-tête de table : Numéro de table + Statut */}
            <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700/60">
                        {match.isBye ? "Table Spéciale" : `Table ${match.tableNumber}`}
                    </span>
                    {match.isForfeit && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            Forfait
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {match.isBye ? (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            BYE (Exempté)
                        </span>
                    ) : isFinished ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Terminé
                        </span>
                    ) : isInProgress ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                            En cours
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                            En attente
                        </span>
                    )}
                </div>
            </div>

            {/* Duel : Joueur 1 vs Joueur 2 */}
            <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center my-2">
                {/* Joueur 1 */}
                <div
                    className={`md:col-span-5 flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                        p1Won
                            ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-200 ring-1 ring-emerald-500/20"
                            : "bg-slate-950/40 border-slate-800/80 text-slate-200"
                    }`}
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                            {match.player1?.user?.image ? (
                                <img
                                    src={match.player1.user.image}
                                    alt={p1Name}
                                    className="w-10 h-10 rounded-full object-cover border border-slate-700"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center font-bold text-sm text-indigo-300">
                                    {p1Name.slice(0, 2).toUpperCase()}
                                </div>
                            )}
                            {p1Won && (
                                <span className="absolute -top-1.5 -right-1.5 text-sm" title="Vainqueur">
                                    👑
                                </span>
                            )}
                        </div>

                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-slate-100 truncate">
                                    {p1Name}
                                </span>
                                {match.player1?.seed && (
                                    <span className="text-[10px] font-mono text-slate-500">
                                        #{match.player1.seed}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2 mt-1">
                                {p1DeckColors.length > 0 && (
                                    <ColorDots colors={p1DeckColors.join(" / ")} />
                                )}
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
                                        className="text-[10px] font-medium text-slate-400 hover:text-indigo-400 transition-colors"
                                    >
                                        Decklist
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="shrink-0 pl-3 text-right">
                        <span
                            className={`text-2xl font-black font-mono ${
                                p1Won ? "text-emerald-400" : isFinished ? "text-slate-400" : "text-slate-200"
                            }`}
                        >
                            {match.player1Score}
                        </span>
                    </div>
                </div>

                {/* Séparateur VS */}
                <div className="md:col-span-1 flex flex-col items-center justify-center text-slate-600 font-extrabold text-xs">
                    <span>VS</span>
                </div>

                {/* Joueur 2 */}
                <div
                    className={`md:col-span-5 flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                        p2Won
                            ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-200 ring-1 ring-emerald-500/20"
                            : match.isBye
                            ? "bg-slate-950/20 border-dashed border-slate-800 text-slate-500"
                            : "bg-slate-950/40 border-slate-800/80 text-slate-200"
                    }`}
                >
                    {match.isBye ? (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-800/50 border border-slate-800 flex items-center justify-center text-xs text-slate-500 font-bold">
                                BYE
                            </div>
                            <span className="text-xs font-medium text-slate-500">
                                Aucun adversaire (Victoire automatique)
                            </span>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="relative shrink-0">
                                    {match.player2?.user?.image ? (
                                        <img
                                            src={match.player2.user.image}
                                            alt={p2Name}
                                            className="w-10 h-10 rounded-full object-cover border border-slate-700"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-purple-600/30 border border-purple-500/40 flex items-center justify-center font-bold text-sm text-purple-300">
                                            {p2Name.slice(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                    {p2Won && (
                                        <span className="absolute -top-1.5 -right-1.5 text-sm" title="Vainqueur">
                                            👑
                                        </span>
                                    )}
                                </div>

                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-slate-100 truncate">
                                            {p2Name}
                                        </span>
                                        {match.player2?.seed && (
                                            <span className="text-[10px] font-mono text-slate-500">
                                                #{match.player2.seed}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 mt-1">
                                        {p2DeckColors.length > 0 && (
                                            <ColorDots colors={p2DeckColors.join(" / ")} />
                                        )}
                                        {(match.player2Deck || match.player2?.officialDecklist) && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onViewDecklist?.(
                                                        p2Name,
                                                        match.player2Deck || match.player2?.officialDecklist || null,
                                                        p2DeckColors
                                                    )
                                                }
                                                className="text-[10px] font-medium text-slate-400 hover:text-indigo-400 transition-colors"
                                            >
                                                Decklist
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="shrink-0 pl-3 text-right">
                                <span
                                    className={`text-2xl font-black font-mono ${
                                        p2Won ? "text-emerald-400" : isFinished ? "text-slate-400" : "text-slate-200"
                                    }`}
                                >
                                    {match.player2Score}
                                </span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Barre d'actions du match */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-3 border-t border-slate-800/80 text-xs">
                {/* Actions Duels.ink */}
                <div className="flex items-center gap-2">
                    {match.duelsTableUrl && (
                        <a
                            href={match.duelsTableUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors shadow-xs"
                        >
                            <span>Rejoindre sur Duels.ink</span>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                    )}

                    {match.duelsTableId && !isFinished && (
                        <button
                            type="button"
                            onClick={handleSyncDuels}
                            disabled={isSyncing}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium border border-slate-700 transition-colors disabled:opacity-50"
                        >
                            {isSyncing ? (
                                <span className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            )}
                            <span>Actualiser score</span>
                        </button>
                    )}
                </div>

                {/* Actions Joueur & Capitaine */}
                <div className="flex items-center gap-2">
                    {/* Arbitrage manuel pour capitaine */}
                    {isAdmin && (
                        <button
                            type="button"
                            onClick={() => onEditScore?.(match)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium transition-colors"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span>Éditer score</span>
                        </button>
                    )}

                    {/* Bouton Abandonner (Drop) pour les participants non abandonnés */}
                    {!isFinished && !match.isBye && (
                        <>
                            {(isP1 || isAdmin) && !match.player1?.dropped && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setConfirmDropFor({
                                            id: match.player1.id,
                                            name: p1Name,
                                        })
                                    }
                                    className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors font-medium"
                                >
                                    {isAdmin && !isP1 ? `Drop ${p1Name}` : "Abandonner"}
                                </button>
                            )}

                            {match.player2 && (isP2 || isAdmin) && !match.player2.dropped && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setConfirmDropFor({
                                            id: match.player2!.id,
                                            name: p2Name,
                                        })
                                    }
                                    className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors font-medium"
                                >
                                    {isAdmin && !isP2 ? `Drop ${p2Name}` : "Abandonner"}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Modal de confirmation d'abandon */}
            {confirmDropFor && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
                    onClick={() => setConfirmDropFor(null)}
                >
                    <div
                        className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h4 className="text-lg font-bold text-slate-100 mb-2">
                            Confirmer l'abandon ?
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed mb-6">
                            Êtes-vous sûr de vouloir enregistrer le forfait de{" "}
                            <span className="text-slate-200 font-semibold">{confirmDropFor.name}</span> ?
                            Cette action accordera une victoire 2-0 à l'adversaire et retirera le joueur des rondes suivantes.
                        </p>

                        <div className="flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setConfirmDropFor(null)}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDrop}
                                disabled={isDropping}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors disabled:opacity-50"
                            >
                                {isDropping ? "En cours..." : "Confirmer l'abandon"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
