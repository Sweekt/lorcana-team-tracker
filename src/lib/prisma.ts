import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// On utilise l'URL de connexion définie dans le .env
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// On passe l'adaptateur au constructeur de Prisma v7
const prisma = new PrismaClient({ adapter });

export default prisma;