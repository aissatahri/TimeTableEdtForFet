# 📅 Gestionnaire d'Emplois du Temps / Timetable Manager

Application complète pour la gestion et l'affichage d'emplois du temps scolaires avec support bilingue (Français/Arabe) et **architecture multi-utilisateurs**.

## ✨ Nouveautés v2.0

- 🔐 **Multi-utilisateurs** : Chaque utilisateur a ses propres données isolées par session
- ☁️ **Déploiement Railway** : Configuration complète pour hébergement gratuit
- 🍪 **Sessions sécurisées** : Cookies HTTPOnly avec timeout de 8 heures
- 🐳 **Docker** : Conteneurisation complète backend + frontend
- 🔄 **Auto-redéploiement** : Push GitHub → Déploiement automatique

## 🚀 Démarrage Rapide

### Développement Local

#### Prérequis
- Java 17+ (pour le backend Spring Boot)
- Node.js 18+ et npm (pour le frontend Angular)
- Maven 3.6+ (pour le build backend)

#### 1. Démarrer le Backend
```powershell
cd backend
mvn clean package -DskipTests
java -jar target/timetable-backend-0.0.1-SNAPSHOT.jar
```
Le backend sera accessible sur **http://localhost:8081**

#### 2. Démarrer le Frontend
```powershell
cd timetable-frontend-angular17
npm install
npm start
```
Le frontend sera accessible sur **http://localhost:4200**

### ☁️ Déploiement sur Railway (GRATUIT)

**Guide complet** : Voir [DEPLOYMENT.md](./DEPLOYMENT.md)

