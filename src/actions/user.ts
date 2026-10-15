"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { revalidatePath } from "next/cache";

export async function updateUserProfile(formData: FormData) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email && !session?.user?.id) {
        return { error: "Vous devez être connecté pour faire cela." };
    }

    const hasApiKey = formData.has("lorcanaApiKey");
    const hasDreamborn = formData.has("dreambornUrl");

    const updateData: { lorcanaApiKey?: string | null; dreambornUrl?: string | null } = {};

    if (hasApiKey) {
        const lorcanaApiKey = formData.get("lorcanaApiKey") as string;
        updateData.lorcanaApiKey = lorcanaApiKey?.trim() || null;
    }

    if (hasDreamborn) {
        const dreambornUrl = formData.get("dreambornUrl") as string;
        updateData.dreambornUrl = dreambornUrl?.trim() || null;
    }

    try {
        await prisma.user.update({
            where: {
                ...(session.user.id ? { id: session.user.id } : { email: session.user.email! }),
            },
            data: updateData,
        });

        // On rafraîchit le cache pour que les modifications soient visibles partout
        revalidatePath("/settings");
        revalidatePath("/team/settings");
        revalidatePath("/");

        return { success: true };
    } catch (error) {
        console.error("Erreur lors de la mise à jour du profil:", error);
        return { error: "Une erreur est survenue lors de la sauvegarde." };
    }
}

export async function disconnectDuelsAccount() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email && !session?.user?.id) {
        return { error: "Vous devez être connecté pour faire cela." };
    }

    try {
        await prisma.user.update({
            where: {
                ...(session.user.id ? { id: session.user.id } : { email: session.user.email! }),
            },
            data: {
                duelsUserId: null,
                duelsUsername: null,
                duelsAccessToken: null,
                duelsTokenExpiresAt: null,
            },
        });

        revalidatePath("/settings");
        revalidatePath("/team/settings");
        revalidatePath("/");

        return { success: true };
    } catch (error) {
        console.error("Erreur lors de la dissociation du compte Duels.ink:", error);
        return { error: "Une erreur est survenue lors de la dissociation." };
    }
}