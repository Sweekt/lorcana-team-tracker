"use client";

import { useRouter } from "next/navigation";

export default function QueueSelector({
                                          queues,
                                          currentQueue
                                      }: {
    queues: string[];
    currentQueue: string;
}) {
    const router = useRouter();

    return (
        <div className="relative">
            <select
                value={currentQueue}
                onChange={(e) => {
                    router.push(`/?queue=${e.target.value}`);
                }}
                className="w-full sm:w-64 bg-white border border-slate-200 text-slate-700 py-2.5 pl-4 pr-10 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer font-medium appearance-none"
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