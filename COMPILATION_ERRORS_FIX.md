# Script de Correction Multi-Utilisateurs

## ⚠️ ERREURS DE COMPILATION TROUVÉES

Le fichier `TimetableController.java` a environ **50+ erreurs** car toutes les méthodes n'ont pas encore été mises à jour pour utiliser `UserData` et `HttpSession`.

## 🔧 SOLUTION RAPIDE

Plutôt que de corriger manuellement les 1288 lignes, voici deux options :

### Option 1 : Revenir Temporairement en Arrière ⏪

Annuler les modifications multi-utilisateurs et garder la version simple (un seul utilisateur) :

```bash
cd backend
git checkout src/main/java/com/example/timetable/controller/TimetableController.java
git checkout src/main/resources/application.properties
```

L'application fonctionnera normalement, mais **sans** support multi-utilisateurs.

### Option 2 : Compilation Partielle ✅

Pour tester rapidement le système multi-utilisateurs avec seulement les méthodes déjà corrigées :

1. **Commenter temporairement** toutes les méthodes non corrigées (lignes 440-1290)
2. **Recompiler** : `mvn clean package`
3. **Tester** l'upload et listTeachers/listSubgroups
4. **Décommenter progressivement** et corriger chaque méthode

### Option 3 : Correction Automatique Complète 🤖

Je peux générer un fichier `TimetableController.java` entièrement corrigé. 

**Voulez-vous que je génère le fichier complet corrigé ?**

## 📋 LISTE DES MÉTHODES À CORRIGER

### ✅ Déjà Corrigées (avec HttpSession) :
1. upload()
2. listTeachers()
3. listSubgroups()
4. getSubgroupsForClass()
5. timetableForTeacher() - PARTIELLEMENT (ligne 342)
6. getUserData()
7. saveMappings()
8. applyTeacherMapping()
9. findOriginalTeacherName()
10. applyRoomMapping()
11. findOriginalRoomName()

### ❌ À Corriger (sans HttpSession) :
12. hasCoincidentGroupsForTeacherSlot() - ligne 440+
13. findSubgroupLabelForTeacherSlot() - ligne 480+
14. timetableForSubgroup() - ligne 640
15. vacantRooms() - ligne 818
16. vacantRoomsDiagnostics() - ligne 920
17. listAllRooms() - ligne 998
18. timetableForRoom() - ligne 1037
19. getOriginalTeacherNames() - ligne 1150
20. getOriginalRoomNames() - ligne 1166
21. renameTeacher() - ligne 1204
22. renameRoom() - ligne 1232
23. getMappings() - ligne 1260
24. + toutes les méthodes privées helper

## 🎯 RECOMMANDATION

**Option 3** est la meilleure pour avoir une application multi-utilisateurs fonctionnelle immédiatement.

Confirmez-vous que je génère le fichier complet corrigé ?
