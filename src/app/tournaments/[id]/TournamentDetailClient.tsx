"use client";

import { useState } from "react";
import TournamentHeader from "./TournamentHeader";
import RoundsView from "./RoundsView";
import StandingsView from "./StandingsView";
import HistoryView from "./HistoryView";
import StatsView from "./StatsView";
import EditScoreModal from "./EditScoreModal";
import DecklistModal from "./DecklistModal";
import DuelIcon from "@/assets/ic_duel.svg";
import LeaderboardIcon from "@/assets/ic_leaderboard.svg";
import HistoryIcon from "@/assets/ic_history.svg";
import GraphIcon from "@/assets/ic_graph.svg";
import {
    TournamentDetailData,
    TournamentDetailMatch,
} from "./types";
import { StandingRow, TournamentStatsResult } from "@/lib/tournament/types";

interface TournamentDetailClientProps {
    tournament: TournamentDetailData;
    standings: StandingRow[];
    stats: TournamentStatsResult;
    currentUserId: string;
    isAdmin: boolean;
    hasDuelsAccount: boolean;
}

type TabType = "rounds" | "standings" | "history" | "stats";

export default function TournamentDetailClient({
    tournament,
    standings,
    stats,
    currentUserId,
    isAdmin,
    hasDuelsAccount,
}: TournamentDetailClientProps) {
    const [activeTab, setActiveTab] = useState<TabType>("rounds");

    // État du modal d'édition de score (capitaine)
    const [editScoreMatch, setEditScoreMatch] = useState<TournamentDetailMatch | null>(null);

    // État du modal de decklist
    const [decklistModal, setDecklistModal] = useState<{
        isOpen: boolean;
        playerName: string;
        decklist: string | null;
        deckColors?: string[];
    }>({
        isOpen: false,
        playerName: "",
        decklist: null,
        deckColors: [],
    });

    const handleOpenEditScore = (match: TournamentDetailMatch) => {
        setEditScoreMatch(match);
    };

    const handleOpenDecklist = (
        playerName: string,
        decklist: string | null,
        deckColors?: string[]
    ) => {
        setDecklistModal({
            isOpen: true,
            playerName,
            decklist,
            deckColors,
        });
    };

    const activeRound = tournament.rounds.find(
        (r) => r.roundNumber === tournament.currentRoundNumber
    );
    const activeRoundUnfinishedCount =
        activeRound?.matches.filter((m) => m.status !== "FINISHED").length || 0;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                {/* En-tête du tournoi */}
                <TournamentHeader
                    tournament={tournament}
                    currentUserId={currentUserId}
                    isAdmin={isAdmin}
                    hasDuelsAccount={hasDuelsAccount}
                />

                {/* Barre de navigation par onglets (4 Vues Dynamiques) */}
                <div className="flex items-center gap-2 border-b border-slate-800 pb-px mb-8 overflow-x-auto scrollbar-none">
                    {/* Onglet 1 : Ronde & Matchs */}
                    <button
                        type="button"
                        onClick={() => setActiveTab("rounds")}
                        className={`group flex items-center gap-2.5 px-5 py-3 rounded-t-2xl font-bold text-xs sm:text-sm transition-all border-b-2 whitespace-nowrap ${
                            activeTab === "rounds"
                                ? "border-indigo-500 text-indigo-400 bg-slate-900/60"
                                : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30"
                        }`}
                    >
                        <DuelIcon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                        <span>Ronde & Matchs</span>
                        {activeRoundUnfinishedCount > 0 && (
                            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                                {activeRoundUnfinishedCount} en cours
                            </span>
                        )}
                    </button>

                    {/* Onglet 2 : Classement */}
                    <button
                        type="button"
                        onClick={() => setActiveTab("standings")}
                        className={`group flex items-center gap-2.5 px-5 py-3 rounded-t-2xl font-bold text-xs sm:text-sm transition-all border-b-2 whitespace-nowrap ${
                            activeTab === "standings"
                                ? "border-indigo-500 text-indigo-400 bg-slate-900/60"
                                : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30"
                        }`}
                    >
                        <LeaderboardIcon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                        <span>Classement</span>
                        {standings.length > 0 && (
                            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                {standings.length}
                            </span>
                        )}
                    </button>

                    {/* Onglet 3 : Historique des Matchs */}
                    <button
                        type="button"
                        onClick={() => setActiveTab("history")}
                        className={`group flex items-center gap-2.5 px-5 py-3 rounded-t-2xl font-bold text-xs sm:text-sm transition-all border-b-2 whitespace-nowrap ${
                            activeTab === "history"
                                ? "border-indigo-500 text-indigo-400 bg-slate-900/60"
                                : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30"
                        }`}
                    >
                        <HistoryIcon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                        <span>Historique</span>
                        {tournament.rounds.length > 0 && (
                            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                {tournament.rounds.length} {tournament.rounds.length > 1 ? "rondes" : "ronde"}
                            </span>
                        )}
                    </button>

                    {/* Onglet 4 : Statistiques */}
                    <button
                        type="button"
                        onClick={() => setActiveTab("stats")}
                        className={`group flex items-center gap-2.5 px-5 py-3 rounded-t-2xl font-bold text-xs sm:text-sm transition-all border-b-2 whitespace-nowrap ${
                            activeTab === "stats"
                                ? "border-indigo-500 text-indigo-400 bg-slate-900/60"
                                : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30"
                        }`}
                    >
                        <GraphIcon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                        <span>Statistiques</span>
                        {stats.inkCombos.length > 0 && (
                            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                {stats.inkCombos.length} decks
                            </span>
                        )}
                    </button>
                </div>

                {/* Contenu de la vue active */}
                <div className="transition-all duration-200">
                    {activeTab === "rounds" && (
                        <RoundsView
                            tournament={tournament}
                            currentUserId={currentUserId}
                            isAdmin={isAdmin}
                            onEditScore={handleOpenEditScore}
                            onViewDecklist={handleOpenDecklist}
                        />
                    )}

                    {activeTab === "standings" && (
                        <StandingsView
                            standings={standings}
                            participants={tournament.participants}
                            currentUserId={currentUserId}
                        />
                    )}

                    {activeTab === "history" && (
                        <HistoryView
                            rounds={tournament.rounds}
                            onViewDecklist={handleOpenDecklist}
                        />
                    )}

                    {activeTab === "stats" && <StatsView stats={stats} />}
                </div>
            </div>

            {/* Modal d'édition de score pour le capitaine */}
            {editScoreMatch && (
                <EditScoreModal
                    key={editScoreMatch.id}
                    isOpen={true}
                    onClose={() => setEditScoreMatch(null)}
                    match={editScoreMatch}
                />
            )}

            {/* Modal d'inspection de decklist */}
            <DecklistModal
                isOpen={decklistModal.isOpen}
                onClose={() =>
                    setDecklistModal({
                        isOpen: false,
                        playerName: "",
                        decklist: null,
                        deckColors: [],
                    })
                }
                playerName={decklistModal.playerName}
                decklist={decklistModal.decklist}
                deckColors={decklistModal.deckColors}
            />
        </div>
    );
}
