"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { revalidatePath } from "next/cache";

export async function updateUserProfile(formData: FormData) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return { error: "Vous devez être connecté pour faire cela." };
    }

    const lorcanaApiKey = formData.get("lorcanaApiKey") as string;
    const dreambornUrl = formData.get("dreambornUrl") as string;

    try {
        await prisma.user.update({
            where: { email: session.user.email },
            data: {
                lorcanaApiKey: lorcanaApiKey?.trim() || null,
                dreambornUrl: dreambornUrl?.trim() || null,
            }
        });

        // On rafraîchit le cache pour que les modifications soient visibles partout
        revalidatePath("/settings");
        revalidatePath("/");

        return { success: true };
    } catch (error) {
        console.error("Erreur lors de la mise à jour du profil:", error);
        return { error: "Une erreur est survenue lors de la sauvegarde." };
    }
}