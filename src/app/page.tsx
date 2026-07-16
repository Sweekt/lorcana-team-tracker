import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getCurrentTeamId } from "@/lib/current-team";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import LoginButton from "@/components/LoginButton";
import Link from "next/link";
import SyncButton from "@/components/SyncButton";

export default async function HomePage() {
    const session = await getServerSession(authOptions);

    // ==========================================
    // 1. MODE PUBLIC : LANDING PAGE
    // ==========================================
    if (!session?.user) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="relative z-10 text-center max-w-4xl px-6">
                    <span className="text-indigo-400 font-bold tracking-wider uppercase text-sm mb-6 block border border-indigo-500/30 bg-indigo-500/10 py-2 px-4 rounded-full w-fit mx-auto">
                        Lorcana Team Tracker
                    </span>
                    <h1 className="text-5xl sm:text-7xl font-extrabold text-white mb-8 tracking-tight">
                        Dominez la <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-violet-400">compétition</span>
                    </h1>
                    <p className="text-lg sm:text-xl text-slate-400 mb-12 leading-relaxed max-w-2xl mx-auto">
                        Synchronisez vos matchs depuis Duels.ink, analysez vos statistiques et suivez la progression de votre équipe en temps réel.
                    </p>
                    <div className="flex justify-center">
                        <LoginButton />
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // 2. VÉRIFICATION DE L'ÉQUIPE
    // ==========================================
    const teamId = await getCurrentTeamId();
    if (!teamId) {
        redirect("/onboarding");
    }

    // ==========================================
    // 3. MODE PRIVÉ : DASHBOARD DE L'ÉQUIPE
    // ==========================================

    // On récupère l'équipe, le nombre de membres et le nombre de parties jouées
    const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
            _count: {
                select: { members: true, games: true }
            }
        }
    });

    if (!team) redirect("/onboarding");

    // On vérifie si l'utilisateur actuel est le capitaine pour lui afficher le bouton de gestion
    const currentMember = await prisma.teamMember.findUnique({
        where: { userId_teamId: { userId: session.user.id, teamId: teamId } }
    });
    const isAdmin = currentMember?.role === "ADMIN";

    return (
        <div className="min-h-screen bg-slate-950 pb-20 p-4 sm:p-8">
            <main className="max-w-5xl mx-auto space-y-8 mt-8">

                {/* EN-TÊTE : Logo, Nom et Actions */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center sm:items-center gap-6">
                        {/* Logo de l'équipe */}
                        {team.logoUrl ? (
                            <img src={team.logoUrl} alt={`Logo ${team.name}`} className="w-24 h-24 rounded-xl object-cover border border-slate-700 shadow-md" />
                        ) : (
                            <div className="w-24 h-24 rounded-xl bg-linear-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-4xl font-black text-white shadow-md">
                                {team.name.charAt(0).toUpperCase()}
                            </div>
                        )}

                        <div className="text-center sm:text-left">
                            <h1 className="text-3xl font-extrabold text-slate-100">{team.name}</h1>
                            <p className="text-slate-400 mt-1">Hub de l'équipe compétitive</p>
                        </div>
                    </div>

                    {/* Barre d'outils (Capitaine + Synchro) */}
                    <div className="flex flex-wrap justify-center sm:justify-end gap-3 w-full sm:w-auto">
                        {isAdmin && (
                            <Link href="/team/settings" className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm text-slate-300 transition-colors border border-slate-700 font-medium shadow-sm">
                                ⚙️ Gérer l'équipe
                            </Link>
                        )}
                        <SyncButton />
                    </div>
                </div>

                {/* STATISTIQUES GLOBALES */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
                        <div className="text-4xl mb-2">👥</div>
                        <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Membres Actifs</p>
                        <p className="text-3xl font-bold text-slate-100 mt-1">{team._count.members}</p>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
                        <div className="text-4xl mb-2">⚔️</div>
                        <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Parties Enregistrées</p>
                        <p className="text-3xl font-bold text-slate-100 mt-1">{team._count.games}</p>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
                        <div className="text-4xl mb-2">🎯</div>
                        <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Formats Compétitifs</p>
                        <p className="text-3xl font-bold text-slate-100 mt-1">{team.activeQueues.length}</p>
                    </div>
                </div>

                {/* LIENS RAPIDES */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
                    <Link href="/leaderboard" className="group bg-slate-900 hover:bg-indigo-900/20 border border-slate-800 hover:border-indigo-500/50 p-6 rounded-2xl transition-all flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">🏆 Voir le Leaderboard</h3>
                            <p className="text-slate-400 text-sm mt-1">Consultez le classement interne et l'historique complet.</p>
                        </div>
                        <span className="text-slate-600 group-hover:text-indigo-400 text-2xl transition-colors">→</span>
                    </Link>

                    <Link href="/roster" className="group bg-slate-900 hover:bg-indigo-900/20 border border-slate-800 hover:border-indigo-500/50 p-6 rounded-2xl transition-all flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">📋 Voir le Roster</h3>
                            <p className="text-slate-400 text-sm mt-1">Accédez aux profils détaillés de tous les membres.</p>
                        </div>
                        <span className="text-slate-600 group-hover:text-indigo-400 text-2xl transition-colors">→</span>
                    </Link>
                </div>

            </main>
        </div>
    );
}