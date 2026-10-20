"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateTournamentAction } from "@/actions/tournament";
import { TournamentFormat, MatchFormat } from "@/lib/tournament/types";
import { TournamentDetailData } from "./types";

interface EditTournamentModalProps {
    tournament: TournamentDetailData;
    isOpen: boolean;
    onClose: () => void;
}

const FORMAT_OPTIONS: {
    id: TournamentFormat;
    name: string;
    description: string;
    badge?: string;
}[] = [
    {
        id: "SWISS",
        name: "Rondes Suisses",
        description: "Appariements équilibrés par score. Chaque joueur dispute toutes les rondes.",
        badge: "Classique",
    },
    {
        id: "SWISS_TOP_CUT",
        name: "Suisse + Top Cut",
        description: "Rondes suisses de qualification suivies d'une phase finale à élimination directe.",
        badge: "Compétitif",
    },
    {
        id: "SINGLE_ELIMINATION",
        name: "Élimination Directe",
        description: "Tableau classique par élimination. Chaque défaite est éliminatoire.",
    },
    {
        id: "ROUND_ROBIN",
        name: "Toutes Rondes",
        description: "Chaque joueur affronte individuellement l'ensemble des participants.",
    },
];

const SET_PRESETS = ["Set 14", "Set 13", "Set 12", "Tous les sets"];

