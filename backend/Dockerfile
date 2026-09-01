# Image de base Node.js LTS stable
FROM node:20-alpine

# Répertoire de travail
WORKDIR /app

# Installation des dépendances système nécessaires
RUN apk add --no-cache openssl

# Copie des fichiers de dépendances
COPY package*.json ./
COPY prisma ./prisma/

# Installation des dépendances
RUN npm install

# Génération du client Prisma
RUN npx prisma generate

# Copie du code source
COPY . .

# Exposition du port
EXPOSE 5000

# Commande de démarrage
CMD ["npm", "start"]
