"use client";

import { useState } from "react";
import { syncTeamHistory } from "@/actions/sync";
import { useRouter } from "next/navigation";

export default function SyncButton() {
    const [isSyncing, setIsSyncing] = useState(false);
    const router = useRouter();

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const result = await syncTeamHistory();
            alert(result.message);

            if (result.success) {
                router.refresh();
            }
        } catch (error) {
            alert("Erreur réseau lors de la synchronisation.");
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <button
            onClick={handleSync}
            disabled={isSyncing}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors border ${
                isSyncing
                    ? "bg-slate-800 border-slate-700 text-slate-400 cursor-not-allowed"
                    : "bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500 shadow-sm"
            }`}
        >
            {isSyncing ? (
                <>
                    {/* SVG du Spinner (Tailwind) */}
                    <svg
                        className="animate-spin h-4 w-4 text-slate-400"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        ></circle>
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                    </svg>
                    <span>Synchronisation...</span>
                </>
            ) : (
                <>
                    <span>Synchroniser l'historique</span>
                </>
            )}
        </button>
    );
}