"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createTeam(formData: FormData, userId: string) {
    const name = formData.get("name") as string;

    if (!name || name.trim() === "") {
        return { error: "Le nom de l'équipe est requis." };
    }

    try {
        const team = await prisma.team.create({
            data: {
                name: name.trim(),
                members: {
                    create: {
                        userId: userId,
                        role: "ADMIN",
                    },
                },
            },
        });

        revalidatePath("/");

        return { success: true, teamId: team.id };
    } catch (error) {
        console.error("Erreur création team:", error);
        return { error: "Une erreur est survenue lors de la création de l'équipe." };
    }
}