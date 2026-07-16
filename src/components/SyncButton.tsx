"use client";

import { useState } from "react";
import { syncTeamHistory } from "@/actions/sync";
import { toast } from "sonner";

export default function SyncButton({ targetUserId }: { targetUserId?: string }) {
    const [isSyncing, setIsSyncing] = useState(false);

    const handleSync = async () => {
        setIsSyncing(true);
        const toastId = toast.loading(
            targetUserId ? "Synchronisation du joueur en cours..." : "Synchronisation de l'équipe en cours..."
        );

        try {
            const result = await syncTeamHistory(targetUserId);

            if (!result.success) {
                toast.error(result.message, { id: toastId });
            } else {
                toast.success(result.message, { id: toastId });
            }
        } catch (error) {
            toast.error("Une erreur inattendue est survenue.", { id: toastId });
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white px-4 py-2 rounded-lg font-medium transition-all text-sm shadow-sm"
        >
            {isSyncing ? (
                <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Synchro...
                </>
            ) : (
                <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Synchroniser
                </>
            )}
        </button>
    );
}