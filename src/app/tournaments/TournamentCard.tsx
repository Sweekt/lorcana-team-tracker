import Link from "next/link";
import { TournamentFormat, TournamentStatus, MatchFormat } from "@/lib/tournament/types";

export interface TournamentCardData {
    id: string;
    name: string;
    format: TournamentFormat | string;
    status: TournamentStatus | string;
    matchFormat: MatchFormat | string;
    set?: string | null;
    allowDeckChanges?: boolean;
    topCutSize?: number | null;
    roundsCount?: number | null;
    currentRoundNumber?: number;
    createdAt: Date | string;
    _count?: {
        participants: number;
    };
    participantsCount?: number;
}

interface TournamentCardProps {
    tournament: TournamentCardData;
}

export default function TournamentCard({ tournament }: TournamentCardProps) {
    const participantsCount = tournament.participantsCount ?? tournament._count?.participants ?? 0;

    // Libellé et style du statut
    const renderStatusBadge = () => {
        switch (tournament.status) {
            case "REGISTRATION":
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Inscriptions ouvertes
                    </span>
                );
            case "RUNNING":
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                        {tournament.currentRoundNumber && tournament.currentRoundNumber > 0
                            ? `Ronde ${tournament.currentRoundNumber} en cours`
                            : "Ronde en cours"}
                    </span>
                );
            case "TOP_CUT":
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                        {tournament.currentRoundNumber && tournament.currentRoundNumber > 0
                            ? `Top Cut (Ronde ${tournament.currentRoundNumber})`
                            : "Top Cut en cours"}
                    </span>
                );
            case "FINISHED":
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                        Terminé
                    </span>
                );
        }
    };

    // Libellé lisible du format de tournoi
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

    const formattedDate = new Date(tournament.createdAt).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });

    return (
        <Link
            href={`/tournaments/${tournament.id}`}
            className="group flex flex-col justify-between bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-0.5"
        >
            <div>
                {/* En-tête : badge de format & badge de statut */}
                <div className="flex items-center justify-between gap-3 mb-3">
                    <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700/60">
                        {formatLabel}
                    </span>
                    {renderStatusBadge()}
                </div>

                {/* Nom du tournoi */}
                <h3 className="text-xl font-bold text-slate-100 group-hover:text-indigo-400 transition-colors line-clamp-1 mb-4">
                    {tournament.name}
                </h3>

                {/* Détails et métadonnées */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-5">
                    {/* Format de match */}
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl px-3 py-2 flex flex-col">
                        <span className="text-slate-500 font-medium text-[10px] uppercase tracking-wider">Format</span>
                        <span className="text-slate-200 font-semibold mt-0.5">{tournament.matchFormat || "BO3"}</span>
                    </div>

                    {/* Set autorisé */}
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl px-3 py-2 flex flex-col">
                        <span className="text-slate-500 font-medium text-[10px] uppercase tracking-wider">Set</span>
                        <span className="text-slate-200 font-semibold mt-0.5 truncate">{tournament.set || "Tous les sets"}</span>
                    </div>
                </div>

                {/* Info participants et decklock */}
                <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                        <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <span className="font-medium">
                            {participantsCount} participant{participantsCount > 1 ? "s" : ""}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span>
                            {tournament.allowDeckChanges ? "Changement de deck libre" : "Decks verrouillés (Decklist requise)"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Pied de carte : date & lien d'action */}
            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500 mt-2">
                <span>Créé le {formattedDate}</span>
                <span className="text-indigo-400 font-medium group-hover:text-indigo-300 flex items-center gap-1 transition-colors">
                    Voir le tournoi
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </span>
            </div>
        </Link>
    );
}
