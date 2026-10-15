"use client";

import { updateUserProfile, disconnectDuelsAccount } from "@/actions/user";
import { leaveTeamAction } from "@/actions/team";
import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import CreateTeamForm from "@/components/CreateTeamForm";

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
    duelsUserId?: string | null;
    duelsUsername?: string | null;
    duelsConnected: boolean;
    duelsTokenExpiresAt?: string | null;
    isDuelsExpired: boolean;
    memberships: TeamMembership[];
};

export default function ProfileForm({ user }: { user: UserProps }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    useEffect(() => {
        if (searchParams.get("duels_linked") === "true") {
            toast.success("Compte Duels.ink lié avec succès !");
            router.replace("/settings");
        } else if (searchParams.get("duels_cancelled") === "true") {
            toast.info("Liaison Duels.ink annulée.");
            router.replace("/settings");
        } else if (searchParams.get("duels_error")) {
            toast.error(`Erreur de liaison Duels.ink : ${searchParams.get("duels_error")}`);
            router.replace("/settings");
        }
    }, [searchParams, router]);

    const handleManualKeySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const result = await updateUserProfile(formData);

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("Clé API Duels.ink mise à jour !");
            router.refresh();
        }

        setIsLoading(false);
    };

    const handleDreambornSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const result = await updateUserProfile(formData);

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("Profil Dreamborn mis à jour avec succès !");
            router.refresh();
        }

        setIsLoading(false);
    };

    const handleDisconnectDuels = () => {
        if (!confirm("Voulez-vous vraiment dissocier votre compte Duels.ink ?")) return;

        startTransition(async () => {
            const result = await disconnectDuelsAccount();
            if (result?.error) {
                toast.error(result.error);
            } else {
                toast.success("Compte Duels.ink dissocié.");
                router.refresh();
            }
        });
    };

    const handleLeaveTeam = (teamId: string, teamName: string) => {
        if (!confirm(`Êtes-vous sûr de vouloir quitter l'équipe "${teamName}" ?`)) return;

        startTransition(async () => {
            const result = await leaveTeamAction(user.id, teamId);
            if (result?.error) {
                toast.error(result.error);
            } else {
                toast.success(`Vous avez quitté ${teamName}.`);
                router.refresh();
            }
        });
    };

    const formattedExpiresAt = user.duelsTokenExpiresAt
        ? new Date(user.duelsTokenExpiresAt).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
        })
        : null;

    return (
        <div className="space-y-6">
            {/* BLOC 1 : CONNEXION DUELS.INK & CLÉ MANUELLE */}
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-100">Compte Duels.ink</h2>
                        <p className="text-xs text-slate-400 mt-1">
                            Synchronisation automatique des matchs, statistiques et decklists.
                        </p>
                    </div>

                    {user.duelsConnected && !user.isDuelsExpired && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Connecté
                        </span>
                    )}

                    {user.duelsConnected && user.isDuelsExpired && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                            Expiré
                        </span>
                    )}

                    {!user.duelsConnected && user.lorcanaApiKey && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Clé manuelle
                        </span>
                    )}
                </div>

                {user.duelsConnected && !user.isDuelsExpired ? (
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <p className="text-sm text-slate-300 font-medium">
                                Joueur : <span className="text-indigo-400 font-semibold">{user.duelsUsername || user.duelsUserId}</span>
                            </p>
                            {formattedExpiresAt && (
                                <p className="text-xs text-slate-500 mt-1">
                                    Connexion valide jusqu'au {formattedExpiresAt}
                                </p>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={handleDisconnectDuels}
                            disabled={isPending}
                            className="text-xs text-red-400 hover:text-red-300 font-medium px-3.5 py-2 rounded-md bg-red-500/10 hover:bg-red-500/20 transition-colors self-start sm:self-auto disabled:opacity-50"
                        >
                            Dissocier le compte
                        </button>
                    </div>
                ) : user.duelsConnected && user.isDuelsExpired ? (
                    <div className="bg-orange-950/20 border border-orange-800/40 rounded-lg p-4 space-y-3">
                        <p className="text-sm text-orange-300">
                            Votre autorisation Duels.ink a expiré ou a été révoquée. Veuillez la renouveler en un clic.
                        </p>
                        <div className="flex items-center gap-3">
                            <a
                                href="/api/oauth/duels/start"
                                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors"
                            >
                                Reconnecter mon compte Duels.ink
                            </a>
                            <button
                                type="button"
                                onClick={handleDisconnectDuels}
                                disabled={isPending}
                                className="text-xs text-slate-400 hover:text-slate-200 px-3 py-2 rounded-md transition-colors"
                            >
                                Dissocier
                            </button>
                        </div>
                    </div>
                ) : !user.duelsConnected && user.lorcanaApiKey ? (
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-4 space-y-3">
                        <p className="text-xs text-slate-300">
                            Vous utilisez actuellement une ancienne clé API manuelle. Nous vous recommandons d'associer directement votre compte en un clic pour une meilleure fiabilité.
                        </p>
                        <a
                            href="/api/oauth/duels/start"
                            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors"
                        >
                            Associer mon compte Duels.ink
                        </a>
                    </div>
                ) : (
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-5 space-y-3">
                        <p className="text-sm text-slate-300">
                            Associez votre compte Duels.ink en un clic pour synchroniser vos parties avec votre équipe sans avoir à manipuler de clé API.
                        </p>
                        <a
                            href="/api/oauth/duels/start"
                            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors shadow-sm"
                        >
                            Lier mon compte Duels.ink
                        </a>
                    </div>
                )}

                {/* Section dépliable pour configuration avancée de la clé API manuelle DANS le bloc Duels.ink */}
                <details className="group border-t border-slate-800/80 pt-4">
                    <summary className="text-xs text-slate-400 hover:text-slate-300 cursor-pointer font-medium list-none flex items-center justify-between">
                        <span>Option avancée (Clé API manuelle de secours)</span>
                        <span className="text-slate-600 group-open:rotate-180 transition-transform">▼</span>
                    </summary>

                    <form onSubmit={handleManualKeySubmit} className="mt-4 space-y-3">
                        <label htmlFor="lorcanaApiKey" className="block text-xs font-medium text-slate-400">
                            Clé API Duels.ink personnelle
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="password"
                                id="lorcanaApiKey"
                                name="lorcanaApiKey"
                                defaultValue={user.lorcanaApiKey || ""}
                                placeholder="f3a1... (96 caractères hexadécimaux)"
                                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono text-xs"
                            />
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                                Enregistrer
                            </button>
                        </div>
                        <p className="text-xs text-slate-500">
                            Cette clé de secours n'est utile que si vous préférez ne pas utiliser la connexion en 1 clic ci-dessus.
                        </p>
                    </form>
                </details>
            </div>

            {/* BLOC 2 : PROFIL DREAMBORN */}
            <form onSubmit={handleDreambornSubmit} className="bg-slate-900 border border-slate-800 p-8 rounded-xl shadow-sm space-y-5">
                <h2 className="text-xl font-bold text-slate-100">Profil Dreamborn</h2>

                <div>
                    <label htmlFor="dreambornUrl" className="block text-sm font-medium text-slate-300 mb-2">
                        Lien Profil Dreamborn
                    </label>
                    <input
                        type="url"
                        id="dreambornUrl"
                        name="dreambornUrl"
                        defaultValue={user.dreambornUrl || ""}
                        placeholder="https://dreamborn.ink/creators/..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                    />
                </div>

                <div className="pt-2 flex justify-end">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
                    >
                        {isLoading ? "Sauvegarde..." : "Enregistrer"}
                    </button>
                </div>
            </form>

            {/* BLOC 3 : GESTION DES ÉQUIPES */}
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-100">Mes Équipes</h2>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="text-sm bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 px-3 py-1.5 rounded-md font-medium transition-colors"
                    >
                        + Créer une équipe
                    </button>
                </div>

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
                                            {membership.role === 'ADMIN' ? 'Capitaine' : 'Membre'}
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

            {/* MODALE DE CRÉATION D'ÉQUIPE */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-slate-800">
                            <h3 className="font-bold text-slate-100">Nouvelle équipe</h3>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="text-slate-400 hover:text-slate-200 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6">
                            <CreateTeamForm
                                userId={user.id}
                                onSuccess={() => {
                                    setIsCreateModalOpen(false);
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}