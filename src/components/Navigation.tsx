"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect, useTransition } from "react";
import LeaderboardIcon from "@/assets/ic_leaderboard.svg";
import RosterIcon from "@/assets/ic_roster.svg";
import AdminIcon from "@/assets/ic_admin.svg";
import { signOut, useSession } from "next-auth/react";
import { switchTeamAction } from "@/actions/teamActions";

type Team = { id: string; name: string };
interface NavigationProps {
    teams: Team[];
    activeTeamId: string | null;
}

export default function Navigation({ teams, activeTeamId }: NavigationProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session } = useSession();

    // États pour le dropdown et la transition
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!session) return null;

    const navItems = [
        { name: "Leaderboard", icon: <LeaderboardIcon className="w-5 h-5 sm:w-4 sm:h-4" />, path: "/leaderboard" },
        { name: "Roster", icon: <RosterIcon className="w-5 h-5 sm:w-4 sm:h-4" />, path: "/roster" },
        { name: "Paramètres", icon: <AdminIcon className="w-5 h-5 sm:w-4 sm:h-4" />, path: "/settings" },
    ];

    const activeTeam = teams.find(t => t.id === activeTeamId) || teams[0];

    const handleTeamSwitch = (teamId: string) => {
        if (teamId === activeTeamId) {
            setIsDropdownOpen(false);
            return;
        }

        startTransition(async () => {
            await switchTeamAction(session.user.id, teamId);
            setIsDropdownOpen(false);
            router.refresh();
        });
    };

    return (
        <nav className="sticky top-0 z-50 w-full backdrop-blur-md bg-slate-950/80 border-b border-slate-800 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">

                {/* GAUCHE : Logo & Sélecteur d'équipe */}
                <div className="flex items-center gap-4 sm:gap-6">
                    <Link href="/" className="text-xl font-black text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-indigo-600 hover:opacity-80 transition-opacity">
                        <span className="sm:hidden">Lorcana</span>
                        <span className="hidden sm:inline">LoreTracker</span>
                    </Link>

                    {/* Team Switcher */}
                    {teams.length > 0 && (
                        <div className="relative hidden sm:block" ref={dropdownRef}>
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                disabled={isPending}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/50 hover:bg-slate-700 transition-colors text-sm font-medium ${isPending ? 'opacity-50 cursor-wait' : 'text-slate-200'}`}
                            >
                                <span className="truncate max-w-[120px]">{activeTeam?.name || "Sélectionner..."}</span>
                                <svg className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {/* Menu Déroulant */}
                            {isDropdownOpen && (
                                <div className="absolute top-full left-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden py-1">
                                    {teams.map((team) => (
                                        <button
                                            key={team.id}
                                            onClick={() => handleTeamSwitch(team.id)}
                                            className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                                                team.id === activeTeam?.id
                                                    ? 'bg-indigo-500/10 text-indigo-400 font-semibold'
                                                    : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                                            }`}
                                        >
                                            {team.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* DROITE : Liens & Profil */}
                <div className="flex items-center gap-2 sm:gap-4">
                    {/* Liens de navigation */}
                    <div className="flex items-center gap-1 sm:gap-2">
                        {navItems.map((item) => {
                            const isActive = pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path));
                            return (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    className={`flex items-center justify-center gap-2 p-3 sm:px-3 sm:py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                                        isActive
                                            ? "bg-indigo-500/10 text-indigo-400"
                                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                                    }`}
                                    title={item.name}
                                >
                                    {item.icon}
                                    <span className="hidden sm:inline">{item.name}</span>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Séparateur vertical (Desktop) */}
                    <div className="hidden sm:block w-px h-6 bg-slate-800 mx-2"></div>

                    {/* Zone Profil et Déconnexion */}
                    <div className="flex items-center gap-3 pl-2 sm:pl-0 border-l border-slate-800 sm:border-none">
                        {session.user?.image ? (
                            <img src={session.user.image} alt="Avatar" className="w-8 h-8 rounded-full border border-slate-700 shadow-sm" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs border border-slate-700">
                                {session.user?.name?.charAt(0).toUpperCase() || "?"}
                            </div>
                        )}

                        <button
                            onClick={() => signOut({ callbackUrl: '/' })}
                            className="text-slate-400 hover:text-red-400 hover:bg-red-400/10 p-2 sm:px-2 sm:py-1.5 rounded-lg transition-colors flex items-center gap-2"
                            title="Se déconnecter"
                        >
                            <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span className="hidden sm:inline text-xs font-medium">Déconnexion</span>
                        </button>
                    </div>
                </div>

            </div>
        </nav>
    );
}