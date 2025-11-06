# Guide de Déploiement sur Railway.app

Ce guide vous explique comment déployer votre application Timetable gratuitement sur Railway.app.

## 📋 Prérequis

- Un compte GitHub (gratuit)
- Un compte Railway.app (gratuit - 500 heures/mois)
- Git installé sur votre ordinateur

---

## 🚀 Étape 1 : Préparation du dépôt GitHub

### 1.1 Créer un dépôt GitHub

1. Allez sur [GitHub](https://github.com) et connectez-vous
2. Cliquez sur le bouton **"New"** (nouveau dépôt)
3. Nommez votre dépôt : `timetable-app`
4. Sélectionnez **"Private"** ou **"Public"** selon votre préférence
5. **NE PAS** cocher "Initialize with README"
6. Cliquez sur **"Create repository"**

### 1.2 Pousser votre code sur GitHub

Ouvrez PowerShell dans le dossier racine de votre projet :

```powershell
# Initialiser Git (si pas déjà fait)
cd "C:\Users\Aissa\Downloads\timetable-full\timetable-full\timetable-full"
git init

# Créer un fichier .gitignore
@"
# Backend
backend/target/
backend/.mvn/
backend/data/sessions/
backend/*.log

# Frontend
timetable-frontend-angular17/node_modules/
timetable-frontend-angular17/dist/
timetable-frontend-angular17/.angular/
timetable-frontend-angular17/coverage/

# IDE
.vscode/
.idea/
*.iml

# OS
.DS_Store
Thumbs.db
"@ | Out-File -FilePath .gitignore -Encoding UTF8

# Ajouter tous les fichiers
git add .

# Premier commit
git commit -m "Initial commit - Timetable multi-user application"

# Lier à votre dépôt GitHub (remplacez <votre-username> par votre nom d'utilisateur GitHub)
git remote add origin https://github.com/<votre-username>/timetable-app.git

# Pousser le code
git branch -M main
git push -u origin main
```

> **Note** : Remplacez `<votre-username>` par votre nom d'utilisateur GitHub.

---

## 🎯 Étape 2 : Configuration de Railway.app

### 2.1 Créer un compte Railway

1. Allez sur [Railway.app](https://railway.app)
2. Cliquez sur **"Start a New Project"**
3. Connectez-vous avec GitHub (recommandé)
4. Autorisez Railway à accéder à vos dépôts

### 2.2 Créer un nouveau projet

1. Cliquez sur **"New Project"**
2. Sélectionnez **"Deploy from GitHub repo"**
3. Choisissez votre dépôt `timetable-app`
4. Railway détectera automatiquement les Dockerfiles

---

## ⚙️ Étape 3 : Déployer le Backend

### 3.1 Configuration du service backend

1. Railway créera automatiquement un service pour le backend
2. Cliquez sur le service **backend**
3. Allez dans l'onglet **"Settings"**
4. Dans **"Root Directory"**, entrez : `backend`
5. Dans **"Start Command"** (optionnel, déjà défini dans railway.toml), vérifiez : `java -jar app.jar`

### 3.2 Configurer les variables d'environnement

1. Dans le service backend, allez à l'onglet **"Variables"**
2. Cliquez sur **"New Variable"**
3. Ajoutez ces variables :

| Variable | Valeur | Description |
|----------|--------|-------------|
| `PORT` | `8081` | Port du serveur backend |
| `CORS_ORIGINS` | `https://{frontend-url}.up.railway.app` | URL du frontend (à mettre à jour après) |
| `COOKIE_SECURE` | `true` | Active les cookies sécurisés HTTPS |

> **Important** : Pour `CORS_ORIGINS`, vous devrez revenir plus tard après le déploiement du frontend pour mettre l'URL correcte.

### 3.3 Générer le domaine backend

1. Dans le service backend, allez à l'onglet **"Settings"**
2. Scrollez jusqu'à **"Networking"**
3. Cliquez sur **"Generate Domain"**
4. Railway générera une URL comme : `https://timetable-backend-production-abc123.up.railway.app`
5. **COPIEZ CETTE URL** - vous en aurez besoin pour le frontend

### 3.4 Déployer le backend

1. Railway déploiera automatiquement après la détection du Dockerfile
2. Vérifiez les logs dans l'onglet **"Deployments"**
3. Attendez que le statut passe à **"Active"** (environ 3-5 minutes)

---

## 🌐 Étape 4 : Déployer le Frontend

### 4.1 Mettre à jour l'URL du backend dans le code

**AVANT de déployer le frontend**, vous devez mettre à jour l'URL du backend :

1. Retournez dans votre code local
2. Ouvrez le fichier : `timetable-frontend-angular17/src/environments/environment.prod.ts`
3. Remplacez `'https://your-backend-url.up.railway.app/api'` par l'URL du backend Railway que vous avez copiée + `/api`

Exemple :
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://timetable-backend-production-abc123.up.railway.app/api'
};
```

4. Sauvegardez le fichier
5. Committez et poussez le changement :

```powershell
git add timetable-frontend-angular17/src/environments/environment.prod.ts
git commit -m "Update backend URL for production"
git push
```

### 4.2 Créer un nouveau service pour le frontend

1. Dans votre projet Railway, cliquez sur **"New"** → **"Service"**
2. Sélectionnez le même dépôt `timetable-app`
3. Railway créera un deuxième service

### 4.3 Configuration du service frontend

1. Cliquez sur le nouveau service (renommez-le en "frontend" si besoin)
2. Allez dans l'onglet **"Settings"**
3. Dans **"Root Directory"**, entrez : `timetable-frontend-angular17`
4. Dans **"Start Command"**, vérifiez : `nginx -g 'daemon off;'`

### 4.4 Générer le domaine frontend

1. Dans le service frontend, allez à l'onglet **"Settings"**
2. Scrollez jusqu'à **"Networking"**
3. Cliquez sur **"Generate Domain"**
4. Railway générera une URL comme : `https://timetable-frontend-production-xyz789.up.railway.app`
5. **COPIEZ CETTE URL**

### 4.5 Mettre à jour CORS_ORIGINS du backend

1. Retournez au service **backend**
2. Allez à l'onglet **"Variables"**
3. Modifiez la variable `CORS_ORIGINS`
4. Remplacez la valeur par l'URL du frontend (sans `/api`) :
   ```
   https://timetable-frontend-production-xyz789.up.railway.app
   ```
5. Sauvegardez
6. Le backend redémarrera automatiquement avec la nouvelle configuration

### 4.6 Déployer le frontend

1. Railway déploiera automatiquement
2. Vérifiez les logs dans l'onglet **"Deployments"**
3. Attendez que le statut passe à **"Active"** (environ 5-7 minutes pour le build Angular)

---

## ✅ Étape 5 : Vérification et Tests

### 5.1 Tester l'application

1. Ouvrez l'URL du frontend dans votre navigateur
2. Testez les fonctionnalités :
   - ✅ Uploader les fichiers XML (teachers.xml, subgroups.xml, activities.xml)
   - ✅ Voir la liste des professeurs
   - ✅ Afficher un emploi du temps
   - ✅ Changer la langue FR ↔ AR
   - ✅ Renommer des professeurs/salles
   - ✅ Exporter en PDF

### 5.2 Vérifier les cookies (important pour le multi-utilisateur)

1. Ouvrez les DevTools (F12)
2. Allez dans **Application** → **Cookies**
3. Vérifiez que le cookie `TIMETABLE_SESSION` est présent après l'upload

### 5.3 Tester le multi-utilisateur

1. Ouvrez l'application dans un navigateur normal
2. Uploadez des fichiers XML
3. Ouvrez l'application dans une fenêtre de navigation privée
4. Uploadez d'AUTRES fichiers XML
5. Vérifiez que chaque session voit ses propres données

---

## 🔧 Dépannage

### Problème : CORS Error

**Symptôme** : Erreur "CORS policy blocked" dans la console

**Solution** :
1. Vérifiez que `CORS_ORIGINS` dans le backend correspond EXACTEMENT à l'URL du frontend
2. Assurez-vous qu'il n'y a PAS de `/` à la fin de l'URL
3. Vérifiez que `COOKIE_SECURE=true` est bien défini

### Problème : Cookies non envoyés

**Symptôme** : Les données ne persistent pas, chaque requête semble créer une nouvelle session

**Solution** :
1. Vérifiez que `withCredentials: true` est présent dans tous les appels HTTP (déjà fait dans le code)
2. Vérifiez que le backend et le frontend sont sur HTTPS (Railway le fait automatiquement)
3. Vérifiez dans DevTools → Network que le header `Set-Cookie` est présent dans les réponses

### Problème : Build frontend échoue

**Symptôme** : Erreur "npm install failed" ou "npm run build failed"

**Solution** :
1. Vérifiez les logs de Railway pour l'erreur exacte
2. Si c'est une erreur de peer dependencies, le Dockerfile utilise déjà `--legacy-peer-deps`
3. Vérifiez que `package.json` et `package-lock.json` sont bien dans le dépôt Git

### Problème : Backend ne démarre pas

**Symptôme** : Le service backend reste en "Building" ou crash au démarrage

**Solution** :
1. Vérifiez les logs dans Railway
2. Assurez-vous que Java 17 est utilisé (défini dans le Dockerfile)
3. Vérifiez que le fichier `pom.xml` est correct et que toutes les dépendances sont accessibles

---

## 📊 Limites du plan gratuit Railway

- **500 heures d'exécution par mois** (environ 20 jours)
- **100 GB de bande passante sortante**
- **1 GB de stockage persistent** (pour les fichiers XML uploadés)
- **Les services s'endorment après 30 minutes d'inactivité** (redémarrage automatique à la prochaine requête)

### Optimisations pour rester dans les limites :

1. **Désactiver les services quand non utilisés** :
   - Allez dans Settings → Sleep Mode → Activez si l'app n'est pas utilisée 24/7

2. **Surveiller l'utilisation** :
   - Dashboard Railway → Usage → Vérifiez vos heures restantes

---

## 🔐 Sécurité en Production

### Données sensibles déjà protégées :

✅ Cookies HTTPOnly et Secure activés  
✅ CORS configuré pour bloquer les requêtes non autorisées  
✅ Sessions isolées par utilisateur  
✅ HTTPS forcé par Railway  

### Recommandations supplémentaires :

1. **Ne pas committer de données sensibles** :
   - Les fichiers XML avec des données réelles ne doivent PAS être dans Git
   - Le dossier `backend/data/sessions/` est déjà dans `.gitignore`

2. **Limiter l'accès au dépôt GitHub** :
   - Mettez le dépôt en **Private** si nécessaire

3. **Monitorer les logs Railway** :
   - Vérifiez régulièrement les logs pour détecter des activités suspectes

---

## 📚 Ressources utiles

- [Documentation Railway](https://docs.railway.app/)
- [Railway Discord](https://discord.gg/railway) - Support communautaire
- [Documentation Spring Boot](https://spring.io/projects/spring-boot)
- [Documentation Angular](https://angular.io/docs)

---

## 🎉 Félicitations !

Votre application est maintenant déployée et accessible publiquement ! 

**URLs importantes à sauvegarder** :
- Frontend : `https://timetable-frontend-production-xyz789.up.railway.app`
- Backend : `https://timetable-backend-production-abc123.up.railway.app`
- Dashboard Railway : `https://railway.app/dashboard`

---

## 🔄 Mises à jour futures

Quand vous modifiez le code :

```powershell
# Dans le dossier du projet
git add .
git commit -m "Description de vos changements"
git push
```

Railway redéploiera automatiquement l'application dès que le push est détecté !

---

**Support** : Si vous rencontrez des problèmes, vérifiez d'abord la section Dépannage ci-dessus. Pour des questions spécifiques à Railway, consultez leur documentation ou Discord.
