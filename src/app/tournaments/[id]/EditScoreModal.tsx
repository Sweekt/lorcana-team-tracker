"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateMatchScoreAction } from "@/actions/tournament";
import { TournamentDetailMatch } from "./types";

interface EditScoreModalProps {
    isOpen: boolean;
    onClose: () => void;
    match: TournamentDetailMatch | null;
}

export default function EditScoreModal({ isOpen, onClose, match }: EditScoreModalProps) {
    const router = useRouter();

    if (!isOpen || !match) return null;

    const p1Name = match.player1?.user?.name || "Joueur 1";
    const p2Name = match.player2?.user?.name || "Joueur 2";

    const [p1Score, setP1Score] = useState<number>(match.player1Score ?? 0);
    const [p2Score, setP2Score] = useState<number>(match.player2Score ?? 0);
    const [winnerId, setWinnerId] = useState<string>(
        match.winnerId || (match.player1Score > match.player2Score ? match.player1Id : match.player2Id || match.player1Id)
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleP1ScoreChange = (score: number) => {
        const val = Math.max(0, score);
        setP1Score(val);
        if (val > p2Score) {
            setWinnerId(match.player1Id);
        } else if (p2Score > val && match.player2Id) {
            setWinnerId(match.player2Id);
        }
    };

    const handleP2ScoreChange = (score: number) => {
        const val = Math.max(0, score);
        setP2Score(val);
        if (val > p1Score && match.player2Id) {
            setWinnerId(match.player2Id);
        } else if (p1Score > val) {
            setWinnerId(match.player1Id);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!winnerId) {
            toast.error("Veuillez sélectionner un vainqueur pour ce match.");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await updateMatchScoreAction(match.id, p1Score, p2Score, winnerId);
            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success("Score et résultat du match mis à jour avec succès !");
                router.refresh();
                onClose();
            }
        } catch (error) {
            console.error("[EditScoreModal] Erreur:", error);
            toast.error("Une erreur inattendue est survenue.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* En-tête */}
                <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                        <div>
                            <h3 className="font-bold text-slate-100 text-lg">
                                Arbitrage : Table {match.tableNumber}
                            </h3>
                            <p className="text-xs text-slate-400">
                                Modification manuelle du score par le capitaine
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Formulaire */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Scores des deux joueurs */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Joueur 1 */}
                        <div
                            className={`p-4 rounded-xl border transition-all ${
                                winnerId === match.player1Id
                                    ? "bg-indigo-950/30 border-indigo-500/50"
                                    : "bg-slate-950/60 border-slate-800"
                            }`}
                        >
                            <label className="block text-xs font-semibold text-slate-300 truncate mb-2">
                                {p1Name}
                            </label>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleP1ScoreChange(p1Score - 1)}
                                    className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors"
                                >
                                    -
                                </button>
                                <input
                                    type="number"
                                    min="0"
                                    max="5"
                                    value={p1Score}
                                    onChange={(e) => handleP1ScoreChange(parseInt(e.target.value) || 0)}
                                    className="w-full text-center py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-bold text-lg focus:outline-none focus:border-indigo-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleP1ScoreChange(p1Score + 1)}
                                    className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Joueur 2 */}
                        <div
                            className={`p-4 rounded-xl border transition-all ${
                                winnerId === match.player2Id
                                    ? "bg-indigo-950/30 border-indigo-500/50"
                                    : "bg-slate-950/60 border-slate-800"
                            }`}
                        >
                            <label className="block text-xs font-semibold text-slate-300 truncate mb-2">
                                {p2Name}
                            </label>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={!match.player2Id}
                                    onClick={() => handleP2ScoreChange(p2Score - 1)}
                                    className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors disabled:opacity-40"
                                >
                                    -
                                </button>
                                <input
                                    type="number"
                                    min="0"
                                    max="5"
                                    disabled={!match.player2Id}
                                    value={p2Score}
                                    onChange={(e) => handleP2ScoreChange(parseInt(e.target.value) || 0)}
                                    className="w-full text-center py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-bold text-lg focus:outline-none focus:border-indigo-500 disabled:opacity-40"
                                />
                                <button
                                    type="button"
                                    disabled={!match.player2Id}
                                    onClick={() => handleP2ScoreChange(p2Score + 1)}
                                    className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors disabled:opacity-40"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Choix du Vainqueur */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Vainqueur officiel du match
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setWinnerId(match.player1Id)}
                                className={`p-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                                    winnerId === match.player1Id
                                        ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-300 ring-1 ring-emerald-500/30"
                                        : "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                                }`}
                            >
                                {winnerId === match.player1Id && (
                                    <span className="text-emerald-400">🏆</span>
                                )}
                                <span className="truncate">{p1Name}</span>
                            </button>

                            {match.player2Id ? (
                                <button
                                    type="button"
                                    onClick={() => setWinnerId(match.player2Id!)}
                                    className={`p-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                                        winnerId === match.player2Id
                                            ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-300 ring-1 ring-emerald-500/30"
                                            : "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                                    }`}
                                >
                                    {winnerId === match.player2Id && (
                                        <span className="text-emerald-400">🏆</span>
                                    )}
                                    <span className="truncate">{p2Name}</span>
                                </button>
                            ) : (
                                <div className="p-3 rounded-xl border border-dashed border-slate-800 text-xs text-slate-600 flex items-center justify-center">
                                    BYE (Aucun adversaire)
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions de validation */}
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Enregistrement...</span>
                                </>
                            ) : (
                                <span>Valider le résultat</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
