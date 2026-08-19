"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { NavItem } from "@/components/Navigation";

type Team = { id: string; name: string };

interface Props {
    teams: Team[];
    activeTeam: Team | undefined;
    navItems: NavItem[];
    pathname: string;
    session: any;
    handleTeamSwitch: (teamId: string) => void;
    isPending: boolean;
}

export default function MenuBurger({ teams, activeTeam, navItems, pathname, session, handleTeamSwitch, isPending }: Props) {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        document.body.style.overflow = isOpen ? "hidden" : "unset";
        return () => { document.body.style.overflow = "unset"; };
    }, [isOpen]);

    const onSwitch = (teamId: string) => {
        handleTeamSwitch(teamId);
        setIsOpen(false);
    };

    return (
        <>
            {/* BOUTON BURGER */}
            <button
                className="sm:hidden p-2 text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Toggle menu"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isOpen ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                </svg>
            </button>

            {/* MENU DÉROULANT MOBILE */}
            {isOpen && (
                <div className="sm:hidden absolute top-16 left-0 w-full bg-slate-950 border-b border-slate-800 shadow-2xl h-[calc(100vh-64px)] overflow-y-auto">
                    <div className="px-4 py-6 space-y-6">

                        {teams.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Équipe active</label>
                                <select
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 text-sm font-medium outline-none focus:border-indigo-500 transition-colors"
                                    value={activeTeam?.id || ""}
                                    onChange={(e) => onSwitch(e.target.value)}
                                    disabled={isPending}
                                >
                                    {teams.map((team) => (
                                        <option key={team.id} value={team.id}>{team.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="border-t border-slate-800/50"></div>

                        <div className="space-y-2">
                            {navItems.map((item) => {
                                const isActive = pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path));
                                return (
                                    <Link
                                        key={item.path}
                                        href={item.path}
                                        onClick={() => setIsOpen(false)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                                            isActive ? "bg-indigo-500/10 text-indigo-400" : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                                        }`}
                                    >
                                        {item.icon}
                                        <span className="text-base">{item.name}</span>
                                    </Link>
                                );
                            })}
                        </div>

                        <div className="border-t border-slate-800/50"></div>

                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-3">
                                {session.user?.image ? (
                                    <img src={session.user.image} alt="Avatar" className="w-10 h-10 rounded-full border border-slate-700 shadow-sm" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm border border-slate-700">
                                        {session.user?.name?.charAt(0).toUpperCase() || "?"}
                                    </div>
                                )}
                                <span className="font-medium text-slate-200">{session.user?.name}</span>
                            </div>

                            <button
                                onClick={() => signOut({ callbackUrl: '/' })}
                                className="flex items-center justify-center w-10 h-10 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}