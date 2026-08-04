"use client";

import { useState } from "react";
import { createTeam } from "@/actions/team";
import { toast } from "sonner";

type CreateTeamFormProps = {
    userId: string;
    onSuccess?: () => void;
};

export default function CreateTeamForm({ userId, onSuccess }: CreateTeamFormProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        const formData = new FormData(e.currentTarget);

        const result = await createTeam(formData, userId);

        if (result.error) {
            toast.error(result.error);
            setIsLoading(false);
        } else {
            toast.success("Équipe créée avec succès !");
            setIsLoading(false);
            if (onSuccess) onSuccess(); // Déclenche la redirection ou la fermeture de la modale
        }
    };

    return (
        <form onSubmit={handleCreate} className="space-y-4">
            <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Créer une nouvelle équipe
                </label>
                <input
                    type="text"
                    name="name"
                    required
                    placeholder="Nom de l'équipe"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600"
                />
            </div>
            <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 shadow-sm shadow-indigo-600/20"
            >
                {isLoading ? "Création..." : "Créer mon équipe"}
            </button>
        </form>
    );
}