export default function EditTournamentModal({
    tournament,
    isOpen,
    onClose,
}: EditTournamentModalProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Champs du formulaire
    const [name, setName] = useState(tournament.name);
    const [format, setFormat] = useState<TournamentFormat>(tournament.format);
    const [topCutSize, setTopCutSize] = useState<number>(tournament.topCutSize || 4);
    const [matchFormat, setMatchFormat] = useState<MatchFormat>(tournament.matchFormat);
    const [set, setSet] = useState(tournament.set || "Tous les sets");
    const [allowDeckChanges, setAllowDeckChanges] = useState(tournament.allowDeckChanges);
    const [roundsCount, setRoundsCount] = useState<string>(
        tournament.roundsCount ? String(tournament.roundsCount) : ""
    );

    // Réinitialiser les champs à l'ouverture avec les valeurs du tournoi
    useEffect(() => {
        if (isOpen) {
            setName(tournament.name);
            setFormat(tournament.format);
            setTopCutSize(tournament.topCutSize || 4);
            setMatchFormat(tournament.matchFormat);
            setSet(tournament.set || "Tous les sets");
            setAllowDeckChanges(tournament.allowDeckChanges);
            setRoundsCount(tournament.roundsCount ? String(tournament.roundsCount) : "");
        }
    }, [isOpen, tournament]);

    // Verrouillage du scroll et gestion de la touche Échap
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !isSubmitting) {
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "hidden";

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "unset";
        };
    }, [isOpen, isSubmitting, onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const trimmedName = name.trim();
        if (!trimmedName) {
            toast.error("Veuillez saisir le nom du tournoi.");
            return;
        }

        setIsSubmitting(true);

        try {
            const parsedRounds = roundsCount.trim() ? parseInt(roundsCount, 10) : null;

            const res = await updateTournamentAction(tournament.id, {
                name: trimmedName,
                format,
                matchFormat,
                set: set.trim() === "Tous les sets" || !set.trim() ? null : set.trim(),
                allowDeckChanges,
                topCutSize: format === "SWISS_TOP_CUT" ? topCutSize : null,
                roundsCount: parsedRounds && !isNaN(parsedRounds) && parsedRounds > 0 ? parsedRounds : null,
            });

            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success("Paramètres du tournoi mis à jour !");
                onClose();
                router.refresh();
            }
        } catch (error) {
            console.error("Erreur modification tournoi:", error);
            toast.error("Une erreur inattendue est survenue.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* En-tête de la modal */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-100">Modifier le tournoi</h2>
                        <p className="text-xs text-slate-400 mt-1">
                            Ajustez le format et les règles de compétition pendant la phase d'inscriptions.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
                        aria-label="Fermer"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Corps du formulaire défilant */}
                <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden grow">
                    <div className="p-6 overflow-y-auto space-y-6 grow bg-slate-950/30">
                        {/* 1. Nom du tournoi */}
                        <div>
                            <label htmlFor="edit-tournament-name" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                                Nom du tournoi <span className="text-red-400">*</span>
                            </label>
                            <input
                                id="edit-tournament-name"
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="ex: Tournoi Hebdo #12..."
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600"
                            />
                        </div>

                        {/* 2. Choix du format (Radio Cards) */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                                Format de compétition
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {FORMAT_OPTIONS.map((opt) => {
                                    const isSelected = format === opt.id;
                                    return (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setFormat(opt.id)}
                                            className={`p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                                                isSelected
                                                    ? "bg-indigo-600/10 border-indigo-500 ring-1 ring-indigo-500 shadow-sm"
                                                    : "bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60"
                                            }`}
                                        >
                                            <div>
                                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                                    <span className={`font-bold text-sm ${isSelected ? "text-indigo-300" : "text-slate-200"}`}>
                                                        {opt.name}
                                                    </span>
                                                    {opt.badge && (
                                                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                                                            {opt.badge}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-400 leading-relaxed">
                                                    {opt.description}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 2bis. Sélecteur Top-Cut si SWISS_TOP_CUT */}
                        {format === "SWISS_TOP_CUT" && (
                            <div className="bg-indigo-950/20 border border-indigo-800/40 rounded-xl p-4 space-y-3">
                                <label className="block text-xs font-bold uppercase tracking-wider text-indigo-300">
                                    Taille du Top Cut (Phase Finale)
                                </label>
                                <p className="text-xs text-slate-400">
                                    Nombre de joueurs qualifiés pour les phases éliminatoires à l'issue des rondes suisses.
                                </p>
                                <div className="flex items-center gap-3">
                                    {[2, 4, 8].map((size) => {
                                        const isSelected = topCutSize === size;
                                        return (
                                            <button
                                                key={size}
                                                type="button"
                                                onClick={() => setTopCutSize(size)}
                                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                                                    isSelected
                                                        ? "bg-indigo-600 text-white border-indigo-500 shadow-xs"
                                                        : "bg-slate-950/70 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
                                                }`}
                                            >
                                                Top {size}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 3. Format de match (BO1 vs BO3) */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                                Format des matchs
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setMatchFormat("BO3")}
                                    className={`p-3 rounded-xl border text-left transition-all ${
                                        matchFormat === "BO3"
                                            ? "bg-indigo-600/10 border-indigo-500 ring-1 ring-indigo-500"
                                            : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className={`font-bold text-sm ${matchFormat === "BO3" ? "text-indigo-300" : "text-slate-200"}`}>
                                            BO3
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-medium">Recommandé</span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">Au meilleur des 3 manches</p>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setMatchFormat("BO1")}
                                    className={`p-3 rounded-xl border text-left transition-all ${
                                        matchFormat === "BO1"
                                            ? "bg-indigo-600/10 border-indigo-500 ring-1 ring-indigo-500"
                                            : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                                    }`}
                                >
                                    <span className={`font-bold text-sm ${matchFormat === "BO1" ? "text-indigo-300" : "text-slate-200"}`}>
                                        BO1
                                    </span>
                                    <p className="text-xs text-slate-400 mt-1">Manche unique rapide</p>
                                </button>
                            </div>
                        </div>

                        {/* 4. Set autorisé */}
                        <div>
                            <label htmlFor="edit-tournament-set" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                                Set autorisé
                            </label>
                            <input
                                id="edit-tournament-set"
                                type="text"
                                value={set}
                                onChange={(e) => setSet(e.target.value)}
                                placeholder="ex: Set 14, Core..."
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600 mb-2"
                            />
                            <div className="flex flex-wrap gap-2">
                                {SET_PRESETS.map((preset) => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => setSet(preset === "Tous les sets" ? "" : preset)}
                                        className={`text-[11px] font-medium px-2.5 py-1 rounded-md border transition-colors ${
                                            (set === preset || (preset === "Tous les sets" && !set))
                                                ? "bg-slate-800 text-slate-200 border-slate-700"
                                                : "bg-slate-950/50 text-slate-500 border-slate-800/80 hover:text-slate-300 hover:border-slate-700"
                                        }`}
                                    >
                                        {preset}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 5. Changement de deck libre */}
                        <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={allowDeckChanges}
                                    onChange={(e) => setAllowDeckChanges(e.target.checked)}
                                    className="mt-0.5 w-4 h-4 rounded-sm bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-950"
                                />
                                <div>
                                    <span className="text-sm font-semibold text-slate-200">
                                        Autoriser le changement de deck
                                    </span>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Si activé, les joueurs peuvent changer de deck entre les matchs. Si désactivé, le deck joué au premier match est verrouillé pour tout le tournoi.
                                    </p>
                                </div>
                            </label>
                        </div>

                        {/* 6. Option avancée : nombre de rondes */}
                        <details className="group border-t border-slate-800/80 pt-4">
                            <summary className="text-xs text-slate-400 hover:text-slate-300 cursor-pointer font-medium list-none flex items-center justify-between">
                                <span>Options avancées (Nombre de rondes personnalisé)</span>
                                <span className="text-slate-600 group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <div className="mt-3">
                                <label htmlFor="edit-custom-rounds" className="block text-xs font-medium text-slate-400 mb-1.5">
                                    Nombre fixe de rondes suisses (optionnel)
                                </label>
                                <input
                                    id="edit-custom-rounds"
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={roundsCount}
                                    onChange={(e) => setRoundsCount(e.target.value)}
                                    placeholder="Calculé automatiquement par défaut"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-200 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600"
                                />
                                <p className="text-[11px] text-slate-500 mt-1">
                                    Par défaut, calculé selon le nombre de participants.
                                </p>
                            </div>
                        </details>
                    </div>

                    {/* Pied de modal avec boutons */}
                    <div className="p-6 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0 bg-slate-900/50">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-50"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                    <span>Enregistrement...</span>
                                </>
                            ) : (
                                <span>Enregistrer les modifications</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
