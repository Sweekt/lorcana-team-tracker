"use client";

import { kickMember, updateTeamQueues, updateTeamLogo } from "@/actions/team";
import { toast } from "sonner";
import { useState } from "react";

export default function TeamSettingsForm({ team, availableQueues, inviteLink }: any) {
    const [isSaving, setIsSaving] = useState(false);
    const [logoPreview, setLogoPreview] = useState(team.logoUrl || "");
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 1024 * 1024) {
            toast.error("L'image est trop volumineuse (maximum 1 Mo).");
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setLogoPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleSaveLogo = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsUploadingLogo(true);

        const formData = new FormData();
        formData.append("logo", logoPreview);

        const result = await updateTeamLogo(team.id, formData);
        if (result.error) toast.error(result.error);
        else toast.success("Logo mis à jour avec succès !");

        setIsUploadingLogo(false);
    };

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
            {/* SECTION LOGO D'ÉQUIPE */}
            <section className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm">
                <h2 className="text-lg font-bold text-slate-200 mb-4">Logo de l'équipe</h2>

                <form onSubmit={handleSaveLogo} className="flex flex-col sm:flex-row items-center gap-6">
                    {/* Prévisualisation */}
                    <div className="shrink-0">
                        {logoPreview ? (
                            <img src={logoPreview} alt="Logo preview" className="w-24 h-24 rounded-xl object-cover border border-slate-700 shadow-inner" />
                        ) : (
                            <div className="w-24 h-24 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 text-sm font-medium">
                                Aucun logo
                            </div>
                        )}
                    </div>

                    <div className="flex-1 space-y-3 w-full">
                        <input
                            type="file"
                            accept="image/png, image/jpeg, image/webp"
                            onChange={handleLogoChange}
                            className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/10 file:text-indigo-400 hover:file:bg-indigo-500/20 file:cursor-pointer file:transition-colors"
                        />
                        <p className="text-xs text-slate-500">Formats acceptés : JPG, PNG, WEBP. Taille maximale : 1 Mo.</p>

                        <button
                            type="submit"
                            disabled={isUploadingLogo || !logoPreview || logoPreview === team.logoUrl}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                            {isUploadingLogo ? "Sauvegarde..." : "Enregistrer le logo"}
                        </button>
                    </div>
                </form>
            </section>

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

            <section className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm">
                <h2 className="text-lg font-bold text-slate-200 mb-4">Membres de l'équipe</h2>
                <div className="space-y-3">
                    {team.members.map((member: any) => (
                        <div key={member.userId} className={`flex items-center justify-between p-3 bg-slate-950 rounded-lg border ${member.user.lorcanaApiKey ? `border-red-500` : `border-slate-800/50`}`}>
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