**Résumé rapide** :
1. Pusher le code sur GitHub
2. Créer un compte sur [Railway.app](https://railway.app)
3. Déployer depuis votre dépôt GitHub
4. Configurer les variables d'environnement (voir [RAILWAY_ENV_VARS.md](./RAILWAY_ENV_VARS.md))

**Script automatique** :
```powershell
.\prepare-deployment.ps1
```

## 📁 Structure du Projet

```
├── backend/                    # Backend Spring Boot
│   ├── src/main/java/         # Code source Java
│   ├── data/                  # Fichiers XML (chargés automatiquement)
│   └── target/                # Artifacts compilés
├── timetable-frontend-angular17/  # Frontend Angular 17
│   ├── src/app/               # Composants Angular
│   └── src/assets/            # Ressources statiques
└── *.xml                      # Fichiers d'exemple FET
```

## 🔧 Fonctionnalités

### Backend (Spring Boot)
- ✅ **Architecture Multi-utilisateurs** : Sessions isolées avec timeout 8h
- ✅ **API REST** pour emplois du temps
- ✅ **Parser XML** FET (Free Timetabling Software)
- ✅ **Chargement automatique** des données au démarrage
- ✅ **Endpoints** : professeurs, classes, salles vacantes
- ✅ **Renommage** professeurs/salles via API
- ✅ **CORS** configuré avec credentials
- ✅ **Stockage par session** : Chaque utilisateur a ses propres fichiers

### Frontend (Angular 17)
- ✅ **Interface bilingue** (FR/AR) avec RTL
- ✅ **Upload** fichiers XML (teachers, subgroups, activities)
- ✅ **Affichage** emplois du temps professeurs/classes
- ✅ **Export PDF** avec polices arabes optimisées
- ✅ **Salles vacantes** par créneaux
- ✅ **Configuration** renommage professeurs/salles
- ✅ **Cookies de session** : Données persistantes pendant 8h
- ✅ **Système de dons** : Modal avec RIB et numéro de téléphone

## 🎨 Support Arabe dans les PDF - **AMÉLIORÉ**

### Polices Utilisées (par ordre de priorité)
1. **Cairo** - Police moderne Google Fonts ⭐
2. **Tajawal** - Police lisible pour l'arabe ⭐
3. **Almarai** - Police clean et professionnelle ⭐
4. **Noto Naskh Arabic** - Police Google Fonts standard
5. **Amiri** - Police traditionnelle
6. **Arabic Fallback** - Polices système (Tahoma, Arial Unicode MS)

### Configuration PDF Avancée
- ✅ **Polices multiples** avec fallback robuste
- ✅ **Font-features** complètes : `liga`, `calt`, `kern`, `mark`, `mkmk`, `ccmp`
- ✅ **Application directe** sur éléments DOM avant capture
- ✅ **Délai d'attente** polices augmenté (5s)
- ✅ **Vérification** chargement polices multiples
- ✅ **Letter-spacing** optimisé (0.03em)
- ✅ **Line-height** adapté pour l'arabe (1.6-1.7)

## 📊 Endpoints API

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/upload` | Upload fichiers XML |
| GET | `/api/teachers` | Liste professeurs par matière |
| GET | `/api/subgroups` | Liste des classes |
| GET | `/api/timetable/teacher/{name}` | Emploi du temps professeur |
| GET | `/api/timetable/subgroup/{name}` | Emploi du temps classe |
| GET | `/api/rooms/vacant` | Salles vacantes |
| POST | `/api/rename/teacher` | Renommer professeur |
| POST | `/api/rename/room` | Renommer salle |

## 🗂️ Fichiers XML Requis

L'application nécessite 3 fichiers XML exportés depuis FET :

1. **`*_teachers.xml`** - Emplois du temps des professeurs
2. **`*_subgroups.xml`** - Emplois du temps des classes/groupes
3. **`*_activities.xml`** - Liste des activités

### Chargement Automatique
Les fichiers peuvent être placés dans `backend/data/` avec les noms :
- `teachers.xml`
- `subgroups.xml`
- `activities.xml`

Ils seront chargés automatiquement au démarrage du backend.

## 🔄 Workflow d'Utilisation

1. **Préparer les données** : Exporter les 3 fichiers XML depuis FET
2. **Démarrer** backend et frontend
3. **Uploader** les fichiers XML via l'interface web
4. **Consulter** les emplois du temps par professeur ou classe
5. **Configurer** les renommages si nécessaire
6. **Exporter** en PDF (individuel ou en lot) avec polices arabes optimisées

## 🚨 Dépannage

### PDF avec noms arabes mal affichés
- ✅ **RÉSOLU** : Polices multiples avec fallback robuste
- ✅ **RÉSOLU** : Application directe des styles sur DOM
- ✅ **RÉSOLU** : Délai d'attente polices augmenté
- Vérifier connexion internet pour Google Fonts

### Backend ne démarre pas
- Vérifier Java 17+ installé : `java -version`
- Port 8081 libre : `netstat -an | findstr 8081`

### Frontend ne compile pas
- Vérifier Node.js : `node -v` (>= 18)
- Nettoyer cache : `npm cache clean --force`
- Réinstaller : `rm -rf node_modules && npm install`

## 📝 Notes de Version

### v2.0.0 - Version Multi-utilisateurs (Actuelle)
- 🔥 **NOUVEAU** : Architecture multi-utilisateurs avec sessions isolées
- 🔥 **NOUVEAU** : Configuration complète pour déploiement Railway
- 🔥 **NOUVEAU** : Dockerfiles optimisés (multi-stage builds)
- 🔥 **NOUVEAU** : Système de dons avec modal
- 🔥 **NOUVEAU** : Sélecteur de langue avec drapeaux SVG
- ✅ **AMÉLIORÉ** : Gestion des cookies avec credentials
- ✅ **AMÉLIORÉ** : Configuration environnement (dev/prod)
- ✅ **AMÉLIORÉ** : Stockage par session (data/sessions/{id}/)
- ✅ **AMÉLIORÉ** : Timeout session configurable (8h par défaut)

### v1.1.0 - Polices Arabes
- ✅ **NOUVEAU** : Polices arabes multiples (Cairo, Tajawal, Almarai)
- ✅ **AMÉLIORÉ** : Configuration PDF avancée pour l'arabe
- ✅ **AMÉLIORÉ** : Application directe des styles DOM
- ✅ **AMÉLIORÉ** : Délai d'attente polices (5s)
- ✅ Backend Spring Boot complet
- ✅ Frontend Angular 17 avec support RTL
- ✅ Interface bilingue FR/AR

## 📚 Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** : Guide complet de déploiement Railway
- **[RAILWAY_ENV_VARS.md](./RAILWAY_ENV_VARS.md)** : Variables d'environnement détaillées
- **[prepare-deployment.ps1](./prepare-deployment.ps1)** : Script automatique de préparation
- **[CONFIGURATION_ETABLISSEMENT.md](./CONFIGURATION_ETABLISSEMENT.md)** : Configuration école

## 🤝 Contribution

Le projet est structuré pour faciliter les extensions :
- Ajouter de nouveaux parsers XML
- Implémenter d'autres formats d'export
- Ajouter des langues supplémentaires
- Intégrer avec d'autres systèmes de planning
