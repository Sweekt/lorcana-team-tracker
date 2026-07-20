import prisma from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getCurrentTeamId } from "@/lib/current-team";
import { redirect } from "next/navigation";
import LeaderboardIcon from "@/assets/ic_leaderboard.svg"
import StarIcon from "@/assets/ic_star.svg"

export default async function RosterPage() {
    const session = await getServerSession(authOptions);
    const teamId = await getCurrentTeamId();

    if (!session?.user || !teamId) {
        redirect("/");
    }

    const teamUsers = await prisma.user.findMany({
        where: {
            teams: { some: { teamId: teamId } }
        },
        orderBy: { name: 'asc' }
    });

    return (
        <div className="min-h-[calc(100dvh-65px)] bg-slate-950 text-slate-200 pb-20">

            <main className="max-w-4xl lg:max-w-7xl mx-auto p-8 space-y-8">

                {/* EN-TÊTE */}
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-indigo-600">
                            Roster de l'Équipe
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">Découvrez tous les joueurs de votre équipe et leurs statistiques.</p>
                    </div>
                </header>

                {/* GRILLE DES JOUEURS */}
                {teamUsers.length === 0 ? (
                    <div className="bg-slate-900 p-12 rounded-2xl border border-slate-800 text-center text-slate-500">
                        Aucun joueur n'est inscrit dans l'équipe pour le moment.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {teamUsers.map((user) => {
                            // Formatage propre du pseudo
                            const displayName = user.name ? user.name.charAt(0).toUpperCase() + user.name.slice(1) : "Joueur Inconnu";
                            const linkName = encodeURIComponent(user.name || "inconnu");

                            return (
                                <div
                                    key={user.id}
                                    className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center text-center shadow-sm hover:border-indigo-500/50 hover:shadow-indigo-500/10 transition-all group"
                                >

                                    {/* PHOTO DE PROFIL */}
                                    <div className="mb-4 relative">
                                        {user.image ? (
                                            <img
                                                src={user.image}
                                                alt={displayName}
                                                className="w-24 h-24 rounded-full object-cover border-4 border-slate-500 shadow-xl group-hover:scale-105 transition-transform"
                                            />
                                        ) : (
                                            <div className="w-24 h-24 rounded-full bg-linear-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-4xl font-black text-indigo-100 border-4 border-slate-950 shadow-xl group-hover:scale-105 transition-transform">
                                                {displayName.charAt(0)}
                                            </div>
                                        )}
                                    </div>

                                    {/* NOM DU JOUEUR */}
                                    <h2 className="text-xl font-bold text-slate-200 mb-6">{displayName}</h2>

                                    {/* BOUTONS D'ACTION */}
                                    <div className="flex flex-col gap-2 w-full mt-auto">
                                        {/* Lien vers les stats (Page Profil) */}
                                        <Link
                                            href={`/player/${linkName}`}
                                            className="flex items-center justify-center gap-2 w-full bg-indigo-600 text-white font-medium text-sm py-2.5 rounded-lg hover:bg-indigo-500 transition-colors shadow-sm"
                                        >
                                            <LeaderboardIcon className="w-4 h-4" />
                                            <span>Voir les Stats</span>
                                        </Link>

                                        {/* Lien Dreamborn conditionnel */}
                                        {user.dreambornUrl ? (
                                            <a
                                                href={user.dreambornUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 w-full bg-slate-950 border border-slate-800 text-slate-300 font-medium text-sm py-2.5 rounded-lg hover:bg-slate-800 hover:text-indigo-300 hover:border-indigo-500/30 transition-all"
                                            >
                                                <StarIcon className="w-4 h-4" />
                                                <span>Dreamborn</span>
                                            </a>
                                        ) : (
                                            <span className="w-full bg-slate-950/50 border border-slate-800/50 text-slate-600 font-medium text-sm py-2.5 rounded-lg cursor-not-allowed">
                                                Pas de Dreamborn
                                            </span>
                                        )}
                                    </div>

                                </div>
                            );
                        })}
                    </div>
                )}

            </main>
        </div>
    );
}