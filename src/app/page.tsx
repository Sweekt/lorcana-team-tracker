import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getCurrentTeamId } from "@/lib/current-team";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import LoginButton from "@/components/LoginButton";
import Link from "next/link";
import RosterIcon from "@/assets/ic_roster.svg"
import DuelIcon from "@/assets/ic_duel.svg"
import LeaderboardIcon from "@/assets/ic_leaderboard.svg"

export default async function HomePage() {
    const session = await getServerSession(authOptions);

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

    const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
            _count: {
                select: { members: true, games: true }
            }
        }
    });

    if (!team) redirect("/onboarding");

    return (
        <div className="flex-1 flex flex-col justify-center w-full bg-slate-950 p-4 sm:p-8 relative overflow-hidden">

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>

            <main className="max-w-4xl mx-auto flex flex-col items-center relative z-10 space-y-4 w-full">

                <div className="flex flex-col items-center text-center">

                    {team.logoUrl ? (
                        <img
                            src={team.logoUrl}
                            alt={`Logo ${team.name}`}
                            className="w-40 h-40 sm:w-48 sm:h-48 rounded-3xl object-cover border-4 border-slate-900 shadow-2xl shadow-indigo-900/20"
                        />
                    ) : (
                        <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-3xl bg-linear-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-6xl font-black text-white shadow-2xl shadow-indigo-900/20 border-4 border-slate-900">
                            {team.name.charAt(0).toUpperCase()}
                        </div>
                    )}

                    <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-100 tracking-tight mt-8 mb-6">
                        {team.name}
                    </h1>

                    <div className="flex flex-wrap justify-center items-center gap-3 text-sm">
                        <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-sm border border-slate-800 px-5 py-2.5 rounded-full text-slate-300 font-medium shadow-sm">
                            <RosterIcon className="text-white w-4 h-4" />
                            <span className="text-white font-bold">{team._count.members}</span> Membres
                        </div>
                        <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-sm border border-slate-800 px-5 py-2.5 rounded-full text-slate-300 font-medium shadow-sm">
                            <DuelIcon className="text-white w-4 h-4" />
                            <span className="text-white font-bold">{team._count.games}</span> Parties
                        </div>
                    </div>
                </div>

                {/* LIENS DE NAVIGATION PRINCIPAUX */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl mt-2">
                    <Link href="/leaderboard" className="group flex items-center gap-4 bg-indigo-500/10 border border-indigo-500/20 group-hover:bg-indigo-500/20 shadow-lg hover:shadow-indigo-500/20 p-4 sm:p-5 rounded-2xl transition-all">
                        <LeaderboardIcon className="text-indigo-400 w-6 h-6 group-hover:scale-110 transition-transform" />
                        <div className="text-left">
                            <h3 className="text-base sm:text-lg font-bold text-slate-200 group-hover:text-indigo-300 transition-colors leading-tight">Leaderboard</h3>
                            <p className="text-slate-400 text-xs sm:text-sm mt-1">Classement et historique</p>
                        </div>
                    </Link>

                    <Link href="/roster" className="group flex items-center gap-4 bg-violet-500/10 border border-violet-500/20 group-hover:bg-violet-500/20 shadow-lg hover:shadow-violet-500/20 p-4 sm:p-5 rounded-2xl transition-all">
                        <RosterIcon className="text-violet-400 w-6 h-6 group-hover:scale-110 transition-transform" />
                        <div className="text-left">
                            <h3 className="text-base sm:text-lg font-bold text-slate-200 group-hover:text-violet-300 transition-colors leading-tight">Roster</h3>
                            <p className="text-slate-400 text-xs sm:text-sm mt-1">Profils et statistiques</p>
                        </div>
                    </Link>
                </div>
            </main>
        </div>
    );
}