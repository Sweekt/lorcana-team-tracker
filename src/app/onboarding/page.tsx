"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createTeam } from "@/actions/team";
import { toast } from "sonner";

export default function OnboardingPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    // Redirection sécurité si non connecté
    if (status === "unauthenticated") {
        router.push("/");
        return null;
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!session?.user?.id) return;

        setIsLoading(true);
        const formData = new FormData(e.currentTarget);

        const result = await createTeam(formData, session.user.id);

        if (result.error) {
            toast.error(result.error);
            setIsLoading(false);
        } else {
            toast.success("Équipe créée avec succès !");
            // On renvoie l'utilisateur vers la page principale une fois la team créée
            router.push("/");
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl shadow-xl max-w-md w-full">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-600 mb-2">
                        Bienvenue sur Lorcana Tracker
                    </h1>
                    <p className="text-slate-400 text-sm">
                        Pour commencer à enregistrer vos matchs, vous devez créer une équipe ou en rejoindre une.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">
                            Nom de votre nouvelle équipe
                        </label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            required
                            placeholder="Ex: Les Illumineers de Lyon"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-colors ${
                            isLoading
                                ? "bg-slate-800 text-slate-400 cursor-not-allowed"
                                : "bg-indigo-600 hover:bg-indigo-500 text-white"
                        }`}
                    >
                        {isLoading ? "Création en cours..." : "Créer mon équipe"}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-slate-500">
                    <p>Un ami vous a invité ?</p>
                    <p>Demandez-lui son lien d'invitation secret !</p>
                </div>
            </div>
        </div>
    );
}