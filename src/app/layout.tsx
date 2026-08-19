import Navigation from "@/components/Navigation";
import "./globals.css";
import {Metadata} from "next";
import {Toaster} from "sonner";
import AuthProvider from "@/components/AuthProvider";
import Footer from "@/components/Footer";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";

export const metadata : Metadata = {
  title: "LoreTracker",
  description: "Suivez le classement et l'historique de votre équipe sur Duels.ink",
};

export default async function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    let userTeams: { id: string; name: string }[] = [];
    let activeTeamId: string | null = null;

    if (session?.user?.id) {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                activeTeamId: true,
                teams: {
                    select: {
                        team: {
                            select: { id: true, name: true }
                        }
                    }
                }
            }
        });

        if (user) {
            activeTeamId = user.activeTeamId;
            userTeams = user.teams.map(t => ({ id: t.team.id, name: t.team.name }));
        }
    }

    return (
        <html lang="fr">
            <body className="flex flex-col min-h-dvh bg-slate-950 text-slate-200">
            <AuthProvider>
                <Navigation teams={userTeams} activeTeamId={activeTeamId} />

                <main className="flex-1 flex flex-col w-full">
                    {children}
                </main>

                <Footer/>

                <Toaster
                    theme="dark"
                    position="bottom-right"
                    richColors
                    toastOptions={{
                        style: {
                            background: '#0f172a',
                            borderColor: '#1e293b',
                            color: '#e2e8f0',
                        }
                    }}
                />
                </AuthProvider>
            </body>
        </html>
    );
};