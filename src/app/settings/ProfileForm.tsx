"use client";

import { updateUserProfile } from "@/actions/user";
import { leaveTeamAction } from "@/actions/teamActions";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type TeamMembership = {
    teamId: string;
    role: "ADMIN" | "MEMBER";
    team: {
        id: string;
        name: string;
        _count: { members: number };
    };
};

type UserProps = {
    id: string;
    lorcanaApiKey: string | null;
    dreambornUrl: string | null;
    memberships: TeamMembership[];
};

export default function ProfileForm({ user }: { user: UserProps }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isPending, startTransition] = useTransition();

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

    const handleLeaveTeam = (teamId: string, teamName: string) => {
        if (!confirm(`Êtes-vous sûr de vouloir quitter l'équipe "${teamName}" ?`)) return;

        startTransition(async () => {
            const result = await leaveTeamAction(user.id, teamId);
            if (result?.error) {
                toast.error(result.error);
            } else {
                toast.success(`Vous avez quitté ${teamName}.`);
                router.refresh(); // Rafraîchit la page pour mettre à jour la liste
            }
        });
    };

    return (
        <div className="space-y-6">
            {/* BLOC 1 : FORMULAIRE PROFIL */}
            <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 p-8 rounded-xl shadow-sm space-y-6">
                <h2 className="text-xl font-bold text-slate-100 mb-4">Paramètres du compte</h2>

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

            {/* BLOC 2 : GESTION DES ÉQUIPES */}
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl shadow-sm space-y-6">
                <h2 className="text-xl font-bold text-slate-100">Mes Équipes</h2>

                {user.memberships.length === 0 ? (
                    <p className="text-slate-400 text-sm">Vous ne faites partie d'aucune équipe pour le moment.</p>
                ) : (
                    <div className="space-y-3">
                        {user.memberships.map((membership) => (
                            <div
                                key={membership.teamId}
                                className="flex items-center justify-between p-4 bg-slate-950/50 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors"
                            >
                                <div>
                                    <h3 className="font-semibold text-slate-200">{membership.team.name}</h3>
                                    <div className="flex items-center gap-3 mt-1 text-xs">
                                        <span className={`px-2 py-0.5 rounded-full font-medium ${
                                            membership.role === 'ADMIN' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-800 text-slate-400'
                                        }`}>
                                            {membership.role === 'ADMIN' ? 'Administrateur' : 'Membre'}
                                        </span>
                                        <span className="text-slate-500">
                                            {membership.team._count.members} membre{membership.team._count.members > 1 ? 's' : ''}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleLeaveTeam(membership.teamId, membership.team.name)}
                                    disabled={isPending}
                                    className="px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-md transition-colors disabled:opacity-50"
                                >
                                    Quitter
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}