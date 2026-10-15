import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getCurrentTeamId } from "@/lib/current-team";
import TournamentCard from "./TournamentCard";
import CreateTournamentModal from "./CreateTournamentModal";
import TournamentIcon from "@/assets/ic_tournament.svg";

export default async function TournamentsPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect("/");
    }

    const teamId = await getCurrentTeamId();
    if (!teamId) {
        redirect("/onboarding");
    }

    // Récupérer le membre de l'équipe et vérifier s'il est ADMIN
    const currentMember = await prisma.teamMember.findUnique({
        where: {
            userId_teamId: {
                userId: session.user.id,
                teamId,
            },
        },
        include: {
            team: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });

    if (!currentMember) {
        redirect("/onboarding");
    }

    const isAdmin = currentMember.role === "ADMIN";

    // Récupérer tous les tournois de l'équipe active
    const tournaments = await prisma.tournament.findMany({
        where: { teamId },
        include: {
            _count: {
                select: { participants: true },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    // Partition entre tournois en cours et tournois terminés (archives)
    const activeTournaments = tournaments.filter(
        (t) => t.status === "REGISTRATION" || t.status === "RUNNING" || t.status === "TOP_CUT"
    );
    const finishedTournaments = tournaments.filter((t) => t.status === "FINISHED");

    return (
        <div className="flex-1 flex flex-col bg-slate-950 text-slate-200 pb-20">
            <main className="flex-1 w-full max-w-4xl lg:max-w-7xl mx-auto p-4 sm:p-8 space-y-10">

                {/* EN-TÊTE PRINCIPAL */}
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-indigo-600">
                                Tournois de l'Équipe
                            </h1>
                        </div>
                        <p className="text-slate-400 text-sm mt-1">
                            Organisez vos compétitions internes pour <span className="text-slate-200 font-semibold">{currentMember.team.name}</span>, suivez les rondes et le Top Cut en direct.
                        </p>
                    </div>

                    {/* Bouton de création réservé aux capitaines */}
                    {isAdmin && (
                        <div className="shrink-0">
                            <CreateTournamentModal teamId={teamId} />
                        </div>
                    )}
                </header>

                {/* SECTION 1 : TOURNOIS EN COURS */}
                <section className="space-y-5">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                            <span>Tournois en cours</span>
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                {activeTournaments.length}
                            </span>
                        </h2>
                    </div>

                    {activeTournaments.length === 0 ? (
                        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
                                <TournamentIcon className="w-6 h-6" />
                            </div>
                            <h3 className="text-base font-bold text-slate-200 mb-1">
                                Aucun tournoi en cours
                            </h3>
                            <p className="text-sm text-slate-400 max-w-md">
                                {isAdmin
                                    ? "Créez votre premier tournoi pour lancer les inscriptions au sein de votre équipe !"
                                    : "Aucun tournoi n'est actif pour le moment. Votre capitaine en lancera un prochainement !"}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {activeTournaments.map((tournament) => (
                                <TournamentCard key={tournament.id} tournament={tournament} />
                            ))}
                        </div>
                    )}
                </section>

                {/* SECTION 2 : TOURNOIS TERMINÉS (ARCHIVES) */}
                <section className="space-y-5 pt-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-slate-300 flex items-center gap-2">
                            <span>Tournois terminés (Archives)</span>
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                                {finishedTournaments.length}
                            </span>
                        </h2>
                    </div>

                    {finishedTournaments.length === 0 ? (
                        <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-8 text-center text-slate-500 text-sm">
                            Aucun tournoi archivé pour le moment.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {finishedTournaments.map((tournament) => (
                                <TournamentCard key={tournament.id} tournament={tournament} />
                            ))}
                        </div>
                    )}
                </section>

            </main>
        </div>
    );
}
