# Solution Multi-Utilisateurs pour Timetable Manager

## Problème Actuel

Le backend actuel stocke les données en mémoire dans des variables de classe :
```java
private Map<String, Map<...>> teachers = new HashMap<>();
private Map<String, Map<...>> subgroups = new HashMap<>();
```

**Résultat** : Tous les utilisateurs partagent les mêmes données. Si quelqu'un upload de nouveaux fichiers XML, cela écrase les données pour tout le monde.

## Solutions Possibles

### Option 1 : Sessions HTTP avec Stockage Par Utilisateur (⭐ Recommandée - Simple)

**Principe** :
- Chaque utilisateur reçoit un ID de session unique
- Les données sont stockées dans des dossiers séparés : `data/session_abc123/`
- Le backend maintient une Map : `sessionId -> données`

**Avantages** :
- ✅ Pas de base de données nécessaire
- ✅ Simple à implémenter
- ✅ Chaque utilisateur a ses propres fichiers XML
- ✅ Fonctionne sans authentification

**Inconvénients** :
- ❌ Données perdues si le serveur redémarre (sauf si on sauvegarde sur disque)
- ❌ Pas de persistence à long terme
- ❌ Sessions expirent après inactivité

**Implémentation** :
```java
// Dans TimetableController.java
private Map<String, UserData> sessions = new ConcurrentHashMap<>();

class UserData {
    Map<String, Map<...>> teachers;
    Map<String, Map<...>> subgroups;
    List<ActivitySlot> activities;
    Map<String, String> teacherMappings;
    Map<String, String> roomMappings;
}

@PostMapping("/upload")
public ResponseEntity<?> upload(
    @RequestParam("teachersXml") MultipartFile teachersXml,
    HttpSession session
) {
    String sessionId = session.getId();
    UserData userData = sessions.computeIfAbsent(sessionId, k -> new UserData());
    
    // Sauvegarder dans data/sessions/{sessionId}/
    Path userDir = Paths.get(DATA_DIR, "sessions", sessionId);
    Files.createDirectories(userDir);
    
    // Parser et stocker dans userData
    userData.teachers = TimetableParser.parseTeachers(...);
    
    return ResponseEntity.ok("Upload réussi");
}
```

**Frontend** :
- Aucun changement nécessaire
- Les cookies de session sont gérés automatiquement par le navigateur

---

### Option 2 : Authentification avec Comptes Utilisateurs

**Principe** :
- Système de login/mot de passe
- Base de données (PostgreSQL, MySQL, ou H2)
- Chaque utilisateur a un compte avec ses propres données

**Avantages** :
- ✅ Persistence totale
- ✅ Sécurité renforcée
- ✅ Multi-appareils (même utilisateur sur PC et mobile)
- ✅ Gestion des droits (admin, professeur, etc.)

**Inconvénients** :
- ❌ Complexité élevée
- ❌ Nécessite base de données
- ❌ Nécessite JWT ou sessions sécurisées
- ❌ Beaucoup de code à ajouter

**Technologies nécessaires** :
- Spring Security
- JWT (JSON Web Tokens)
- Base de données (JPA/Hibernate)
- Frontend : système de login

---

### Option 3 : Multi-Tenancy avec Code d'Établissement

**Principe** :
- Chaque établissement scolaire a un code unique (ex: "LYCEE_CASABLANCA_2025")
- L'utilisateur entre ce code au démarrage
- Les données sont isolées par code d'établissement

**Avantages** :
- ✅ Simple à utiliser
- ✅ Plusieurs personnes du même établissement partagent les données
- ✅ Pas de compte utilisateur nécessaire
- ✅ Persistence sur disque possible

**Inconvénients** :
- ❌ Tout le monde avec le code peut modifier les données
- ❌ Pas de gestion des droits

