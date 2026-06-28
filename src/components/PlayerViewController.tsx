"use client";

import { useRouter } from "next/navigation";

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
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-slate-900 p-3 rounded-xl border border-slate-800">

            {/* Onglets */}
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800/80">
                <button
                    onClick={() => update(currentQueue, "history")}
                    className={`flex-1 sm:flex-none px-6 py-2 rounded-md font-semibold text-sm transition-all ${
                        currentTab !== "stats" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
                    }`}
                >
                    📜 Historique
                </button>
                <button
                    onClick={() => update(currentQueue, "stats")}
                    className={`flex-1 sm:flex-none px-6 py-2 rounded-md font-semibold text-sm transition-all ${
                        currentTab === "stats" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
                    }`}
                >
                    📊 Statistiques
                </button>
            </div>

            {/* Sélecteur de file */}
            <div className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-wider text-slate-500 font-bold pl-2">Queue :</span>
                <select
                    value={currentQueue}
                    onChange={(e) => update(e.target.value, currentTab)}
                    className="bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-indigo-500 font-medium cursor-pointer flex-1 sm:flex-none"
                >
                    <option value="ALL">Toutes les queues</option>
                    {queues.map(q => <option key={q} value={q}>{q}</option>)}
                </select>
            </div>

        </div>
    );
}