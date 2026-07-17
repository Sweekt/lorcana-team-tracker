"use client";

import { updateUserProfile } from "@/actions/user";
import { useState } from "react";
import { toast } from "sonner";

type UserProps = {
    lorcanaApiKey: string | null;
    dreambornUrl: string | null;
};

export default function ProfileForm({ user }: { user: UserProps }) {
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const result = await updateUserProfile(formData);

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("Profil mis à jour avec succès !");
        }

        setIsLoading(false);
    };

    return (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm space-y-6">
            <div>
                <label htmlFor="lorcanaApiKey" className="block text-sm font-medium text-slate-300 mb-2">
                    Clé API Duels.ink
                </label>
                <input
                    type="password"
                    id="lorcanaApiKey"
                    name="lorcanaApiKey"
                    defaultValue={user.lorcanaApiKey || ""}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono text-sm"
                />
                <p className="mt-2 text-xs text-slate-500">
                    Cette clé permet de synchroniser automatiquement votre historique de matchs. Elle est chiffrée et privée.
                </p>
            </div>

            <div className="pt-4 border-t border-slate-800">
                <label htmlFor="dreambornUrl" className="block text-sm font-medium text-slate-300 mb-2">
                    Lien Profil Dreamborn
                </label>
                <input
                    type="url"
                    id="dreambornUrl"
                    name="dreambornUrl"
                    defaultValue={user.dreambornUrl || ""}
                    placeholder="https://dreamborn.ink/creators/..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
            </div>

            <div className="pt-4 flex justify-end">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                    {isLoading ? "Sauvegarde..." : "Enregistrer les modifications"}
                </button>
            </div>
        </form>
    );
}