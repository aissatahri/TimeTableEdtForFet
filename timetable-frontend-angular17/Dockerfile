# Dockerfile pour le Frontend Angular
FROM node:20-alpine AS build

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci --legacy-peer-deps

# Copier le code source
COPY . .

# Build de production (Angular 17 n'a pas de config 'production' par défaut)
RUN npm run build

# Serveur nginx pour servir l'application
FROM nginx:alpine

# Copier les fichiers buildés (utiliser le bon chemin)
COPY --from=build /app/dist/timetable-frontend/browser /usr/share/nginx/html

# Configuration nginx personnalisée
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exposer le port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
