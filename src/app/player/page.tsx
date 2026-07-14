import prisma from "@/lib/prisma";
import Link from "next/link";

export default async function RosterPage() {
    // On récupère tous les joueurs triés par ordre alphabétique
    const players = await prisma.player.findMany({
        orderBy: { name: 'asc' }
    });

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 pb-20">
            <main className="max-w-6xl mx-auto p-8 space-y-12">

                {/* EN-TÊTE */}
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-600">
                            Roster de l'Équipe
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">Découvrez tous les joueurs et leurs statistiques.</p>
                    </div>
                </header>

                {/* GRILLE DES JOUEURS */}
                {players.length === 0 ? (
                    <div className="bg-slate-900 p-12 rounded-2xl border border-slate-800 text-center text-slate-500">
                        Aucun joueur n'est inscrit dans l'équipe pour le moment.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {players.map((player) => (
                            <div
                                key={player.id}
                                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center text-center shadow-sm hover:border-indigo-500/50 hover:shadow-indigo-500/10 transition-all group"
                            >

                                {/* PHOTO DE PROFIL */}
                                <div className="mb-4 relative">
                                    {player.avatarUrl ? (
                                        <img
                                            src={player.avatarUrl}
                                            alt={player.name}
                                            className="w-24 h-24 rounded-full object-cover border-4 border-slate-950 shadow-xl group-hover:scale-105 transition-transform"
                                        />
                                    ) : (
                                        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-4xl font-black text-indigo-100 border-4 border-slate-950 shadow-xl group-hover:scale-105 transition-transform">
                                            {player.name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    {/* Petit point décoratif pour faire "En ligne / Actif" */}
                                    <div className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-900 rounded-full"></div>
                                </div>

                                {/* NOM DU JOUEUR */}
                                <h2 className="text-xl font-bold text-slate-200 mb-6">{player.name}</h2>

                                {/* BOUTONS D'ACTION */}
                                <div className="flex flex-col gap-2 w-full mt-auto">
                                    {/* Lien vers les stats (Page Profil qu'on a créée) */}
                                    <Link
                                        href={`/player/${encodeURIComponent(player.name)}`}
                                        className="w-full bg-indigo-600 text-white font-medium text-sm py-2.5 rounded-lg hover:bg-indigo-500 transition-colors shadow-sm"
                                    >
                                        📊 Voir les Stats
                                    </Link>

                                    {/* Lien Dreamborn conditionnel */}
                                    {player.dreambornUrl ? (
                                        <a
                                            href={player.dreambornUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full bg-slate-950 border border-slate-800 text-slate-300 font-medium text-sm py-2.5 rounded-lg hover:bg-slate-800 hover:text-indigo-300 hover:border-indigo-500/30 transition-all flex items-center justify-center gap-2"
                                        >
                                            📓 Dreamborn
                                        </a>
                                    ) : (
                                        <span className="w-full bg-slate-950/50 border border-slate-800/50 text-slate-600 font-medium text-sm py-2.5 rounded-lg cursor-not-allowed">
                      Pas de Dreamborn
                    </span>
                                    )}
                                </div>

                            </div>
                        ))}
                    </div>
                )}

            </main>
        </div>
    );
}