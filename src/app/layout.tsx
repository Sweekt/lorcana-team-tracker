import Navigation from "@/components/Navigation";
import "./globals.css";
import {Metadata} from "next";

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
      <Navigation />

      <div className="flex-1">
        {children}
      </div>
      </body>
      </html>
  );
}