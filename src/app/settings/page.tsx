import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import ProfileForm from "./ProfileForm";

export default async function SettingsPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        redirect("/");
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
            lorcanaApiKey: true,
            dreambornUrl: true,
        }
    });

    if (!user) {
        redirect("/");
    }

    return (
        <div className="flex-1 flex flex-col bg-slate-950 relative overflow-hidden">
            <main className="flex-1 w-full max-w-2xl mx-auto p-4 sm:p-6">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-200">Paramètres Utilisateur</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Gérez vos connexions externes et clés d'API.
                    </p>
                </div>

                <ProfileForm user={user} />
            </main>
        </div>
    );
}