**Implémentation** :
```java
@PostMapping("/upload")
public ResponseEntity<?> upload(
    @RequestParam("teachersXml") MultipartFile teachersXml,
    @RequestParam("schoolCode") String schoolCode
) {
    // Valider le code
    if (schoolCode == null || schoolCode.isEmpty()) {
        return ResponseEntity.badRequest().body("Code établissement requis");
    }
    
    // Stocker dans data/{schoolCode}/
    Path schoolDir = Paths.get(DATA_DIR, schoolCode);
    Files.createDirectories(schoolDir);
    
    // Parser et stocker
    SchoolData data = schoolData.computeIfAbsent(schoolCode, k -> new SchoolData());
    data.teachers = TimetableParser.parseTeachers(...);
    
    return ResponseEntity.ok("Upload réussi");
}
```

**Frontend** :
```typescript
// Demander le code au démarrage
const schoolCode = localStorage.getItem('schoolCode') || prompt('Code établissement:');
localStorage.setItem('schoolCode', schoolCode);

// Envoyer le code avec chaque requête
this.http.post('/api/upload', formData, {
  params: { schoolCode: this.schoolCode }
});
```

---

## Recommandation

### Pour une utilisation simple et rapide : **Option 1 (Sessions)**
- Parfait pour tester l'application
- Chaque navigateur = utilisateur unique
- Données temporaires (tant que la session est active)

### Pour un établissement scolaire : **Option 3 (Code d'Établissement)**
- Plusieurs professeurs/admins partagent les mêmes données
- Code unique par établissement
- Simple et efficace

### Pour une plateforme multi-établissements : **Option 2 (Authentification)**
- Système complet avec comptes utilisateurs
- Sécurité maximale
- Gestion des droits (admin, prof, consultation)

---

## Migration Recommandée (Option 1 - Sessions)

### Étape 1 : Modifier le backend

1. **Créer une classe UserData** :
```java
class UserData {
    Map<String, Map<String, Map<String, Map<String,String>>>> teachers = new HashMap<>();
    Map<String, Map<String, Map<String, Map<String,String>>>> subgroups = new HashMap<>();
    List<TimetableParser.ActivitySlot> activities = new ArrayList<>();
    Map<String, String> teacherMappings = new HashMap<>();
    Map<String, String> roomMappings = new HashMap<>();
}
```

2. **Remplacer les variables de classe** :
```java
// Avant :
private Map<String, Map<...>> teachers = new HashMap<>();

// Après :
private Map<String, UserData> sessions = new ConcurrentHashMap<>();
```

3. **Ajouter HttpSession à tous les endpoints** :
```java
@GetMapping("/teachers")
public ResponseEntity<?> getTeachers(HttpSession session) {
    String sessionId = session.getId();
    UserData userData = sessions.get(sessionId);
    if (userData == null || userData.teachers.isEmpty()) {
        return ResponseEntity.status(404).body("Aucune donnée. Veuillez uploader vos fichiers XML.");
    }
    return ResponseEntity.ok(userData.teachers.keySet());
}
```

4. **Sauvegarder les fichiers par session** :
```java
Path userDir = Paths.get(DATA_DIR, "sessions", sessionId);
Files.createDirectories(userDir);
Files.copy(teachersXml.getInputStream(), userDir.resolve(TEACHERS_FILE), StandardCopyOption.REPLACE_EXISTING);
```

### Étape 2 : Configurer les sessions dans application.properties

```properties
# Durée de vie de la session : 8 heures
server.servlet.session.timeout=8h

# Persistence des sessions (optionnel)
spring.session.store-type=none
```

### Étape 3 : Tester

1. Ouvrir deux navigateurs différents (Chrome et Firefox)
2. Uploader des fichiers XML différents dans chaque navigateur
3. Vérifier que chaque navigateur voit ses propres données

---

## Code Prêt à l'Emploi

Voulez-vous que je génère le code complet pour :
- [ ] Option 1 : Sessions HTTP (Simple)
- [ ] Option 3 : Code d'Établissement
- [ ] Option 2 : Authentification complète (Complexe)

Indiquez votre choix et je modifierai le backend en conséquence.
