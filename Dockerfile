# Utilise une image Node légère
FROM node:20-alpine

# Crée le dossier de l'app
WORKDIR /app

# Copie les dépendances et installe-les
COPY package*.json ./
RUN npm install

# Copie tout le reste du code (y compris le dossier prisma)
COPY . .

# Génère le client Prisma (Indispensable avant le build !)
RUN npx prisma generate

# Construit l'application Next.js
RUN npm run build

# Synchronise la base de données puis lance le serveur
CMD npx prisma db push --accept-data-loss && npm start

# Expose le port 3000
EXPOSE 3000