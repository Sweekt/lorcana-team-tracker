"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { joinTeam } from "@/actions/team";
import { toast } from "sonner";

type Props = {
    token: string;
    userId: string;
};

export default function JoinButton({ token, userId }: Props) {
    const [isJoining, setIsJoining] = useState(false);
    const router = useRouter();

    const handleJoin = async () => {
        setIsJoining(true);
        const toastId = toast.loading("Adhésion à l'équipe en cours...");

        try {
            const result = await joinTeam(token, userId);

            if (result.error) {
                toast.error(result.error, { id: toastId });
                setIsJoining(false);
            } else {
                toast.success("Vous avez rejoint l'équipe avec succès !", { id: toastId });
                router.push("/");
                router.refresh();
            }
        } catch (error) {
            toast.error("Une erreur inattendue est survenue.", { id: toastId });
            setIsJoining(false);
        }
    };

    return (
        <button
            onClick={handleJoin}
            disabled={isJoining}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white px-4 py-3 rounded-xl font-medium transition-all shadow-sm shadow-indigo-600/20"
        >
            {isJoining ? (
                <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connexion...
                </>
            ) : (
                "Rejoindre l'équipe"
            )}
        </button>
    );
}