# Variables d'Environnement Railway

Ce fichier liste toutes les variables d'environnement nécessaires pour déployer l'application sur Railway.app.

## 🔧 Backend Service

Configurez ces variables dans Railway Dashboard → Backend Service → Variables

| Variable | Valeur Exemple | Valeur pour Vous | Description |
|----------|----------------|------------------|-------------|
| `PORT` | `8081` | `8081` | Port du serveur Spring Boot |
| `CORS_ORIGINS` | `https://timetable-frontend-production-xyz789.up.railway.app` | `https://[VOTRE-FRONTEND-URL].up.railway.app` | URL du frontend (SANS `/` à la fin) |
| `COOKIE_SECURE` | `true` | `true` | Active les cookies sécurisés HTTPS |

### ⚠️ Important pour CORS_ORIGINS

1. Déployez d'abord le **frontend** sur Railway
2. Copiez l'URL générée par Railway (onglet Settings → Networking → Generate Domain)
3. Utilisez cette URL **exacte** dans `CORS_ORIGINS` (sans `/` à la fin)
4. Le backend redémarrera automatiquement après modification de la variable

### Exemple de configuration complète :

```
PORT=8081
CORS_ORIGINS=https://timetable-frontend-production-xyz789.up.railway.app
COOKIE_SECURE=true
```

---

## 🌐 Frontend Service

Le frontend n'a **PAS besoin** de variables d'environnement dans Railway.

L'URL du backend est configurée dans le code source avant le build :
- Fichier : `timetable-frontend-angular17/src/environments/environment.prod.ts`
- Contenu :
  ```typescript
  export const environment = {
    production: true,
    apiUrl: 'https://[VOTRE-BACKEND-URL].up.railway.app/api'
  };
  ```

### Processus de mise à jour de l'URL backend :

1. Déployez le **backend** sur Railway
2. Copiez l'URL générée (onglet Settings → Networking → Generate Domain)
3. Modifiez `environment.prod.ts` avec cette URL + `/api`
4. Committez et poussez vers GitHub :
   ```powershell
   git add timetable-frontend-angular17/src/environments/environment.prod.ts
   git commit -m "Update backend URL for production"
   git push
   ```
5. Railway redéploiera automatiquement le frontend

---

## 📝 Ordre de déploiement recommandé

1. **Backend d'abord** :
   - Pusher le code sur GitHub
   - Créer le service backend sur Railway
   - Configurer les variables (vous pouvez mettre une URL temporaire pour CORS_ORIGINS)
   - Noter l'URL générée du backend

2. **Mettre à jour le code frontend** :
   - Modifier `environment.prod.ts` avec l'URL du backend
   - Committer et pusher

3. **Frontend ensuite** :
   - Créer le service frontend sur Railway
   - Attendre le déploiement
   - Noter l'URL générée du frontend

4. **Finaliser CORS** :
   - Retourner au backend
   - Mettre à jour `CORS_ORIGINS` avec l'URL réelle du frontend
   - Le backend redémarrera automatiquement

---

## 🔍 Vérification de la configuration

### Tester CORS :

Ouvrez la console du navigateur (F12) sur le frontend et exécutez :

```javascript
fetch('https://[VOTRE-BACKEND-URL].up.railway.app/api/teachers', {
  credentials: 'include'
})
  .then(r => r.json())
  .then(data => console.log('✅ CORS OK:', data))
  .catch(err => console.error('❌ CORS Error:', err));
```

Si vous voyez "✅ CORS OK", la configuration est correcte.

### Tester les cookies :

1. Uploadez des fichiers XML via l'interface
2. Ouvrez DevTools (F12) → Application → Cookies
3. Vérifiez que `TIMETABLE_SESSION` apparaît avec :
   - `HttpOnly`: ✅
   - `Secure`: ✅
   - `SameSite`: Lax

---

## 🐛 Débogage des variables

### Backend logs :

Dans Railway Dashboard → Backend Service → Deployments → View Logs

Cherchez ces lignes au démarrage :

```
✓ PORT: 8081
✓ CORS_ORIGINS: https://timetable-frontend-production-xyz789.up.railway.app
✓ COOKIE_SECURE: true
```

### Erreur CORS commune :

**Erreur** :
```
Access to fetch at 'https://backend.up.railway.app/api/teachers' from origin 'https://frontend.up.railway.app' has been blocked by CORS policy
```

**Cause** : `CORS_ORIGINS` ne correspond pas exactement à l'URL du frontend

**Solution** :
1. Vérifiez l'URL exacte du frontend (pas de `/` à la fin)
2. Vérifiez qu'il n'y a pas d'espaces avant/après dans la variable
3. Redémarrez le backend après modification

---

## 🔐 Sécurité

### Variables sensibles

✅ **CORS_ORIGINS** : Publique - protège contre les requêtes non autorisées  
✅ **COOKIE_SECURE** : Publique - force HTTPS pour les cookies  
✅ **PORT** : Publique - Railway gère le port automatiquement  

Aucune variable secrète (comme API keys) n'est nécessaire pour cette application.

### Données utilisateur

- Les sessions sont stockées en mémoire (RAM) avec timeout de 8 heures
- Les fichiers XML uploadés sont sauvegardés dans `data/sessions/{sessionId}/`
- **IMPORTANT** : Railway efface les fichiers à chaque redéploiement si vous n'utilisez pas de volume persistant

Pour persister les fichiers entre déploiements, ajoutez un **Railway Volume** :
1. Backend Service → Settings → Add Volume
2. Mount Path : `/app/data`
3. Size : 1 GB (gratuit)

---

## 📊 Monitoring

### Vérifier l'utilisation :

Railway Dashboard → Usage

- **Heures d'exécution** : Maximum 500h/mois gratuit
- **Bande passante** : Maximum 100 GB/mois gratuit
- **Stockage** : 1 GB gratuit avec volume

### Optimiser la consommation :

1. **Sleep Mode** : Activez pour les environnements de test
   - Settings → Enable Sleep Mode
   - Le service s'arrête après 30 min d'inactivité
   - Redémarre automatiquement à la prochaine requête

2. **Surveiller les redéploiements** :
   - Chaque push GitHub = nouveau déploiement
   - Regroupez vos commits avant de pusher

---

**Support** : Si une variable ne fonctionne pas, vérifiez les logs Railway et assurez-vous que la syntaxe est exacte (pas d'espaces, pas de guillemets).
