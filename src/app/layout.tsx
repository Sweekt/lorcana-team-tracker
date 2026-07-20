import Navigation from "@/components/Navigation";
import "./globals.css";
import {Metadata} from "next";
import {Toaster} from "sonner";
import AuthProvider from "@/components/AuthProvider";
import Footer from "@/components/Footer";

export const metadata : Metadata = {
  title: "LoreTracker",
  description: "Suivez le classement et l'historique de votre équipe sur Duels.ink",
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <html lang="fr">
        <body className="bg-slate-950 text-slate-200 min-h-dvh">
        <AuthProvider>
            <Navigation/>

            {children}

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