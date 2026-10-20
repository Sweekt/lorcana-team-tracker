"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    joinTournamentAction,
    leaveTournamentAction,
    startTournamentAction,
    nextRoundAction,
    dropTournamentAction,
} from "@/actions/tournament";
import { TournamentDetailData } from "./types";

interface TournamentHeaderProps {
    tournament: TournamentDetailData;
    currentUserId: string;
    isAdmin: boolean;
    hasDuelsAccount: boolean;
}

export default function TournamentHeader({
    tournament,
    currentUserId,
    isAdmin,
    hasDuelsAccount,
}: TournamentHeaderProps) {
    const router = useRouter();

    const [isJoining, setIsJoining] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [isNextRound, setIsNextRound] = useState(false);
    const [isDropping, setIsDropping] = useState(false);

    // Modales de confirmation
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [showDropConfirm, setShowDropConfirm] = useState(false);

    const userParticipant = tournament.participants.find((p) => p.userId === currentUserId);
    const isRegistered = Boolean(userParticipant);
    const isDropped = Boolean(userParticipant?.dropped);

    const activeParticipants = tournament.participants.filter((p) => !p.dropped);
    const currentRound = tournament.rounds.find((r) => r.roundNumber === tournament.currentRoundNumber);
    const currentRoundMatches = currentRound?.matches || [];
    const unfinishedMatchesCount = currentRoundMatches.filter((m) => m.status !== "FINISHED").length;
    const canLaunchNextRound = currentRoundMatches.length > 0 && unfinishedMatchesCount === 0;

    // Statut format lisible
    const formatLabel = (() => {
        switch (tournament.format) {
            case "SWISS":
                return "Rondes Suisses";
            case "SWISS_TOP_CUT":
                return `Suisse + Top ${tournament.topCutSize || 4}`;
            case "SINGLE_ELIMINATION":
                return "Élimination Directe";
            case "ROUND_ROBIN":
                return "Toutes Rondes";
            default:
                return tournament.format;
        }
    })();

    // Inscription au tournoi
    const handleJoinTournament = async () => {
        if (!hasDuelsAccount) {
            toast.error(
                "Vous devez connecter votre compte Duels.ink dans vos paramètres avant de rejoindre le tournoi."
            );
            return;
        }

        setIsJoining(true);
        try {
            const res = await joinTournamentAction(tournament.id);

            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success("Vous êtes maintenant inscrit au tournoi !");
                router.refresh();
            }
        } catch (error) {
            console.error("[TournamentHeader] Erreur join:", error);
            toast.error("Erreur lors de l’inscription.");
        } finally {
            setIsJoining(false);
        }
    };

    // Désinscription (en phase d'inscription)
    const handleLeaveTournament = async () => {
        setIsLeaving(true);
        try {
            const res = await leaveTournamentAction(tournament.id);
            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success("Vous vous êtes désinscrit du tournoi.");
                setShowLeaveConfirm(false);
                router.refresh();
            }
        } catch (error) {
            console.error("[TournamentHeader] Erreur leave:", error);
            toast.error("Erreur lors de la désinscription.");
        } finally {
            setIsLeaving(false);
        }
    };

    // Abandon (en cours de tournoi)
    const handleDropTournament = async () => {
        if (!userParticipant) return;
        setIsDropping(true);
        try {
            const res = await dropTournamentAction(tournament.id, userParticipant.id);
            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success("Votre abandon a été enregistré.");
                setShowDropConfirm(false);
                router.refresh();
            }
        } catch (error) {
            console.error("[TournamentHeader] Erreur drop:", error);
            toast.error("Erreur lors de l’abandon.");
        } finally {
            setIsDropping(false);
        }
    };

    // Lancer le tournoi
    const handleStartTournament = async () => {
        setIsStarting(true);
        try {
            const res = await startTournamentAction(tournament.id);
            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success("Le tournoi est lancé ! Les tables de la Ronde 1 ont été générées.");
                router.refresh();
            }
        } catch (error) {
            console.error("[TournamentHeader] Erreur start:", error);
            toast.error("Erreur lors du lancement du tournoi.");
        } finally {
            setIsStarting(false);
        }
    };

    // Lancer la ronde suivante
    const handleNextRound = async () => {
        setIsNextRound(true);
        try {
            const res = await nextRoundAction(tournament.id);
            if (res.error) {
                toast.error(res.error);
            } else {
                if (res.finished) {
                    toast.success("Le tournoi est désormais officiellement terminé !");
                } else {
                    toast.success(`La ronde ${res.roundNumber} est lancée !`);
                }
                router.refresh();
            }
        } catch (error) {
            console.error("[TournamentHeader] Erreur next round:", error);
            toast.error("Erreur lors de la transition de ronde.");
        } finally {
            setIsNextRound(false);
        }
    };

    const isRegistration = tournament.status === "REGISTRATION";
    const isRunning = tournament.status === "RUNNING";
    const isTopCut = tournament.status === "TOP_CUT";
    const isFinished = tournament.status === "FINISHED";

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl mb-8 relative overflow-hidden">
            {/* Effet d'arrière-plan discret */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Lien retour & Équipe */}
            <div className="flex items-center justify-between gap-4 mb-4">
                <Link
                    href="/tournaments"
                    className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-indigo-400 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span>Tournois de {tournament.team.name}</span>
                </Link>

                {/* Badge de statut principal */}
                <div>
                    {isRegistration && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            Inscriptions ouvertes
                        </span>
                    )}
                    {isRunning && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-xs">
                            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                            Ronde {tournament.currentRoundNumber} en cours
                        </span>
                    )}
                    {isTopCut && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-xs">
                            <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                            Top Cut (Ronde {tournament.currentRoundNumber})
                        </span>
                    )}
                    {isFinished && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            🏆 Tournoi terminé
                        </span>
                    )}
                </div>
            </div>

            {/* Titre et détails */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-black text-slate-100 tracking-tight mb-3">
                        {tournament.name}
                    </h1>

                    {/* Ligne de badges de configuration */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="px-3 py-1 rounded-lg bg-slate-800 text-slate-200 font-semibold border border-slate-700/80">
                            {formatLabel}
                        </span>
                        <span className="px-3 py-1 rounded-lg bg-slate-800/80 text-slate-300 font-medium border border-slate-700/60">
                            Format {tournament.matchFormat}
                        </span>
                        <span className="px-3 py-1 rounded-lg bg-slate-800/80 text-slate-300 font-medium border border-slate-700/60">
                            {tournament.set || "Tous les sets"}
                        </span>
                        <span className="px-3 py-1 rounded-lg bg-slate-800/80 text-slate-300 font-medium border border-slate-700/60">
                            {tournament.allowDeckChanges ? "Changement de deck libre" : "Decks verrouillés"}
                        </span>
                        <span className="px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 font-semibold border border-indigo-500/20">
                            {tournament.participants.length} participant{tournament.participants.length > 1 ? "s" : ""}
                        </span>
                    </div>
                </div>

                {/* Actions principales */}
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                    {/* Phase d'inscriptions */}
                    {isRegistration && (
                        <>
                            {!isRegistered ? (
                                <button
                                    type="button"
                                    onClick={handleJoinTournament}
                                    disabled={isJoining}
                                    className="px-5 py-2.5 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isJoining ? (
                                        <>
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Inscription...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                            </svg>
                                            <span>Rejoindre le tournoi</span>
                                        </>
                                    )}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setShowLeaveConfirm(true)}
                                    disabled={isLeaving}
                                    className="px-4 py-2.5 rounded-xl font-semibold text-sm bg-slate-800 hover:bg-rose-500/10 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 transition-all disabled:opacity-50"
                                >
                                    Se désinscrire
                                </button>
                            )}

                            {/* Bouton Capitaine : Lancer le tournoi */}
                            {isAdmin && (
                                <button
                                    type="button"
                                    onClick={handleStartTournament}
                                    disabled={isStarting || activeParticipants.length < 2}
                                    className="px-5 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none flex items-center gap-2"
                                >
                                    {isStarting ? (
                                        <>
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Génération des matchs...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span>Lancer le tournoi</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </>
                    )}

                    {/* Phase de jeu active (RUNNING ou TOP_CUT) */}
                    {(isRunning || isTopCut) && (
                        <>
                            {/* Capitaine : Ronde suivante */}
                            {isAdmin && (
                                <button
                                    type="button"
                                    onClick={handleNextRound}
                                    disabled={isNextRound || !canLaunchNextRound}
                                    className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg ${
                                        canLaunchNextRound
                                            ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 ring-2 ring-indigo-400/40"
                                            : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed shadow-none"
                                    }`}
                                >
                                    {isNextRound ? (
                                        <>
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Génération de la ronde...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                            </svg>
                                            <span>
                                                {canLaunchNextRound
                                                    ? isTopCut
                                                        ? "Ronde Top-Cut suivante"
                                                        : "Lancer la ronde suivante"
                                                    : `En attente (${unfinishedMatchesCount} match${unfinishedMatchesCount > 1 ? "s" : ""})`}
                                            </span>
                                        </>
                                    )}
                                </button>
                            )}

                            {/* Participant actif : Abandonner */}
                            {isRegistered && !isDropped && (
                                <button
                                    type="button"
                                    onClick={() => setShowDropConfirm(true)}
                                    disabled={isDropping}
                                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/20 transition-all"
                                >
                                    Abandonner (Drop)
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Alerte si le joueur n'a pas connecté Duels.ink */}
            {!hasDuelsAccount && isRegistration && (
                <div className="mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-300">
                    <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                        <p className="font-semibold text-amber-200">Compte Duels.ink requis</p>
                        <p className="mt-0.5 text-amber-300/80 leading-relaxed">
                            Pour vous inscrire et disputer les matchs de ce tournoi, vous devez synchroniser votre compte Duels.ink dans vos{" "}
                            <Link href="/settings" className="underline font-bold text-amber-200 hover:text-white">
                                Paramètres de profil
                            </Link>.
                        </p>
                    </div>
                </div>
            )}

            {/* Modal de désinscription */}
            {showLeaveConfirm && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
                    onClick={() => setShowLeaveConfirm(false)}
                >
                    <div
                        className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h4 className="text-lg font-bold text-slate-100 mb-2">
                            Quitter le tournoi ?
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed mb-6">
                            Vous retirerez votre inscription au tournoi. Vous pourrez vous réinscrire tant que les inscriptions sont ouvertes.
                        </p>
                        <div className="flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowLeaveConfirm(false)}
                                className="px-3.5 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200"
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={handleLeaveTournament}
                                disabled={isLeaving}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors disabled:opacity-50"
                            >
                                {isLeaving ? "Désinscription..." : "Confirmer"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal d'abandon en cours de tournoi */}
            {showDropConfirm && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
                    onClick={() => setShowDropConfirm(false)}
                >
                    <div
                        className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h4 className="text-lg font-bold text-slate-100 mb-2">
                            Confirmer votre abandon ?
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed mb-6">
                            Êtes-vous certain de vouloir abandonner le tournoi ? Vos matchs en cours de cette ronde seront déclarés forfaits et vous ne serez plus apparié dans les rondes suivantes.
                        </p>
                        <div className="flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowDropConfirm(false)}
                                className="px-3.5 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200"
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={handleDropTournament}
                                disabled={isDropping}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors disabled:opacity-50"
                            >
                                {isDropping ? "En cours..." : "Confirmer l’abandon"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
