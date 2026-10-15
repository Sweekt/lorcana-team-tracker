"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createTournamentAction } from "@/actions/tournament";
import { TournamentFormat, MatchFormat } from "@/lib/tournament/types";

interface CreateTournamentModalProps {
    teamId: string;
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

export default function CreateTournamentModal({ teamId }: CreateTournamentModalProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Champs du formulaire
    const [name, setName] = useState("");
    const [format, setFormat] = useState<TournamentFormat>("SWISS");
    const [topCutSize, setTopCutSize] = useState<number>(4);
    const [matchFormat, setMatchFormat] = useState<MatchFormat>("BO3");
    const [set, setSet] = useState("Set 14");
    const [allowDeckChanges, setAllowDeckChanges] = useState(false);
    const [roundsCount, setRoundsCount] = useState<string>("");

    // Verrouillage du scroll et gestion de la touche Échap
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !isSubmitting) {
                setIsOpen(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "hidden";

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "unset";
        };
    }, [isOpen, isSubmitting]);

    const resetForm = () => {
        setName("");
        setFormat("SWISS");
        setTopCutSize(4);
        setMatchFormat("BO3");
        setSet("Set 14");
        setAllowDeckChanges(false);
        setRoundsCount("");
    };

    const handleClose = () => {
        if (isSubmitting) return;
        setIsOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const trimmedName = name.trim();
        if (!trimmedName) {
            toast.error("Veuillez saisir le nom du tournoi.");
            return;
        }

        if (trimmedName.length < 2) {
            toast.error("Le nom du tournoi doit comporter au moins 2 caractères.");
            return;
        }

        setIsSubmitting(true);

        try {
            const parsedRounds = roundsCount.trim() ? parseInt(roundsCount, 10) : null;

            const res = await createTournamentAction({
                teamId,
                name: trimmedName,
                format,
                matchFormat,
                set: set.trim() || null,
                allowDeckChanges,
                topCutSize: format === "SWISS_TOP_CUT" ? topCutSize : null,
                roundsCount: parsedRounds && !isNaN(parsedRounds) && parsedRounds > 0 ? parsedRounds : null,
            });

            if (res.error) {
                toast.error(res.error);
            } else if (res.success && res.tournamentId) {
                toast.success("Tournoi créé avec succès !");
                setIsOpen(false);
                resetForm();
                router.push(`/tournaments/${res.tournamentId}`);
                router.refresh();
            }
        } catch (error) {
            console.error("Erreur création tournoi:", error);
            toast.error("Une erreur inattendue est survenue.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            {/* Bouton d'ouverture (visible pour le capitaine/admin) */}
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all cursor-pointer"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Nouveau tournoi</span>
            </button>

            {/* Modal Dialog */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
                    onClick={handleClose}
                >
                    <div
                        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* En-tête de la modal */}
                        <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/50">
                            <div>
                                <h2 className="text-xl font-bold text-slate-100">Créer un nouveau tournoi</h2>
                                <p className="text-xs text-slate-400 mt-1">
                                    Configurez les paramètres de compétition pour votre équipe.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleClose}
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
                                    <label htmlFor="tournament-name" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                                        Nom du tournoi <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        id="tournament-name"
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="ex: Tournoi Hebdo #12, Set Championship..."
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
                                    <label htmlFor="tournament-set" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                                        Set autorisé
                                    </label>
                                    <input
                                        id="tournament-set"
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

                                {/* 5. Case à cocher "Autoriser le changement de deck" */}
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
                                                Si activé, les joueurs peuvent modifier leur decklist entre les matchs. Si désactivé, la decklist saisie lors de l'inscription est verrouillée pour toute la durée du tournoi.
                                            </p>
                                        </div>
                                    </label>
                                </div>

                                {/* 6. Option avancée : nombre de rondes personnalisé */}
                                <details className="group border-t border-slate-800/80 pt-4">
                                    <summary className="text-xs text-slate-400 hover:text-slate-300 cursor-pointer font-medium list-none flex items-center justify-between">
                                        <span>Options avancées (Nombre de rondes personnalisé)</span>
                                        <span className="text-slate-600 group-open:rotate-180 transition-transform">▼</span>
                                    </summary>
                                    <div className="mt-3">
                                        <label htmlFor="custom-rounds" className="block text-xs font-medium text-slate-400 mb-1.5">
                                            Nombre fixe de rondes suisses (optionnel)
                                        </label>
                                        <input
                                            id="custom-rounds"
                                            type="number"
                                            min={1}
                                            max={20}
                                            value={roundsCount}
                                            onChange={(e) => setRoundsCount(e.target.value)}
                                            placeholder="Calculé automatiquement par défaut"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-200 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600"
                                        />
                                        <p className="text-[11px] text-slate-500 mt-1">
                                            Par défaut, le système calcule le nombre officiel selon le nombre d'inscrits (ex: 3 rondes pour 8 joueurs).
                                        </p>
                                    </div>
                                </details>
                            </div>

                            {/* Pied de modal avec boutons */}
                            <div className="p-6 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0 bg-slate-900/50">
                                <button
                                    type="button"
                                    onClick={handleClose}
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
                                            <span>Création en cours...</span>
                                        </>
                                    ) : (
                                        <span>Créer le tournoi</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
