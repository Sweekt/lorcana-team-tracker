import Navigation from "@/components/Navigation";
import "./globals.css";
import {Metadata} from "next";
import {Toaster} from "sonner";
import AuthProvider from "@/components/AuthProvider";

export const metadata : Metadata = {
  title: "Lorcana Team Tracker",
  description: "Suivez le classement et l'historique de l'équipe",
};

export default function RootLayout({
                                     children,
                                   }: {
  children: React.ReactNode;
}) {
    return (
        <html lang="fr">
        <body className="bg-slate-950 text-slate-200 min-h-screen flex flex-col">
            <AuthProvider>
                <Navigation/>

                <div className="flex-1">
                    {children}
                </div>
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
}