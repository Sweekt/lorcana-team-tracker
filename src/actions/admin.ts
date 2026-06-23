"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function addPlayer(formData: FormData) {
    const name = formData.get("name") as string;
    const apiToken = formData.get("apiToken") as string;

    if (name && apiToken) {
        await prisma.player.create({ data: { name, apiToken } });
        revalidatePath("/admin"); // Rafraîchit la page admin
        revalidatePath("/");      // Rafraîchit le classement
    }
}

export async function deletePlayer(formData: FormData) {
    const id = formData.get("id") as string;
    if (id) {
        await prisma.player.delete({ where: { id } });
        revalidatePath("/admin");
        revalidatePath("/");
    }
}

export async function toggleQueue(formData: FormData) {
    const id = formData.get("id") as string;
    const isActive = formData.get("isActive") === "true"; // la valeur actuelle

    if (id) {
        await prisma.queueConfig.upsert({
            where: { id },
            update: { isActive: !isActive }, // On inverse l'état
            create: { id, isActive: !isActive },
        });
        revalidatePath("/admin");
        revalidatePath("/");
    }
}