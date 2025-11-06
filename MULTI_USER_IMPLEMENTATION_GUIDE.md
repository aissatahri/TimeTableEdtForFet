# Guide d'Implémentation Multi-Utilisateurs

## ✅ Changements Effectués

### 1. Classe UserData
```java
class UserData {
    Map<String, Map<String, Map<String, Map<String,String>>>> teachers = new HashMap<>();
    Map<String, Map<String, Map<String, Map<String,String>>>> subgroups = new HashMap<>();
    List<TimetableParser.ActivitySlot> activities = new ArrayList<>();
    Map<String, String> teacherMappings = new HashMap<>();
    Map<String, String> roomMappings = new HashMap<>();
    
    public boolean hasData() {
        return !teachers.isEmpty() || !subgroups.isEmpty() || !activities.isEmpty();
    }
}
```

### 2. Stockage des sessions
```java
private Map<String, UserData> userSessions = new ConcurrentHashMap<>();
```

### 3. Méthode getUserData
```java
private UserData getUserData(HttpSession session) {
    String sessionId = session.getId();
    return userSessions.computeIfAbsent(sessionId, k -> new UserData());
}
```

## 🔧 Changements à Appliquer

### Toutes les méthodes @GetMapping et @PostMapping doivent :

1. **Ajouter `HttpSession session` comme paramètre**
2. **Récupérer userData au début** : `UserData userData = getUserData(session);`
3. **Remplacer** :
   - `teachers` → `userData.teachers`
   - `subgroups` → `userData.subgroups`
   - `activities` → `userData.activities`
   - `teacherMappings` → `userData.teacherMappings`
   - `roomMappings` → `userData.roomMappings`

4. **Pour les méthodes avec mappings** :
   - `applyTeacherMapping(name)` → `applyTeacherMapping(name, userData)`
   - `apply RoomMapping(name)` → `applyRoomMapping(name, userData)`
   - `findOriginalTeacherName(name)` → `findOriginalTeacherName(name, userData)`
   - `findOriginalRoomName(name)` → `findOriginalRoomName(name, userData)`

5. **Pour saveMappings()** :
   - `saveMappings()` → `saveMappings(sessionId, userData)`

### Exemple de Transformation

#### AVANT :
```java
@GetMapping("/timetable/teacher/{name}")
public Map<String, Object> timetableForTeacher(@PathVariable("name") String name) {
    String original = findOriginalTeacherName(name);
    if (!teachers.containsKey(original)) {
        return Map.of("error", "Professeur non trouvé");
    }
    // ...
}
```

#### APRÈS :
```java
@GetMapping("/timetable/teacher/{name}")
public Map<String, Object> timetableForTeacher(@PathVariable("name") String name, HttpSession session) {
    UserData userData = getUserData(session);
    String original = findOriginalTeacherName(name, userData);
    if (!userData.teachers.containsKey(original)) {
        return Map.of("error", "Professeur non trouvé");
    }
    // ...
}
```

## 📋 Liste des Méthodes à Modifier

### ✅ Déjà Modifié :
- [x] `upload()` - ✅ HttpSession ajouté
- [x] `listTeachers()` - ✅ HttpSession ajouté
- [x] `listSubgroups()` - ✅ HttpSession ajouté
- [x] `getSubgroupsForClass()` - ✅ HttpSession ajouté

### ⏳ À Modifier :
- [ ] `timetableForTeacher()` - ligne 347
- [ ] `timetableForSubgroup()` - ligne 640
- [ ] `vacantRooms()` - ligne 818
- [ ] `vacantRoomsDiagnostics()` - ligne 920
- [ ] `listAllRooms()` - ligne 998
- [ ] `timetableForRoom()` - ligne 1037
- [ ] `getOriginalTeacherNames()` - ligne 1150
- [ ] `getOriginalRoomNames()` - ligne 1166
- [ ] `renameTeacher()` - ligne 1204
- [ ] `renameRoom()` - ligne 1232
- [ ] `getMappings()` - ligne 1260

## 🚀 Configuration des Sessions

### backend/src/main/resources/application.properties

Ajoutez ces lignes pour configurer les sessions :

```properties
# Durée de vie de la session : 8 heures
server.servlet.session.timeout=8h

# Cookie de session
server.servlet.session.cookie.name=TIMETABLE_SESSION
server.servlet.session.cookie.http-only=true
server.servlet.session.cookie.secure=false
server.servlet.session.cookie.max-age=28800

# Persistance des sessions (optionnel - pour survivre aux redémarrages)
# spring.session.store-type=jdbc
```

## 🔒 CORS Configuration

Le `allowCredentials = "true"` est déjà activé dans `@CrossOrigin`, ce qui est **essentiel** pour que les cookies de session fonctionnent.

## 📂 Structure des Dossiers

Les données seront stockées dans :
```
backend/
  data/
    sessions/
      {session-id-1}/
        teachers.xml
        subgroups.xml
        activities.xml
        mappings.json
      {session-id-2}/
        teachers.xml
        subgroups.xml
        activities.xml
        mappings.json
```

## 🧪 Test Multi-Utilisateurs

1. Ouvrir Chrome : `http://localhost:4200`
2. Ouvrir Firefox : `http://localhost:4200`
3. Uploader différents fichiers XML dans chaque navigateur
4. Vérifier que chaque navigateur voit ses propres données

Les sessions sont automatiquement gérées par les cookies HTTP !

## ⚠️ IMPORTANT

Le frontend **n'a besoin d'aucune modification** ! Les cookies de session sont gérés automatiquement par le navigateur.

## 📊 Monitoring

Dans la console backend, vous verrez :
```
📤 Upload pour session: ABC123XYZ
  ✓ Professeurs parsés: 45
  ✓ Sous-groupes parsés: 120
  ✓ Activités parsées: 350
✅ Upload terminé pour session: ABC123XYZ
```

Chaque session a un ID unique qui permet d'isoler les données.
