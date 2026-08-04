"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { joinTeam } from "@/actions/team";
import { toast } from "sonner";
import CreateTeamForm from "@/components/CreateTeamForm"; // Assure-toi du bon chemin

type Props = {
    userId: string;
    userName: string;
};

export default function OnboardingForm({ userId, userName }: Props) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleJoin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        const formData = new FormData(e.currentTarget);
        const token = formData.get("token") as string;

        const result = await joinTeam(token, userId);

        if (result.error) {
            toast.error(result.error);
            setIsLoading(false);
        } else {
            toast.success("Équipe rejointe avec succès !");
            router.push("/");
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 relative overflow-hidden">
            {/* Décorations de fond */}
            <div className="absolute top-0 w-full h-1/2 bg-linear-to-b from-indigo-900/20 to-transparent pointer-events-none"></div>
            <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="max-w-md w-full bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl relative z-10">

                {/* En-tête de bienvenue */}
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5 shadow-inner">
                        🤝
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-3 tracking-tight">
                        Bienvenue, {userName} !
                    </h1>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Pour commencer à synchroniser et analyser vos parties, créez une équipe ou rejoignez celle de vos amis.
                    </p>
                </div>

                {/* Le Formulaire de création extrait */}
                <div className="mb-8 bg-slate-950/50 p-5 rounded-2xl border border-slate-800/80">
                    <CreateTeamForm
                        userId={userId}
                        onSuccess={() => router.push("/")}
                    />
                </div>

                <div className="relative flex py-2 items-center mb-8">
                    <div className="grow border-t border-slate-800"></div>
                    <span className="shrink-0 mx-4 text-slate-500 text-xs font-bold tracking-widest">OU</span>
                    <div className="grow border-t border-slate-800"></div>
                </div>

                {/* Formulaire pour rejoindre */}
                <form onSubmit={handleJoin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                            Rejoindre via un code secret
                        </label>
                        <input
                            type="text"
                            name="token"
                            required
                            placeholder="Collez le token d'invitation ici"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:border-slate-600 outline-none transition-all font-mono text-sm placeholder:font-sans placeholder:text-slate-600"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 rounded-xl font-medium bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors disabled:opacity-50"
                    >
                        {isLoading ? "Recherche..." : "Rejoindre l'équipe"}
                    </button>
                </form>
            </div>
        </div>
    );
}