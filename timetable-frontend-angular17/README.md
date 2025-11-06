Projet Angular 17 standalone - Timetable Frontend (fr)

Instructions rapides:
1. Ouvre un terminal dans ce dossier.
2. Exécute: npm install
3. Puis: npx ng serve --open
   (ou: npm start)

L'application communique avec le backend attendu sur http://localhost:8080/api
Assure-toi que le backend Spring Boot tourne avant d'utiliser l'interface.

Contenu principal:
- src/main.ts : bootstrap de l'application (standalone)
- src/app/app.component.ts : composant racine standalone
- src/app/timetable/ -- composant Timetable standalone (HTML/SCSS/TS)
- src/app/services/timetable.service.ts : service pour appeler le backend

Tu peux modifier l'URL du backend dans src/app/services/timetable.service.ts si nécessaire.

## Options d'en-tête PDF (jsPDF)

Dans le panneau Paramétrage > "PDF / Impression", vous pouvez maintenant régler:

- Libellé à droite:
   - "Nom seulement" (par défaut)
   - "السيد(ة): [الاسم] — أستاذ(ة) مادة [المادة]" (vue Professeur uniquement; [المادة] = matière la plus fréquente déduite du tableau)
- Inverser positions (Année ⇄ Nom): place l'année à droite et le libellé à gauche
- Ajustement vertical (mm): décale finement la ligne Année/Nom pour correspondre à votre maquette

Ces options s'appliquent à l'export PDF via jsPDF.
