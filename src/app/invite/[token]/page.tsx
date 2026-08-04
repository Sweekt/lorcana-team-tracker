import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import JoinButton from "@/components/JoinButton";

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
            <div className="min-h-[50vh] flex items-center justify-center p-4">
                <div className="bg-slate-900/50 backdrop-blur-md border border-indigo-500/20 p-8 rounded-xl shadow-xl shadow-indigo-500/10 max-w-md w-full text-center">
                    <h1 className="text-2xl font-black text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-indigo-600 mb-4">
                        Rejoindre {team.name}
                    </h1>
                    <p className="text-slate-300 mb-8">
                        Vous devez être connecté avec Discord pour accepter cette invitation.
                    </p>
                    <Link
                        href={`/api/auth/signin?callbackUrl=/invite/${token}`}
                        className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
                        </svg>
                        Se connecter avec Discord
                    </Link>
                </div>
            </div>
        );
    }

    const isMember = await prisma.teamMember.findUnique({
        where: {
            userId_teamId: {
                userId: session.user.id,
                teamId: team.id
            }
        }
    });

    // 3. UTILISATEUR DÉJÀ MEMBRE : Action Serveur intégrée pour switcher et rediriger
    if (isMember) {
        async function activateTeamAndRedirect() {
            "use server";
            await prisma.user.update({
                where: { id: session.user.id },
                data: { activeTeamId: team.id }
            });
            redirect("/");
        }

        return (
            <div className="min-h-[50vh] flex items-center justify-center p-4">
                <div className="bg-slate-900/50 backdrop-blur-md border border-indigo-500/20 p-8 rounded-xl shadow-xl shadow-indigo-500/10 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
                        <span className="text-2xl">🎉</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-100 mb-2">Déjà membre !</h1>
                    <p className="text-slate-300 mb-8">
                        Vous faites déjà partie de l'équipe <strong>{team.name}</strong>.
                    </p>
                    <form action={activateTeamAndRedirect}>
                        <button
                            type="submit"
                            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors"
                        >
                            Aller au Hub de l'équipe
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[50vh] flex items-center justify-center p-4">
            <div className="bg-slate-900/50 backdrop-blur-md border border-indigo-500/20 p-8 rounded-xl shadow-xl shadow-indigo-500/10 max-w-md w-full text-center">
                <h1 className="text-2xl font-black text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-indigo-600 mb-2">
                    Invitation reçue !
                </h1>
                <p className="text-slate-300 mb-8">
                    Voulez-vous rejoindre l'équipe <strong>{team.name}</strong> ?
                </p>
                <JoinButton token={token} userId={session.user.id} />
            </div>
        </div>
    );
}