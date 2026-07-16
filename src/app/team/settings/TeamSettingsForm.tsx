"use client";

import { kickMember, updateTeamQueues } from "@/actions/team";
import { toast } from "sonner";
import { useState } from "react";

export default function TeamSettingsForm({ team, availableQueues, inviteLink, currentUserId }: any) {
    const [isSaving, setIsSaving] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(inviteLink);
        toast.success("Lien d'invitation copié !");
    };

    const handleKick = async (userId: string, userName: string) => {
        if (!confirm(`Voulez-vous vraiment expulser ${userName} de l'équipe ?`)) return;

        const result = await kickMember(userId, team.id);
        if (result.error) toast.error(result.error);
        else toast.success(`${userName} a été expulsé.`);
    };

    const handleSaveQueues = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSaving(true);
        const formData = new FormData(e.currentTarget);

        const result = await updateTeamQueues(team.id, formData);
        if (result.error) toast.error(result.error);
        else toast.success("Formats mis à jour avec succès !");

        setIsSaving(false);
    };

    return (
        <div className="space-y-8">
            {/* SECTION 1 : LIEN D'INVITATION */}
            <section className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm">
                <h2 className="text-lg font-bold text-slate-200 mb-4">Lien d'invitation secret</h2>
                <div className="flex gap-2">
                    <input
                        type="text"
                        readOnly
                        value={inviteLink}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-400 font-mono text-sm outline-none"
                    />
                    <button onClick={handleCopy} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                        Copier
                    </button>
                </div>
            </section>

            {/* SECTION 2 : MEMBRES */}
            <section className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm">
                <h2 className="text-lg font-bold text-slate-200 mb-4">Membres de l'équipe</h2>
                <div className="space-y-3">
                    {team.members.map((member: any) => (
                        <div key={member.userId} className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800/50">
                            <div className="flex items-center gap-3">
                                <img src={member.user.image || ""} alt="" className="w-8 h-8 rounded-full border border-slate-700" />
                                <div>
                                    <p className="text-slate-200 font-medium leading-none">{member.user.name}</p>
                                    <p className="text-xs text-slate-500 mt-1">{member.role === "ADMIN" ? "👑 Capitaine" : "Membre"}</p>
                                </div>
                            </div>

                            {member.role !== "ADMIN" && (
                                <button
                                    onClick={() => handleKick(member.userId, member.user.name)}
                                    className="text-xs text-red-400 hover:text-red-300 font-medium px-3 py-1 rounded bg-red-400/10 hover:bg-red-400/20 transition-colors"
                                >
                                    Expulser
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* SECTION 3 : FORMATS ACTIFS */}
            <section className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm">
                <h2 className="text-lg font-bold text-slate-200 mb-2">Formats autorisés</h2>
                <p className="text-sm text-slate-500 mb-4">Sélectionnez les files d'attente qui s'afficheront sur le tableau de bord de votre équipe.</p>

                <form onSubmit={handleSaveQueues}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                        {availableQueues.map((queue: any) => (
                            <label key={queue.id} className="flex items-center gap-3 p-3 border border-slate-800 rounded-lg cursor-pointer hover:bg-slate-800/50 transition-colors">
                                <input
                                    type="checkbox"
                                    name="queues"
                                    value={queue.id}
                                    defaultChecked={(team.activeQueues || []).includes(queue.id)}
                                    className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-600 focus:ring-offset-slate-900 bg-slate-950"
                                />
                                <span className="text-slate-300 font-medium">{queue.label}</span>
                            </label>
                        ))}
                    </div>
                    <button type="submit" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50">
                        {isSaving ? "Sauvegarde..." : "Enregistrer les formats"}
                    </button>
                </form>
            </section>
        </div>
    );
}