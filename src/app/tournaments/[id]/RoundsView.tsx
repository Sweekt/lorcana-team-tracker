"use client";

import { useState } from "react";
import MatchCard from "./MatchCard";
import ColorDots from "@/components/ColorDots";
import { toast } from "sonner";
import { kickParticipantAction } from "@/actions/tournament";
import { useRouter } from "next/navigation";
import {
    TournamentDetailData,
    TournamentDetailMatch,
    TournamentDetailParticipant,
} from "./types";

interface RoundsViewProps {
    tournament: TournamentDetailData;
    currentUserId: string;
    isAdmin: boolean;
    onEditScore?: (match: TournamentDetailMatch) => void;
    onViewDecklist?: (playerName: string, decklist: string | null, deckColors?: string[]) => void;
}

export default function RoundsView({
    tournament,
    currentUserId,
    isAdmin,
    onEditScore,
    onViewDecklist,
}: RoundsViewProps) {
    const router = useRouter();
    const [selectedRoundNumber, setSelectedRoundNumber] = useState<number>(
        tournament.currentRoundNumber > 0 ? tournament.currentRoundNumber : 1
    );
    const [viewMode, setViewMode] = useState<"tables" | "bracket">("tables");
    const [kickingId, setKickingId] = useState<string | null>(null);

    const isRegistration = tournament.status === "REGISTRATION";
    const hasRounds = tournament.rounds && tournament.rounds.length > 0;

    const isEliminationOrTopCut =
        tournament.format === "SINGLE_ELIMINATION" ||
        tournament.status === "TOP_CUT" ||
        tournament.rounds.some((r) => r.isTopCut);

    const activeRound =
        tournament.rounds.find((r) => r.roundNumber === selectedRoundNumber) ||
        tournament.rounds[tournament.rounds.length - 1];

    const handleKick = async (participantId: string, name: string) => {
        if (!confirm(`Confirmer l'expulsion de ${name} du tournoi ?`)) return;
        setKickingId(participantId);
        try {
            const res = await kickParticipantAction(tournament.id, participantId);
            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success(`${name} a été retiré du tournoi.`);
                router.refresh();
            }
        } catch (error) {
            console.error("[RoundsView] Erreur kick:", error);
            toast.error("Erreur lors de l'expulsion.");
        } finally {
            setKickingId(null);
        }
    };

    // Si tournoi en phase d'inscription : affichage des participants inscrits
    if (isRegistration || !hasRounds) {
        return (
            <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
                        <div>
                            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                                <span>Participants Inscrits</span>
                                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-bold text-xs border border-indigo-500/20">
                                    {tournament.participants.length}
                                </span>
                            </h2>
                            <p className="text-xs text-slate-400 mt-1">
                                Les appariements de la Ronde 1 seront générés dès que le capitaine lancera le tournoi.
                            </p>
                        </div>

                        {isAdmin && tournament.participants.length >= 2 && (
                            <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                                Prêt à démarrer (minimum 2 joueurs atteint)
                            </span>
                        )}
                    </div>

                    {tournament.participants.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
                            <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mb-3 text-slate-400">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <p className="text-sm font-semibold text-slate-300">Aucun joueur inscrit pour le moment</p>
                            <p className="text-xs text-slate-500 mt-1">Les membres de l'équipe peuvent rejoindre le tournoi ci-dessus.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {tournament.participants.map((p, idx) => {
                                const name = p.user?.name || `Joueur #${p.seed || idx + 1}`;
                                const hasDeck = Boolean(p.officialDecklist);
                                const isSelf = p.userId === currentUserId;

                                return (
                                    <div
                                        key={p.id}
                                        className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                                            isSelf
                                                ? "bg-indigo-950/20 border-indigo-500/40 ring-1 ring-indigo-500/20"
                                                : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="relative shrink-0">
                                                {p.user?.image ? (
                                                    <img
                                                        src={p.user.image}
                                                        alt={name}
                                                        className="w-9 h-9 rounded-full object-cover border border-slate-700"
                                                    />
                                                ) : (
                                                    <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-300">
                                                        {name.slice(0, 2).toUpperCase()}
                                                    </div>
                                                )}
                                                <span className="absolute -top-1 -left-1 px-1.5 py-0.2 rounded-md bg-slate-900 border border-slate-700 text-[9px] font-mono font-bold text-slate-400">
                                                    #{idx + 1}
                                                </span>
                                            </div>

                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-slate-200 truncate flex items-center gap-1.5">
                                                    <span>{name}</span>
                                                    {isSelf && (
                                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-semibold">
                                                            Moi
                                                        </span>
                                                    )}
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    {p.officialDeckColors && p.officialDeckColors.length > 0 ? (
                                                        <ColorDots colors={p.officialDeckColors.join(" / ")} />
                                                    ) : hasDeck ? (
                                                        <span className="text-[10px] text-emerald-400 font-medium">Deck enregistré</span>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-500">Pas de decklist</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions capitaine : Kick */}
                                        {isAdmin && !isSelf && (
                                            <button
                                                type="button"
                                                onClick={() => handleKick(p.id, name)}
                                                disabled={kickingId === p.id}
                                                title="Exclure ce joueur"
                                                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0 disabled:opacity-50"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Barre de sélection de ronde & bascule Bracket / Tables */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4">
                {/* Boutons des rondes */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                    {tournament.rounds.map((round) => {
                        const isActive = round.roundNumber === selectedRoundNumber;
                        const isCurrentActiveRound = round.roundNumber === tournament.currentRoundNumber;
                        const allFinished = round.matches.every((m) => m.status === "FINISHED");

                        return (
                            <button
                                key={round.id}
                                type="button"
                                onClick={() => setSelectedRoundNumber(round.roundNumber)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                                    isActive
                                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                                        : "bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800"
                                }`}
                            >
                                <span>
                                    {round.isTopCut ? `Top Cut (R${round.roundNumber})` : `Ronde ${round.roundNumber}`}
                                </span>
                                {isCurrentActiveRound && (
                                    <span
                                        className={`w-2 h-2 rounded-full ${
                                            allFinished ? "bg-emerald-400" : "bg-sky-400 animate-pulse"
                                        }`}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Bascule Vue Tables / Arbre pour élimination directe ou Top Cut */}
                {isEliminationOrTopCut && (
                    <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
                        <button
                            type="button"
                            onClick={() => setViewMode("tables")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                viewMode === "tables"
                                    ? "bg-slate-800 text-slate-100 shadow-xs"
                                    : "text-slate-400 hover:text-slate-200"
                            }`}
                        >
                            Tables de match
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("bracket")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                viewMode === "bracket"
                                    ? "bg-indigo-600 text-white shadow-xs"
                                    : "text-slate-400 hover:text-slate-200"
                            }`}
                        >
                            Arbre du tournoi
                        </button>
                    </div>
                )}
            </div>

            {/* Vue Bracket (Arbre éliminatoire) */}
            {viewMode === "bracket" && isEliminationOrTopCut ? (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 overflow-x-auto">
                    <h3 className="text-base font-bold text-slate-200 mb-6 flex items-center gap-2">
                        <span>Tableau à Élimination Directe</span>
                    </h3>

                    <div className="flex items-start gap-8 min-w-[700px] py-4">
                        {tournament.rounds
                            .filter((r) => tournament.format === "SINGLE_ELIMINATION" || r.isTopCut)
                            .map((round) => (
                                <div key={round.id} className="flex-1 flex flex-col gap-4">
                                    <div className="text-center pb-2 border-b border-slate-800">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            {round.matches.length === 1
                                                ? "Finale"
                                                : round.matches.length === 2
                                                ? "Demi-Finales"
                                                : `Ronde ${round.roundNumber}`}
                                        </span>
                                    </div>

                                    <div className="flex flex-col justify-around gap-6 grow">
                                        {round.matches.map((match) => (
                                            <div
                                                key={match.id}
                                                className={`bg-slate-950 border rounded-xl p-3 text-xs shadow-sm transition-all ${
                                                    match.status === "FINISHED"
                                                        ? "border-slate-800"
                                                        : "border-sky-500/40 ring-1 ring-sky-500/20"
                                                }`}
                                            >
                                                <div className="flex items-center justify-between font-mono text-[10px] text-slate-500 mb-2">
                                                    <span>Table {match.tableNumber}</span>
                                                    <span>{match.status}</span>
                                                </div>

                                                {/* P1 */}
                                                <div
                                                    className={`flex items-center justify-between p-1.5 rounded-lg mb-1 ${
                                                        match.winnerId === match.player1Id
                                                            ? "bg-emerald-500/10 text-emerald-300 font-bold"
                                                            : "text-slate-300"
                                                    }`}
                                                >
                                                    <span className="truncate max-w-[120px]">
                                                        {match.player1?.user?.name || "Joueur 1"}
                                                    </span>
                                                    <span className="font-mono font-black">{match.player1Score}</span>
                                                </div>

                                                {/* P2 */}
                                                <div
                                                    className={`flex items-center justify-between p-1.5 rounded-lg ${
                                                        match.winnerId === match.player2Id
                                                            ? "bg-emerald-500/10 text-emerald-300 font-bold"
                                                            : match.isBye
                                                            ? "text-slate-600 italic"
                                                            : "text-slate-300"
                                                    }`}
                                                >
                                                    <span className="truncate max-w-[120px]">
                                                        {match.isBye ? "BYE" : match.player2?.user?.name || "En attente"}
                                                    </span>
                                                    <span className="font-mono font-black">{match.player2Score}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            ) : (
                /* Vue normale : Tables de la ronde sélectionnée */
                <div className="space-y-4">
                    {activeRound && activeRound.matches.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                            {activeRound.matches.map((match) => (
                                <MatchCard
                                    key={match.id}
                                    match={match}
                                    currentUserId={currentUserId}
                                    isAdmin={isAdmin}
                                    tournamentId={tournament.id}
                                    onEditScore={onEditScore}
                                    onViewDecklist={onViewDecklist}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
                            <p className="font-medium text-sm text-slate-400">Aucun match dans cette ronde.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
