# Polices pour PDF avec support arabe

Pour un rendu optimal des noms arabes dans les PDF générés côté backend, 
placez les fichiers de polices suivants dans ce dossier :

## Polices recommandées :

1. **NotoNaskhArabic-Regular.ttf** - Police Google Fonts
   - Télécharger depuis : https://fonts.google.com/noto/specimen/Noto+Naskh+Arabic
   
2. **Amiri-Regular.ttf** - Police traditionnelle arabe
   - Télécharger depuis : https://fonts.google.com/specimen/Amiri

3. **Cairo-Regular.ttf** - Police moderne
   - Télécharger depuis : https://fonts.google.com/specimen/Cairo

## Fallback automatique :

Si aucun fichier de police n'est trouvé ici, le système utilisera automatiquement :
- Windows : `c:/windows/fonts/tahoma.ttf`
- Autres systèmes : polices système disponibles

## Installation :

1. Téléchargez les fichiers .ttf depuis Google Fonts
2. Placez-les dans ce dossier `src/main/resources/fonts/`
3. Redémarrez l'application Spring Boot
4. Les PDF générés utiliseront automatiquement ces polices

## Vérification :

Consultez les logs au démarrage pour confirmer le chargement des polices :
```
✓ Police arabe chargée: NotoNaskhArabic-Regular.ttf
```