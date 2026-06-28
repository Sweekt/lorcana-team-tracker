"use client";

import { useState } from "react";
import { syncTeamHistory } from "@/actions/sync"; // Assure-toi que le chemin est correct
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
            className={`px-4 py-2 rounded-lg font-medium transition-colors border ${
                isSyncing
                    ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
                    : "bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500"
            }`}
        >
            {isSyncing ? "Synchronisation en cours..." : "🔄 Synchroniser l'historique"}
        </button>
    );
}