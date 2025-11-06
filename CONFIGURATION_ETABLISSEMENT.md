# Configuration de l'Établissement

## 📋 Description

Cette fonctionnalité permet à l'utilisateur de personnaliser les informations affichées dans l'en-tête officiel des emplois du temps :

- **Académie Régionale** (ex: Académie Régionale de l'Oriental)
- **Direction Provinciale** (ex: Direction Provinciale d'Oujda-Angad)
- **Nom de l'Établissement** (ex: Collège Ibn Khaldoun)
- **Logo du Ministère** (image importée par l'utilisateur)

## 🚀 Comment utiliser

### 1. Accéder à la Configuration

1. Démarrez l'application (frontend et backend)
2. Cliquez sur le bouton **"⚙️ Configuration"** dans le menu de navigation
   - Version française : **⚙️ Configuration**
   - Version arabe : **⚙️ الإعدادات**

### 2. Importer le Logo du Ministère

1. Dans la section "Logo du Ministère", cliquez sur **"📁 Choisir une image"**
2. Sélectionnez une image (PNG, JPG ou SVG)
3. Une prévisualisation s'affichera
4. Pour supprimer le logo, cliquez sur le bouton **"Supprimer"**

**Recommandations :**
- Format recommandé : PNG avec fond transparent
- Taille optimale : 200x200 pixels maximum
- Le logo sera redimensionné automatiquement à 80x80 pixels dans l'en-tête

### 3. Saisir les Informations de l'Établissement

Remplissez les champs suivants :

- **Académie Régionale** : 
  - Exemple : `Académie Régionale de l'Oriental`
  - Exemple arabe : `الأكاديمية الجهوية للشرق`

- **Direction Provinciale** :
  - Exemple : `Direction Provinciale d'Oujda-Angad`
  - Exemple arabe : `المديرية الإقليمية وجدة أنجاد`

- **Nom de l'Établissement** :
  - Exemple : `Collège Ibn Khaldoun`
  - Exemple arabe : `ثانوية ابن خلدون الإعدادية`

### 4. Enregistrer la Configuration

1. Cliquez sur le bouton **"💾 Enregistrer"** / **"💾 حفظ"**
2. Un message de confirmation s'affichera
3. Vous serez automatiquement redirigé vers la page principale

## 📝 Affichage dans l'Emploi du Temps

### En-tête Officiel

L'en-tête se compose de trois colonnes :

```
┌─────────────────────────────────────────────────────────────┐
│  المملكة المغربية        [LOGO]     Royaume du Maroc       │
│  وزارة التربية الوطنية              Ministère de l'Éduc.   │
│  والتعليم الأولي والرياضة           du Préscolaire...      │
└─────────────────────────────────────────────────────────────┘
```

### Ligne d'Informations

Les informations s'affichent sous l'en-tête :

```
┌─────────────────────────────────────────────────────────────┐
│  Académie – Direction – Établissement                        │
└─────────────────────────────────────────────────────────────┘
```

**Exemple complet :**
```
Académie Régionale de l'Oriental – Direction Provinciale d'Oujda-Angad – Collège Ibn Khaldoun
```

## 💾 Stockage des Données

Les informations sont stockées localement dans le navigateur :

- **Emplacement** : `localStorage` du navigateur
- **Clé** : `schoolInfo`
- **Format** : JSON
- **Données stockées** :
  - `academy` : Nom de l'académie
  - `direction` : Nom de la direction
  - `establishment` : Nom de l'établissement
  - `logoUrl` : Logo encodé en base64

### Exemple de données stockées :

```json
{
  "academy": "Académie Régionale de l'Oriental",
  "direction": "Direction Provinciale d'Oujda-Angad",
  "establishment": "Collège Ibn Khaldoun",
  "logoUrl": "data:image/png;base64,iVBORw0KGgo..."
}
```

## 🖨️ Impression et Export PDF

Les informations configurées apparaîtront automatiquement :
- Dans les impressions directes (Ctrl+P)
- Dans les exports PDF
- Pour tous les types d'emplois du temps :
  - Emplois du temps des professeurs
  - Emplois du temps des classes
  - Tableaux des salles vacantes

## 🔧 Modification des Informations

Pour modifier les informations :

1. Retournez dans **"⚙️ Configuration"**
2. Les champs seront pré-remplis avec les valeurs actuelles
3. Modifiez les champs souhaités
4. Cliquez sur **"💾 Enregistrer"**

## 🗑️ Réinitialisation

Pour supprimer toutes les informations :

1. Ouvrez la console du navigateur (F12)
2. Tapez : `localStorage.removeItem('schoolInfo')`
3. Rechargez la page (F5)

Ou bien :

1. Accédez à **"⚙️ Configuration"**
2. Videz manuellement tous les champs
3. Supprimez le logo avec le bouton **"Supprimer"**
4. Cliquez sur **"💾 Enregistrer"**

## 🌐 Support Multilingue

L'interface de configuration s'adapte automatiquement à la langue sélectionnée :
- **Français (FR)** : Tous les labels en français
- **Arabe (AR)** : Tous les labels en arabe avec direction RTL

## ⚠️ Notes Importantes

1. **Taille du Logo** : 
   - Les logos sont stockés en base64, ce qui peut être volumineux
   - Privilégiez des images optimisées (< 100 Ko)

2. **Compatibilité Navigateur** :
   - Les données sont liées au navigateur utilisé
   - Si vous changez de navigateur, les informations devront être saisies à nouveau

3. **Sauvegarde** :
   - Les données persistent même après fermeture du navigateur
   - Elles ne sont pas partagées avec le serveur backend
   - Pour sauvegarder, exportez le localStorage ou notez les valeurs

4. **Affichage par Défaut** :
   - Si aucune information n'est configurée, un message d'aide s'affiche
   - L'emoji 🇲🇦 est utilisé comme logo par défaut

## 🎨 Personnalisation Avancée

Si vous souhaitez modifier l'apparence de l'en-tête, éditez le fichier :
```
timetable-frontend-angular17/src/app/timetable/timetable.component.scss
```

Section concernée : `.official-header`

---

**Développé pour le système de gestion des emplois du temps - 2025**
