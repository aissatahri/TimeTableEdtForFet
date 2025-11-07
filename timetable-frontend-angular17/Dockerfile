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

# Copier les fichiers buildés
COPY --from=build /app/dist/timetable-frontend /usr/share/nginx/html

# Configuration nginx personnalisée
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Script pour utiliser le PORT de Railway
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'sed -i "s/listen 80;/listen $PORT;/g" /etc/nginx/conf.d/default.conf' >> /start.sh && \
    echo 'nginx -g "daemon off;"' >> /start.sh && \
    chmod +x /start.sh

# Exposer le port (Railway utilise $PORT)
EXPOSE $PORT

CMD ["/start.sh"]
