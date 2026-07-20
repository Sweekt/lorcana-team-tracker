import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getCurrentTeamId } from "@/lib/current-team";
import TeamSettingsForm from "./TeamSettingsForm"; // Le composant client qu'on crée juste après

// Liste globale des formats possibles sur Lorcana
const AVAILABLE_QUEUES = [
    { id: "core-bo1", label: "Core (BO1)" },
    { id: "core-bo3", label: "Core (BO3)" },
    { id: "draft", label: "Draft" },
    { id: "sealed", label: "Scellé" }
];

export default async function TeamSettingsPage() {
    const session = await getServerSession(authOptions);
    const teamId = await getCurrentTeamId();

    if (!session?.user?.id || !teamId) redirect("/");

    // On récupère l'équipe, ses membres, et on vérifie le rôle
    const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
            members: {
                include: { user: { select: { id: true, name: true, image: true, lorcanaApiKey: true } } },
                orderBy: { role: "asc" } // ADMIN en premier
            }
        }
    });

    const currentMember = team?.members.find(m => m.userId === session.user.id);

    // Sécurité stricte : si pas admin, on dégage !
    if (currentMember?.role !== "ADMIN" || !team) {
        redirect("/");
    }

    // On construit le lien d'invitation complet
    const inviteLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/invite/${team.inviteToken}`;

    return (
        <div className="min-h-screen bg-slate-950 pb-4 p-8">
            <main className="max-w-3xl mx-auto space-y-8 mt-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-200">Gestion de l'équipe : {team.name}</h1>
                    <p className="text-slate-500 text-sm mt-1">Espace réservé au capitaine.</p>
                </div>

                <TeamSettingsForm
                    team={team}
                    availableQueues={AVAILABLE_QUEUES}
                    inviteLink={inviteLink}
                    currentUserId={session.user.id}
                />
            </main>
        </div>
    );
}