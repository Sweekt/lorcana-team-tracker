"use client";

import { useRouter } from "next/navigation";
import HistoryIcon from "@/assets/ic_history.svg"
import StatIcon from "@/assets/ic_leaderboard.svg"
import QueueSelector from "@/components/QueueSelector";
export default function PlayerViewController({
                                                 queues, currentQueue, currentTab, playerName
                                             }: {
    queues: string[]; currentQueue: string; currentTab: string; playerName: string;
}) {
    const router = useRouter();

    const update = (newQ: string, newT: string) => {
        router.push(`/player/${encodeURIComponent(playerName)}?queue=${newQ}&tab=${newT}&page=1`, { scroll: false });
    };

    return (
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">

            {/* Onglets */}
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800/80">
                <button
                    onClick={() => update(currentQueue, "history")}
                    className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2 rounded-md font-semibold text-sm transition-all ${
                        currentTab !== "stats" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
                    }`}
                >
                    <HistoryIcon className="h-4 w-4" />
                    Historique
                </button>
                <button
                    onClick={() => update(currentQueue, "stats")}
                    className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2 rounded-md font-semibold text-sm transition-all ${
                        currentTab === "stats" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
                    }`}
                >
                    <StatIcon className="h-4 w-4" />
                    Statistiques
                </button>
            </div>

            {/* Sélecteur de file */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <span className="font-semibold text-slate-400 text-xs uppercase tracking-wider">Format</span>
                {queues.length > 0 ? (
                    <QueueSelector queues={queues} currentQueue={currentQueue} />
                ) : (
                    <span className="text-slate-500 italic text-xs">Aucun format actif</span>
                )}
            </div>

        </div>
    );
}