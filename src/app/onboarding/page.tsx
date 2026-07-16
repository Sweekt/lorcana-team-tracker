"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createTeam, joinTeam } from "@/actions/team";
import { toast } from "sonner";

export default function OnboardingPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    if (status === "unauthenticated") {
        router.push("/");
        return null;
    }

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!session?.user?.id) return;
        setIsLoading(true);
        const formData = new FormData(e.currentTarget);
        const result = await createTeam(formData, session.user.id);
        handleResult(result, "Équipe créée avec succès !");
    };

    const handleJoin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!session?.user?.id) return;
        setIsLoading(true);
        const formData = new FormData(e.currentTarget);
        const token = formData.get("token") as string;
        const result = await joinTeam(token, session.user.id);
        handleResult(result, "Équipe rejointe avec succès !");
    };

    const handleResult = (result: any, successMessage: string) => {
        if (result.error) {
            toast.error(result.error);
            setIsLoading(false);
        } else {
            toast.success(successMessage);
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
                        Créez votre équipe ou rejoignez celle de vos amis.
                    </p>
                </div>

                {/* Formulaire de création */}
                <form onSubmit={handleCreate} className="space-y-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Créer une nouvelle équipe</label>
                        <input type="text" name="name" required placeholder="Nom de l'équipe" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:border-indigo-500 outline-none" />
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full py-2 rounded-lg font-medium bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50">
                        Créer mon équipe
                    </button>
                </form>

                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-800"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-500 text-sm">OU</span>
                    <div className="flex-grow border-t border-slate-800"></div>
                </div>

                {/* Formulaire pour rejoindre */}
                <form onSubmit={handleJoin} className="space-y-4 mt-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Rejoindre via un code secret</label>
                        <input type="text" name="token" required placeholder="Ex: 550e8400-e29b-41d4-a716-446655440000" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:border-indigo-500 outline-none" />
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full py-2 rounded-lg font-medium bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 disabled:opacity-50">
                        Rejoindre l'équipe
                    </button>
                </form>
            </div>
        </div>
    );
}