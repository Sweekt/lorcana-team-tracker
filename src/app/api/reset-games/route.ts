import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
    try {z
        const statsDeleted = await prisma.userQueueStat.deleteMany({});

        const gamesDeleted = await prisma.game.deleteMany({});

        return NextResponse.json({
            success: true,
            message: "Nettoyage terminé !",
            gamesRemoved: gamesDeleted.count,
            statsRemoved: statsDeleted.count
        });
    } catch (error) {
        return NextResponse.json({ success: false, error }, { status: 500 });
    }
}