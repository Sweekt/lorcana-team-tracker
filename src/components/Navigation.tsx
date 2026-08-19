"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { useSession } from "next-auth/react";
import { switchTeamAction } from "@/actions/team";

import LeaderboardIcon from "@/assets/ic_leaderboard.svg";
import RosterIcon from "@/assets/ic_roster.svg";
import AdminIcon from "@/assets/ic_admin.svg";

import TeamSwitcherDesktop from "@/components/TeamSwitcherDesktop";
import MenuDesktop from "@/components/MenuDesktop";
import MenuBurger from "@/components/MenuBurger";

type Team = { id: string; name: string };

export type NavItem = {
    name: string;
    icon: React.ReactNode;
    path: string;
};

interface NavigationProps {
    teams: Team[];
    activeTeamId: string | null;
}

export default function Navigation({ teams, activeTeamId }: NavigationProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session } = useSession();
    const [isPending, startTransition] = useTransition();

    if (!session) return null;

    const navItems: NavItem[] = [
        { name: "Leaderboard", icon: <LeaderboardIcon className="w-5 h-5 sm:w-4 sm:h-4" />, path: "/leaderboard" },
        { name: "Roster", icon: <RosterIcon className="w-5 h-5 sm:w-4 sm:h-4" />, path: "/roster" },
        { name: "Paramètres", icon: <AdminIcon className="w-5 h-5 sm:w-4 sm:h-4" />, path: "/settings" },
    ];

    const activeTeam = teams.find(t => t.id === activeTeamId) || teams[0];

    const handleTeamSwitch = (teamId: string) => {
        if (teamId === activeTeamId) return;

        startTransition(async () => {
            await switchTeamAction(session.user.id, teamId);
            router.refresh();
        });
    };

    return (
        <nav className="sticky top-0 z-50 w-full backdrop-blur-md bg-slate-950/80 border-b border-slate-800 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">

                {/* PARTIE GAUCHE (Logo + Sélecteur PC) */}
                <div className="flex items-center gap-4 sm:gap-6">
                    <Link href="/" className="text-xl font-black text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-indigo-600 hover:opacity-80 transition-opacity">
                        <span className="sm:hidden">Lorcana</span>
                        <span className="hidden sm:inline">LoreTracker</span>
                    </Link>

                    <TeamSwitcherDesktop
                        teams={teams}
                        activeTeam={activeTeam}
                        handleTeamSwitch={handleTeamSwitch}
                        isPending={isPending}
                    />
                </div>

                {/* PARTIE DROITE (Liens & Profil PC) */}
                <MenuDesktop
                    navItems={navItems}
                    pathname={pathname}
                    session={session}
                />

                {/* BOUTON ET MENU MOBILE */}
                <MenuBurger
                    teams={teams}
                    activeTeam={activeTeam}
                    navItems={navItems}
                    pathname={pathname}
                    session={session}
                    handleTeamSwitch={handleTeamSwitch}
                    isPending={isPending}
                />

            </div>
        </nav>
    );
}