"use client";

import { useRouter } from "next/navigation";

export default function QueueSelector({
                                          queues,
                                          currentQueue,
                                          playerName = "",
                                      }: {
    queues: string[];
    currentQueue: string;
    playerName?: string;
}) {
    const router = useRouter();
    const playerPageRoute = 'player/' + playerName;

    return (
        <div className="relative">
            <select
                value={currentQueue}
                onChange={(e) => {
                    router.push(`/${playerName ? playerPageRoute : 'leaderboard'}?queue=${e.target.value}`);
                }}
                className="w-full sm:w-36 bg-slate-900 border text-xs border-slate-700 text-slate-200 py-2.5 pl-4 pr-10 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer font-medium appearance-none"
            >
                {queues.map((q) => (
                    <option key={q} value={q}>
                        {q}
                    </option>
                ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </div>
        </div>
    );
}