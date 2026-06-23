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
            alert(result.message); // On fait simple pour l'instant avec une alert native

            if (result.success) {
                // Rafraîchit les données de la page courante (Server Components)
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
            className={`px-4 py-2 rounded-md font-medium text-white transition-colors ${
                isSyncing
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
            }`}
        >
            {isSyncing ? "Synchronisation en cours..." : "🔄 Synchroniser l'historique"}
        </button>
    );
}