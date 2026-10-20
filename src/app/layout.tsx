import Navigation from "@/components/Navigation";
import "./globals.css";
import { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import AuthProvider from "@/components/AuthProvider";
import Footer from "@/components/Footer";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";

const siteUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "https://loretracker.fr";

export const viewport: Viewport = {
  themeColor: "#6366f1",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`),
  title: {
    default: "LoreTracker",
    template: "%s | LoreTracker",
  },
  description: "Suivez le classement et l'historique de votre équipe sur Duels.ink",
  openGraph: {
    title: "LoreTracker - Dominez la compétition Lorcana",
    description: "Suivez le classement et l'historique de votre équipe sur Duels.ink",
    url: "/",
    siteName: "LoreTracker",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LoreTracker - Dominez la compétition Lorcana",
    description: "Suivez le classement et l'historique de votre équipe sur Duels.ink",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon.png", type: "image/png" },
    ],
    shortcut: "/icon.svg",
    apple: "/icon.png",
  },
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