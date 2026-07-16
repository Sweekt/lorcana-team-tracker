import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";
import Link from "next/link";
import JoinButton from "./JoinButton";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const session = await getServerSession(authOptions);

    const team = await prisma.team.findUnique({
        where: { inviteToken: token }
    });

    if (!team) {
        return (
            <div className="min-h-[50vh] flex flex-col items-center justify-center text-center">
                <h1 className="text-2xl font-bold text-red-400 mb-2">Lien invalide</h1>
                <p className="text-slate-400">Ce lien d'invitation n'existe pas ou a expiré.</p>
                <Link href="/" className="mt-4 text-indigo-400 hover:underline">Retourner à l'accueil</Link>
            </div>
        );
    }

    if (!session?.user) {
        return (
            <div className="min-h-[50vh] flex flex-col items-center justify-center text-center">
                <h1 className="text-2xl font-bold mb-4">Invitation à rejoindre {team.name}</h1>
                <p className="text-slate-400 mb-6">Vous devez être connecté avec Discord pour rejoindre l'équipe.</p>
            </div>
        );
    }

    return (
        <div className="min-h-[50vh] flex items-center justify-center">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl shadow-xl max-w-md w-full text-center">
                <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-600 mb-2">
                    Invitation reçue !
                </h1>
                <p className="text-slate-300 mb-6">
                    Voulez-vous rejoindre l'équipe <strong>{team.name}</strong> ?
                </p>
                <JoinButton token={token} userId={session.user.id} />
            </div>
        </div>
    );
}