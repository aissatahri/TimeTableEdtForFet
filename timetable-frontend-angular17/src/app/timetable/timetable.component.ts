import { Component, OnInit, Input, Output, EventEmitter, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimetableService } from '../services/timetable.service';
import { LanguageService, Language, Translations } from '../services/language.service';
import { SchoolInfo } from '../school-config/school-config.component';
import jsPDF from 'jspdf';

// Import autoTable
import autoTable from 'jspdf-autotable';

// Extension du type jsPDF
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

type Html2PdfOptions = {
  margin: number;
  filename: string;
  image: {
    type: 'jpeg' | 'png' | 'webp';
    quality: number;
  };
  html2canvas: {
    scale: number;
  };
  jsPDF: {
    unit: string;
    format: string;
    orientation: 'portrait' | 'landscape';
  };
}

@Component({
  selector: 'app-timetable',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './timetable.component.html',
  styleUrls: ['./timetable.component.scss']
})
export class TimetableComponent implements OnInit, AfterViewChecked {
  successMessage = '';
  errorMessage = '';
  loading = false;
  @Input() showConfig = false;
  @Output() showConfigChange = new EventEmitter<boolean>();
  teachersBySubject: Record<string, string[]> = {};
  teachers: string[] = [];
  subgroups: string[] = [];
  rooms: string[] = []; // Liste des salles
  // actual subgroup identifiers for the selected class (e.g. 3APIC-5:G1)
  subgroupsForClass: string[] = [];
  selectedTeacher = '';
  selectedSubgroup = '';
  selectedRoom = ''; // Salle sélectionnée
  // label options for class view
  labelMode: 'diff' | 'always' = 'diff';
  labelSubjects: string = '';
  teacherFile?: File;
  subgroupFile?: File;
  activitiesFile?: File;
  viewMode: 'teachers' | 'subgroups' | 'rooms' | 'vacant' | 'global' = 'teachers';
  globalViewOrientation: 'teachersRows' | 'daysRows' = 'teachersRows'; // Option pour la vue globale
  enableColors = true; // Couleurs activées par défaut
  emptyGrayColor: string = '#e0e0e0'; // Couleur grise pour cellules vides
  // Palette de gris disponibles
  grayPalette = [
    '#ffffff', // Blanc
    '#f8f8f8', // Gris très très clair
    '#f3f3f3', // Gris très clair
    '#eeeeee', // Gris clair+
    '#e8e8e8', // Gris clair
    '#e0e0e0', // Gris moyen (défaut)
    '#d8d8d8', // Gris moyen+
    '#cfcfcf', // Gris foncé
    '#c0c0c0', // Gris foncé+
    '#b0b0b0', // Gris très foncé
    '#a0a0a0', // Gris très très foncé
  ];
  // Note: empty cells are styled statically in SCSS as grey. Runtime color customization
  // and CSS variable support was removed to keep the UI simple per user's request.
  
  // PDF font handling (Unicode + Arabic)
  private pdfArabicFontName = 'Amiri';  // Changé de NotoNaskhArabic à Amiri pour meilleur support Latin
  private pdfArabicFontFile = 'Amiri.ttf';
  private pdfArabicFontBoldFile = 'Amiri.ttf';  // Utiliser le même fichier pour bold
  // Additional Arabic fallbacks present in assets
  private pdfArabicFallbacks: Array<{ name: string; regular: string; bold?: string }> = [
    { name: 'NotoNaskhArabic', regular: 'NotoNaskhArabic-Regular.ttf' },
    { name: 'Tajawal', regular: 'Tajawal-Regular.ttf' }
  ];
  private pdfLatinFontName = 'NotoSans';
  private pdfLatinFontFile = 'NotoSans-Regular.ttf';
  private pdfLatinFontBoldFile = 'NotoSans-Bold.ttf';
  private pdfArabicLoaded = false;
  private pdfLatinLoaded = false;
  // Y position helper to place text just after logo
  private lastHeaderBottomY: number | null = null;
  
  // État de chargement
  dataLoaded = false; // Indique si les données XML ont été chargées avec succès
  loadError = false; // Indique si une erreur s'est produite lors du chargement
  
  // DAYS doit rester en français car le backend retourne les jours en français
  DAYS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  // DAYS_DISPLAY pour l'affichage traduit selon la langue
  DAYS_DISPLAY: string[] = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  TIMESLOTS = ['08:30 - 09:30','09:30 - 10:30','10:30 - 11:30','11:30 - 12:30','14:30 - 15:30','15:30 - 16:30','16:30 - 17:30','17:30 - 18:30'];
  // grid holds an array of slots per cell for class view
  grid: Record<string, Record<string, any[]>> = {};
  // matrix used to render colspans (hours are columns now): for each day, an array indexed by timeslot index
  cellMatrix: Record<string, Array<{ render: boolean; colspan: number; entries: any[] }>> = {};
  
  // Language support
  currentLanguage: Language = 'fr';
  translations: Translations;
  
  // School information
  schoolInfo: SchoolInfo = {
    academy: '',
    direction: '',
    establishment: '',
    logoUrl: '',
    logoSize: 100,
    logoWidthCm: 11,
    logoHeightCm: 2
  };

  constructor(private api: TimetableService, public langService: LanguageService, public lang: LanguageService) {
    this.translations = langService.getTranslations();
    // Charger la préférence de couleurs
    const savedColors = localStorage.getItem('enableColors');
    this.enableColors = savedColors !== 'false'; // true par défaut
    
    // Charger la couleur grise pour cellules vides
    const savedGrayColor = localStorage.getItem('emptyGrayColor');
    if (savedGrayColor) {
      this.emptyGrayColor = savedGrayColor;
    }
    
    // Charger les informations de l'établissement
    this.loadSchoolInfo();
  }

  openConfigModal() {
    this.showConfigChange.emit(true);
  }
  
  ngOnInit(): void {
    this.initializeGrid();
    this.loadLists();
  // No runtime empty-cell color to apply — SCSS enforces grey.
    
    // S'abonner aux changements de langue
    this.langService.currentLanguage$.subscribe(lang => {
      this.currentLanguage = lang;
      this.translations = this.langService.getTranslations();
      this.updateDaysForLanguage(lang);
    });
    
    // Écouter les mises à jour des informations de l'établissement
    window.addEventListener('schoolInfoUpdated', () => {
      this.loadSchoolInfo();
    });
  }

  ngAfterViewChecked(): void {
    // Forcer le style gris sur les cellules vides après chaque rendu
    this.applyEmptyCellStyles();
  }

  private applyEmptyCellStyles(): void {
    if (typeof document === 'undefined') return;
    
    // Trouver toutes les cellules td dans les tableaux
    const allTds = document.querySelectorAll('.timetable table td, .global-table td');
    
    allTds.forEach((td: Element) => {
      const htmlTd = td as HTMLElement;
      
      // Vérifier si la cellule contient seulement des éléments vides
      const cellEntry = htmlTd.querySelector('.cell-entry');
      if (cellEntry) {
        const strong = cellEntry.querySelector('strong');
        const subject = cellEntry.querySelector('.subject');
        const room = cellEntry.querySelector('.room');
        
        // Vérifier si tous les éléments sont vides
        const strongEmpty = !strong || strong.textContent?.trim() === '';
        const subjectEmpty = !subject || subject.textContent?.trim() === '';
        const roomEmpty = !room || room.textContent?.trim() === '';
        
        if (strongEmpty && subjectEmpty && roomEmpty) {
          // Cellule vide : TOUJOURS forcer le gris (que les couleurs soient activées ou non)
          htmlTd.style.setProperty('background', '#e0e0e0', 'important');
          htmlTd.style.setProperty('background-image', 'none', 'important');
          if (cellEntry instanceof HTMLElement) {
            cellEntry.style.display = 'none';
          }
        } else {
          // Cellule non vide : 
          // - Si enableColors = false : forcer blanc
          // - Si enableColors = true : laisser le template appliquer les couleurs
          if (!this.enableColors) {
            htmlTd.style.setProperty('background', '#ffffff', 'important');
            htmlTd.style.setProperty('background-image', 'none', 'important');
          } else {
            // Retirer les styles forcés pour laisser le CSS/template contrôler
            htmlTd.style.removeProperty('background');
            htmlTd.style.removeProperty('background-image');
          }
          if (cellEntry instanceof HTMLElement && cellEntry.style.display === 'none') {
            cellEntry.style.removeProperty('display');
          }
        }
      } else if (htmlTd.textContent?.trim() === '') {
        // Cellule complètement vide : TOUJOURS gris
        htmlTd.style.setProperty('background', '#e0e0e0', 'important');
        htmlTd.style.setProperty('background-image', 'none', 'important');
      }
    });
  }

  // Ensure Unicode fonts (Arabic + Latin with accents) are available in jsPDF
  private async ensurePdfFont(doc: jsPDF): Promise<void> {
    if (this.pdfArabicLoaded && this.pdfLatinLoaded) return;
    try {
      const arRegUrl = `assets/fonts/${this.pdfArabicFontFile}`;
      const arBoldUrl = `assets/fonts/${this.pdfArabicFontBoldFile}`;
      const laRegUrl = `assets/fonts/${this.pdfLatinFontFile}`;
      const laBoldUrl = `assets/fonts/${this.pdfLatinFontBoldFile}`;

      // Arabic Regular
      const arRegResp = await fetch(arRegUrl);
      if (arRegResp.ok) {
        const buf = await arRegResp.arrayBuffer();
        const b64 = this.arrayBufferToBase64(buf);
        (doc as any).addFileToVFS(this.pdfArabicFontFile, b64);
        (doc as any).addFont(this.pdfArabicFontFile, this.pdfArabicFontName, 'normal');
        this.pdfArabicLoaded = true;
      } else {
        console.warn('Arabic font not found at', arRegUrl, '- trying fallbacks.');
        // Try Arabic fallbacks in assets (Amiri, Tajawal)
        for (const fb of this.pdfArabicFallbacks) {
          try {
            const url = `assets/fonts/${fb.regular}`;
            const resp = await fetch(url);
            if (resp.ok) {
              const buf = await resp.arrayBuffer();
              const b64 = this.arrayBufferToBase64(buf);
              (doc as any).addFileToVFS(fb.regular, b64);
              (doc as any).addFont(fb.regular, fb.name, 'normal');
              this.pdfArabicFontName = fb.name;
              this.pdfArabicLoaded = true;
              break;
            }
          } catch {}
        }
        if (!this.pdfArabicLoaded) {
          console.warn('No Arabic font could be loaded. Arabic text may not render.');
        }
      }

      // Arabic Bold - Pour Amiri, réutiliser le fichier regular pour bold
      try {
        if (this.pdfArabicLoaded) {
          // Pour toutes les polices arabes, utiliser le fichier regular pour bold
          (doc as any).addFont(this.pdfArabicFontFile, this.pdfArabicFontName, 'bold');
        }
      } catch {
        if (this.pdfArabicLoaded) (doc as any).addFont(this.pdfArabicFontFile, this.pdfArabicFontName, 'bold');
      }

      // Note: Les polices latines NotoSans ne sont pas disponibles dans assets/fonts/
      // La police arabe Amiri supporte très bien les caractères latins (A-Z, 0-9, tirets)
      // donc nous n'avons pas besoin de charger une police latine séparée
      console.log('Using Arabic font (Amiri) for both Arabic and Latin characters');

    } catch (e) {
      console.warn('Failed to load Arabic font from assets:', e);
      this.pdfArabicLoaded = this.pdfArabicLoaded || false;
      this.pdfLatinLoaded = this.pdfLatinLoaded || false;
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    // btoa expects binary string
    return btoa(binary);
  }

  // When we don't have a Unicode font, convert UTF-8 to Latin-1 to avoid mojibake for FR accents
  private latin1(text: string): string {
    try { return unescape(encodeURIComponent(text)); } catch { return text; }
  }

  private processPdfText(text: string): string {
    // Détecter si le texte contient de l'arabe
    const hasArabic = /[\u0600-\u06FF\u0750-\u077F]/.test(text);
    
    if (hasArabic) {
      // Pour l'arabe : inverser l'ordre des mots
      const words = text.split(/\s+/);
      return words.reverse().join(' ');
    } else {
      // Pour les codes alphanumériques : NE PAS inverser, retourner tel quel
      return text;
    }
  }
  
  loadSchoolInfo(): void {
    const saved = localStorage.getItem('schoolInfo');
    if (saved) {
      this.schoolInfo = JSON.parse(saved);
      // Valeur par défaut pour l'année scolaire si absente
      if (!this.schoolInfo.schoolYear) {
        this.schoolInfo.schoolYear = '2024-2025';
      }
    }
  }
  
  getCellClasses(entries: any[]): string {
    const classes: string[] = [];
    
    if (this.isEntriesEmpty(entries)) {
      classes.push('empty-cell');
      classes.push('gray-custom');
    }
    
    return classes.join(' ');
  }

  getEmptyCellStyle(): any {
    return {
      '--empty-cell-bg': this.emptyGrayColor
    };
  }

  getCellStyleString(entries: any[]): string {
    if (this.isEntriesEmpty(entries)) {
      // Cellule vide : appliquer la couleur grise choisie par l'utilisateur
      return `background: ${this.emptyGrayColor}`;
    }
    
    if (this.enableColors && entries && entries.length) {
      const firstEntry = entries[0];
      const colorKey = this.viewMode === 'teachers' 
        ? (firstEntry.subgroup || '') 
        : (firstEntry.subject || '');
      
      if (colorKey) {
        const color = this.colorForSubject(colorKey);
        return `background: ${color}`;
      }
    }
    
    return 'background: white';
  }

  getCellStyle(entries: any[]): any {
    if (this.isEntriesEmpty(entries)) {
      // Cellule vide : appliquer la couleur grise choisie
      return { 'background': this.emptyGrayColor + ' !important' };
    }
    
    if (this.enableColors && entries && entries.length) {
      const firstEntry = entries[0];
      const colorKey = this.viewMode === 'teachers' 
        ? (firstEntry.subgroup || '') 
        : (firstEntry.subject || '');
      
      if (colorKey) {
        const color = this.colorForSubject(colorKey);
        return { 'background': color };
      }
    }
    
    return { 'background': 'white' };
  }

  getBgStyle(entries: any[]): string {
    if (this.isEntriesEmpty(entries)) {
      return ''; // Pas de style pour les cellules vides (CSS gère le gris)
    }
    if (this.enableColors && entries && entries.length) {
      const firstEntry = entries[0];
      // Dans la vue enseignant, utiliser subgroup pour la couleur
      // Dans la vue classe, utiliser subject pour la couleur
      const colorKey = this.viewMode === 'teachers' 
        ? (firstEntry.subgroup || '') 
        : (firstEntry.subject || '');
      
      if (!colorKey) {
        return 'background: white';
      }
      const color = this.colorForSubject(colorKey);
      return `background: ${color} !important`;
    }
    return 'background: white';
  }

  onColorToggle() {
    // Sauvegarder la préférence
    localStorage.setItem('enableColors', this.enableColors.toString());
  }

  onGrayColorChange(color: string) {
    this.emptyGrayColor = color;
    localStorage.setItem('emptyGrayColor', color);
  }

  loadLists() {
    this.api.getTeachers().subscribe({ 
      next: list => {
        if (!list) {
          console.warn('⚠️ getTeachers returned null/undefined');
          return;
        }
        // Si c'est un objet avec des clés (structure par matière)
        if (typeof list === 'object' && !Array.isArray(list)) {
          this.teachersBySubject = list;
          this.teachers = Object.values(list).flat().filter(t => typeof t === 'string');
          console.log('✅ Teachers loaded (by subject):', this.teachers.length);
        } 
        // Si c'est un array direct
        else if (Array.isArray(list)) {
          this.teachers = list;
          this.teachersBySubject = {};
          console.log('✅ Teachers loaded (flat array):', this.teachers.length);
        }
      }, 
      error: () => {
        console.warn('⚠️ getTeachers call failed - lists may be empty');
      }
    });
    
    this.api.getSubgroups().subscribe({
      next: list => {
        if (Array.isArray(list)) {
          this.subgroups = list;
          console.log('✅ Subgroups loaded:', this.subgroups.length);
        }
      },
      error: () => console.warn('⚠️ getSubgroups call failed')
    });
    
    this.api.getRooms().subscribe({
      next: list => {
        if (Array.isArray(list)) {
          this.rooms = list;
          console.log('✅ Rooms loaded:', this.rooms.length);
        }
      },
      error: () => console.warn('⚠️ getRooms call failed')
    });
  }
  initializeGrid() {
    for(const d of this.DAYS){ this.grid[d] = {}; for(const t of this.TIMESLOTS) this.grid[d][t] = []; }
    // reset matrix
    for(const d of this.DAYS) {
      this.cellMatrix[d] = this.TIMESLOTS.map(_ => ({ render: true, colspan: 1, entries: [] }));
    }
  }
  onMultipleFilesSelected(e: Event) {
    this.loading = true;
    const input = e.target as HTMLInputElement;
    if (!input.files?.length) return;

    // Réinitialiser les fichiers
    this.teacherFile = undefined;
    this.subgroupFile = undefined;
    this.activitiesFile = undefined;

    // Parcourir tous les fichiers sélectionnés
    for (let i = 0; i < input.files.length; i++) {
      const file = input.files[i];
      const fileName = file.name.toLowerCase();
      
      if (fileName.includes('teacher')) {
        this.teacherFile = file;
      } else if (fileName.includes('subgroup')) {
        this.subgroupFile = file;
      } else if (fileName.includes('activit')) {
        this.activitiesFile = file;
      }
    }

    // Charger automatiquement après sélection
    this.upload();
  }
  upload(){ 
  this.api.uploadFiles(this.teacherFile||null,this.subgroupFile||null,this.activitiesFile||null).subscribe({
      next: (res: any) => { 
        this.loading = false;
        
        // 1️⃣ UPDATE LOCAL LISTS DIRECTLY FROM UPLOAD RESPONSE (most reliable)
        if(res?.teachers && Array.isArray(res.teachers)) {
          this.teachers = res.teachers;
          console.log('✅ Teachers updated from upload response:', this.teachers.length);
        }
        if(res?.classes && Array.isArray(res.classes)) {
          this.subgroups = res.classes; // classes list without suffix
          console.log('✅ Classes updated from upload response:', this.subgroups.length);
        }
        if(res?.subgroups && Array.isArray(res.subgroups)) {
          console.log('✅ Detected subgroups:', res.subgroups.length);
        }
        
        // Réinitialiser l'affichage pour éviter les conflits visuels
        this.selectedTeacher = '';
        this.selectedSubgroup = '';
        this.subgroupsForClass = [];
        this.initializeGrid();
        
        // 2️⃣ Load rooms separately (teachers/classes already loaded from upload response)
        // Only load rooms since they're not in upload response
        this.api.getRooms().subscribe({
          next: list => {
            if (Array.isArray(list)) {
              this.rooms = list;
              console.log('✅ Rooms loaded:', this.rooms.length);
            }
          },
          error: () => console.warn('⚠️ getRooms call failed')
        });
        
        // Marquer comme chargé avec succès
        this.dataLoaded = true;
        this.loadError = false;
        
        // Afficher une boîte de dialogue de succès
        const message = this.lang.getCurrentLanguage() === 'fr' 
          ? '✅ Fichiers chargés avec succès !\n\nVous pouvez maintenant consulter les emplois du temps.'
          : '✅ تم تحميل الملفات بنجاح!\n\nيمكنك الآن الاطلاع على جداول الأوقات.';
        alert(message);
      }, 
      error: (err) => {
        this.loading = false;
        console.error('Upload failed', err);
        this.dataLoaded = false;
        this.loadError = true;
        
        // Afficher une boîte de dialogue d'erreur
        const message = this.lang.getCurrentLanguage() === 'fr'
          ? '❌ Erreur lors du chargement des fichiers !\n\nVeuillez vérifier :\n- Les fichiers sont au format XML correct\n- Le serveur backend est démarré (http://localhost:8081)\n- Vous avez sélectionné les 3 fichiers requis'
          : '❌ خطأ في تحميل الملفات!\n\nيرجى التحقق من:\n- الملفات بتنسيق XML الصحيح\n- خادم الواجهة الخلفية قيد التشغيل\n- قمت بتحديد الملفات الثلاثة المطلوبة';
        alert(message);
      }
    });
  }

  onViewModeChange() {
    // Quand on change de mode d'affichage, on nettoie la grille et la sélection opposée
    if (this.viewMode === 'teachers') {
      this.selectedSubgroup = '';
      this.selectedRoom = '';
      this.subgroupsForClass = [];
    } else if (this.viewMode === 'subgroups') {
      this.selectedTeacher = '';
      this.selectedRoom = '';
    } else if (this.viewMode === 'rooms') {
      this.selectedTeacher = '';
      this.selectedSubgroup = '';
      this.subgroupsForClass = [];
    } else if (this.viewMode === 'vacant') {
      this.selectedTeacher = '';
      this.selectedSubgroup = '';
      this.selectedRoom = '';
      this.subgroupsForClass = [];
    } else if (this.viewMode === 'global') {
      this.selectedTeacher = '';
      this.selectedSubgroup = '';
      this.selectedRoom = '';
      this.subgroupsForClass = [];
      this.buildGlobalView();
      return; // Pas besoin d'appeler showTimetable() pour la vue globale
    }
    this.initializeGrid();
    // Charger automatiquement le tableau après changement de mode
    // - En mode "vacant": pas de sélection requise, on charge directement
    // - En mode "teachers", "subgroups" ou "rooms": on charge si une sélection existe déjà
    this.showTimetable();
  }
  
  // Nouvelle méthode pour construire la vue globale
  globalGrid: any[][] = []; // Grille pour la vue globale
  globalHeaders: any[] = []; // En-têtes de colonnes (peut être string ou objet avec périodes)
  globalRowHeaders: string[] = []; // En-têtes de lignes
  globalViewLoading = false; // Indicateur de chargement pour la vue globale
  globalCellMatrix: any[][] = []; // Matrice avec informations de rowspan
  
  async buildGlobalView() {
    // Vider d'abord l'affichage
    this.clearGlobalView();
    
    // Activer l'indicateur de chargement
    this.globalViewLoading = true;
    
    try {
      if (this.globalViewOrientation === 'teachersRows') {
        // Option 1: Profs en lignes, Jours en colonnes
        await this.buildGlobalViewTeachersRows();
      } else {
        // Option 2: Jours en lignes, Profs en colonnes
        await this.buildGlobalViewDaysRows();
      }
    } finally {
      // Désactiver l'indicateur de chargement
      this.globalViewLoading = false;
    }
  }
  
  private clearGlobalView() {
    this.globalGrid = [];
    this.globalHeaders = [];
    this.globalRowHeaders = [];
    this.globalCellMatrix = [];
  }
  
  // Méthode pour vérifier si deux cellules sont identiques
  private areCellsIdentical(cell1: any, cell2: any): boolean {
    // Ne JAMAIS fusionner les cellules vides - vérification en premier
    if (!cell1 || !cell2) return false;
    if (Array.isArray(cell1) && cell1.length === 0) return false;
    if (Array.isArray(cell2) && cell2.length === 0) return false;
    
    // Comparer les tableaux de slots (seulement si les deux ont du contenu)
    if (Array.isArray(cell1) && Array.isArray(cell2)) {
      if (cell1.length !== cell2.length) return false;
      
      // Comparer chaque slot
      for (let i = 0; i < cell1.length; i++) {
        const s1 = cell1[i];
        const s2 = cell2[i];
        
        if (s1.subgroup !== s2.subgroup) return false;
        if (s1.subject !== s2.subject) return false;
        if (s1.room !== s2.room) return false;
      }
      
      return true;
    }
    
    return false;
  }
  
  // Méthode pour construire la matrice sans fusion - toutes les cellules séparées
  private buildCellMatrix() {
    const numRows = this.globalGrid.length;
    const numCols = this.globalGrid[0]?.length || 0;
    
    // Initialiser la matrice - toutes les cellules sont rendues séparément
    this.globalCellMatrix = [];
    for (let r = 0; r < numRows; r++) {
      this.globalCellMatrix[r] = [];
      for (let c = 0; c < numCols; c++) {
        this.globalCellMatrix[r][c] = {
          render: true,
          colspan: 1,
          data: this.globalGrid[r][c]
        };
      }
    }
    
    // Fusionner les cellules adjacentes horizontalement avec le même contenu (non vides)
    // IMPORTANT: Ne fusionner que dans la même période (4 slots par période)
    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        if (!this.globalCellMatrix[r][c].render) continue; // Cellule déjà fusionnée
        
        // NE JAMAIS fusionner les cellules vides
        if (this.isEntriesEmpty(this.globalCellMatrix[r][c].data)) {
          this.globalCellMatrix[r][c].colspan = 1;
          this.globalCellMatrix[r][c].render = true; // Toujours afficher les cellules vides
          continue;
        }
        
        // Déterminer dans quelle période se trouve cette colonne
        // Chaque jour a 8 slots: 4 matin (indices 0-3) + 4 soir (indices 4-7)
        const currentPeriodStart = Math.floor(c / 4) * 4;
        const currentPeriodEnd = currentPeriodStart + 3; // 4 slots par période
        
        // Compter combien de cellules adjacentes ont le même contenu (non vides)
        // ET sont dans la même période
        let colspan = 1;
        for (let j = c + 1; j <= currentPeriodEnd && j < numCols; j++) {
          // Ne jamais fusionner avec une cellule vide
          if (this.isEntriesEmpty(this.globalCellMatrix[r][j].data)) {
            break;
          }
          
          if (this.areGlobalCellEntriesIdentical(this.globalCellMatrix[r][c].data, this.globalCellMatrix[r][j].data)) {
            colspan++;
            this.globalCellMatrix[r][j].render = false; // Masquer les cellules fusionnées
          } else {
            break; // Arrêter dès qu'on trouve une cellule différente
          }
        }
        
        this.globalCellMatrix[r][c].colspan = colspan;
      }
    }
  }
  
  // Construire la matrice avec fusion verticale (rowspan) pour daysRows
  private buildCellMatrixWithRowSpan() {
    const numRows = this.globalGrid.length;
    const numCols = this.globalGrid[0]?.length || 0;
    
    // Initialiser la matrice - toutes les cellules sont rendues séparément
    this.globalCellMatrix = [];
    for (let r = 0; r < numRows; r++) {
      this.globalCellMatrix[r] = [];
      for (let c = 0; c < numCols; c++) {
        this.globalCellMatrix[r][c] = {
          render: true,
          colspan: 1,
          rowspan: 1,
          data: this.globalGrid[r][c]
        };
      }
    }
    
    // Fusionner les cellules adjacentes verticalement avec le même contenu (non vides)
    // IMPORTANT: Ne fusionner que dans la même période (4 lignes par période, 8 lignes par jour)
    const merged: boolean[][] = Array(numRows).fill(null).map(() => Array(numCols).fill(false));
    
    for (let c = 0; c < numCols; c++) {
      for (let r = 0; r < numRows; r++) {
        if (merged[r][c]) continue;
        
        // NE JAMAIS fusionner les cellules vides
        if (this.isEntriesEmpty(this.globalCellMatrix[r][c].data)) {
          this.globalCellMatrix[r][c].rowspan = 1;
          this.globalCellMatrix[r][c].render = true;
          continue;
        }
        
        // Déterminer dans quelle période se trouve cette ligne
        // Chaque jour a 8 lignes: 4 matin (indices 0-3) + 4 soir (indices 4-7)
        const rowInDay = r % 8; // Position dans le jour (0-7)
        const currentPeriodStart = Math.floor(rowInDay / 4) * 4 + Math.floor(r / 8) * 8;
        const currentPeriodEnd = currentPeriodStart + 3; // 4 lignes par période
        
        // Compter combien de lignes consécutives ont le même contenu (non vides)
        // ET sont dans la même période
        let rowspan = 1;
        for (let nextRow = r + 1; nextRow <= currentPeriodEnd && nextRow < numRows; nextRow++) {
          // Ne jamais fusionner avec une cellule vide
          if (this.isEntriesEmpty(this.globalCellMatrix[nextRow][c].data)) {
            break;
          }
          
          if (this.areGlobalCellEntriesIdentical(this.globalCellMatrix[r][c].data, this.globalCellMatrix[nextRow][c].data)) {
            rowspan++;
            this.globalCellMatrix[nextRow][c].render = false; // Masquer les cellules fusionnées
            merged[nextRow][c] = true;
          } else {
            break; // Arrêter dès qu'on trouve une cellule différente
          }
        }
        
        this.globalCellMatrix[r][c].rowspan = rowspan;
      }
    }
  }
  
  // Vérifie si deux ensembles d'entrées de la vue globale sont identiques
  private areGlobalCellEntriesIdentical(entries1: any[], entries2: any[]): boolean {
    // Si l'une des deux est vide, elles ne sont pas identiques (on ne fusionne JAMAIS les vides)
    const isEmpty1 = this.isEntriesEmpty(entries1);
    const isEmpty2 = this.isEntriesEmpty(entries2);
    
    if (isEmpty1 || isEmpty2) {
      return false; // Ne JAMAIS fusionner si l'une des cellules est vide
    }
    
    // Si les longueurs diffèrent, pas identiques
    if (entries1.length !== entries2.length) {
      return false;
    }
    
    // Comparer chaque entrée
    for (let i = 0; i < entries1.length; i++) {
      const e1 = entries1[i];
      const e2 = entries2[i];
      
      // Comparer tous les champs
      if ((e1.subgroup || '') !== (e2.subgroup || '')) return false;
      if ((e1.subject || '') !== (e2.subject || '')) return false;
      if ((e1.room || '') !== (e2.room || '')) return false;
    }
    
    return true;
  }
  
  // Méthode pour obtenir la structure des jours avec périodes pour daysRows
  getDaysForDaysRows() {
    const daysStructure = [];
    for (const day of this.DAYS_DISPLAY) {
      daysStructure.push({
        day: day,
        periods: [
          {
            label: this.langService.getCurrentLanguage() === 'ar' ? 'الفترة الصباح' : 'Matin',
            slots: [1, 2, 3, 4]
          },
          {
            label: this.langService.getCurrentLanguage() === 'ar' ? 'الفترة المساء' : 'Après-midi',
            slots: [1, 2, 3, 4]
          }
        ]
      });
    }
    return daysStructure;
  }
  
  private async buildGlobalViewTeachersRows() {
    // En-têtes: Jours avec sous-colonnes pour matin/soir
    this.globalHeaders = [];
    this.globalRowHeaders = this.teachers; // Profs en lignes
    
    // Construire les en-têtes: chaque jour avec matin (4 créneaux) et soir (4 créneaux)
    for (const day of this.DAYS_DISPLAY) {
      // Ajouter le jour comme groupe
      this.globalHeaders.push({
        day: day,
        periods: [
          {
            label: this.langService.getCurrentLanguage() === 'ar' ? 'الفترة الصباح' : 'Matin',
            slots: this.TIMESLOTS.slice(0, 4) // 4 premiers créneaux (matin)
          },
          {
            label: this.langService.getCurrentLanguage() === 'ar' ? 'الفترة المساء' : 'Après-midi',
            slots: this.TIMESLOTS.slice(4, 8) // 4 derniers créneaux (après-midi)
          }
        ]
      });
    }
    
    // Initialiser la grille
    this.globalGrid = [];
    
    // Pour chaque enseignant, charger ses données
    const allPromises = this.teachers.map(teacher => {
      return new Promise<any[]>((resolve) => {
        this.api.getTimetableForTeacher(teacher).subscribe(slots => {
          const row: any[] = [];
          
          // Pour chaque jour
          for (const day of this.DAYS) {
            // Pour chaque créneau horaire (8 créneaux au total)
            for (const timeslot of this.TIMESLOTS) {
              // Trouver tous les slots correspondants
              const matchingSlots = slots.filter(s => {
                if (s.day !== day) return false;
                
                // Vérifier si le timeslot correspond
                const hourId: string = s.hourId || '';
                const period = s.period || 'matin';
                const match = hourId.match(/H(\d+)(?:-H?(\d+))?/);
                let startNum = 1, endNum = 1;
                if (match) {
                  startNum = parseInt(match[1], 10);
                  endNum = match[2] ? parseInt(match[2], 10) : startNum;
                }
                const base = (period === 'matin') ? 0 : 4;
                const startIdx = base + (startNum - 1);
                const endIdx = base + (endNum - 1);
                const currentIdx = this.TIMESLOTS.indexOf(timeslot);
                
                return currentIdx >= startIdx && currentIdx <= endIdx;
              });
              
              // Si plusieurs entrées, les combiner
              row.push(matchingSlots.length > 0 ? matchingSlots : null);
            }
          }
          
          resolve(row);
        });
      });
    });
    
    // Attendre que toutes les données soient chargées
    this.globalGrid = await Promise.all(allPromises);
    
    // Construire la matrice avec les rowspans
    this.buildCellMatrix();
  }
  
  private async buildGlobalViewDaysRows() {
    // En-têtes: Enseignants (colonnes)
    this.globalHeaders = this.teachers;
    this.globalRowHeaders = []; // Jours avec heures en lignes
    
    // Construire les en-têtes de lignes: chaque jour avec ses 8 créneaux
    for (const day of this.DAYS_DISPLAY) {
      for (const timeslot of this.TIMESLOTS) {
        this.globalRowHeaders.push(`${day} - ${timeslot}`);
      }
    }
    
    // Charger toutes les données des enseignants
    const teacherDataPromises = this.teachers.map(teacher => {
      return new Promise<any[]>((resolve) => {
        this.api.getTimetableForTeacher(teacher).subscribe(slots => {
          resolve(slots);
        });
      });
    });
    
    const allTeacherData = await Promise.all(teacherDataPromises);
    
    // Initialiser la grille
    this.globalGrid = [];
    
    // Pour chaque jour
    for (let dayIdx = 0; dayIdx < this.DAYS.length; dayIdx++) {
      const day = this.DAYS[dayIdx];
      
      // Pour chaque créneau horaire
      for (const timeslot of this.TIMESLOTS) {
        const row: any[] = [];
        
        // Pour chaque enseignant (colonnes)
        for (let teacherIdx = 0; teacherIdx < this.teachers.length; teacherIdx++) {
          const slots = allTeacherData[teacherIdx];
          
          // Trouver le slot correspondant
          const matchingSlots = slots.filter(s => {
            if (s.day !== day) return false;
            
            // Vérifier si le timeslot correspond
            const hourId: string = s.hourId || '';
            const period = s.period || 'matin';
            const match = hourId.match(/H(\d+)(?:-H?(\d+))?/);
            let startNum = 1, endNum = 1;
            if (match) {
              startNum = parseInt(match[1], 10);
              endNum = match[2] ? parseInt(match[2], 10) : startNum;
            }
            const base = (period === 'matin') ? 0 : 4;
            const startIdx = base + (startNum - 1);
            const endIdx = base + (endNum - 1);
            const currentIdx = this.TIMESLOTS.indexOf(timeslot);
            
            return currentIdx >= startIdx && currentIdx <= endIdx;
          });
          
          // Si plusieurs entrées, les stocker dans un tableau
          row.push(matchingSlots.length > 0 ? matchingSlots : null);
        }
        
        this.globalGrid.push(row);
      }
    }
    
    // Construire la matrice avec fusion verticale
    this.buildCellMatrixWithRowSpan();
  }
  showTimetable() { 
    if (this.viewMode === 'teachers' && this.selectedTeacher) {
      this.api.getTimetableForTeacher(this.selectedTeacher).subscribe(slots => {
        this.initializeGrid();
        for(const s of slots) {
          const day = s.day;
          if (!this.grid[day]) continue;

          // Normalize hour range (hourId) into TIMESLOTS indices so merged slots
          // like H1-H2 or H1-H4 are expanded to the individual TIMESLOTS columns.
          const hourId: string = s.hourId || '';
          const period = s.period || 'matin';
          const match = hourId.match(/H(\d+)(?:-H?(\d+))?/);
          let startNum = 1, endNum = 1;
          if (match) {
            startNum = parseInt(match[1], 10);
            endNum = match[2] ? parseInt(match[2], 10) : startNum;
          }
          const base = (period === 'matin') ? 0 : 4; // morning hours map to first 4 TIMESLOTS, evening to last 4
          const startIdx = base + (startNum - 1);
          const endIdx = base + (endNum - 1);

          for (let idx = startIdx; idx <= endIdx; idx++) {
            if (idx < 0 || idx >= this.TIMESLOTS.length) continue;
            const ts = this.TIMESLOTS[idx];
            if (!Array.isArray(this.grid[day][ts])) this.grid[day][ts] = [];
            this.grid[day][ts].push(s);
          }
        }
        this.buildNormalCellMatrix();
      });
  } else if (this.viewMode === 'subgroups' && this.selectedSubgroup) {
      // fetch and show subgroup identifiers for the selected class
      this.api.getSubgroupsForClass(this.selectedSubgroup).subscribe(list => this.subgroupsForClass = list);
      this.api.getTimetableForSubgroup(this.selectedSubgroup, this.labelMode, this.labelSubjects).subscribe(slots => {
        this.initializeGrid();
        for(const s of slots) {
          const day = s.day;
          if (!this.grid[day]) continue;
          const hourId: string = s.hourId || '';
          const period = s.period || 'matin';
          const match = hourId.match(/H(\d+)(?:-H?(\d+))?/);
          let startNum = 1, endNum = 1;
          if (match) {
            startNum = parseInt(match[1], 10);
            endNum = match[2] ? parseInt(match[2], 10) : startNum;
          }
          const base = (period === 'matin') ? 0 : 4;
          const startIdx = base + (startNum - 1);
          const endIdx = base + (endNum - 1);
          for (let idx = startIdx; idx <= endIdx; idx++) {
            if (idx < 0 || idx >= this.TIMESLOTS.length) continue;
            const ts = this.TIMESLOTS[idx];
            if (!Array.isArray(this.grid[day][ts])) this.grid[day][ts] = [];
            this.grid[day][ts].push(s);
          }
        }
        this.buildNormalCellMatrix();
      });
    } else if (this.viewMode === 'rooms' && this.selectedRoom) {
      this.api.getTimetableForRoom(this.selectedRoom).subscribe(slots => {
        this.initializeGrid();
        for(const s of slots) {
          const day = s.day;
          if (!this.grid[day]) continue;
          const hourId: string = s.hourId || '';
          const period = s.period || 'matin';
          const match = hourId.match(/H(\d+)(?:-H?(\d+))?/);
          let startNum = 1, endNum = 1;
          if (match) {
            startNum = parseInt(match[1], 10);
            endNum = match[2] ? parseInt(match[2], 10) : startNum;
          }
          const base = (period === 'matin') ? 0 : 4;
          const startIdx = base + (startNum - 1);
          const endIdx = base + (endNum - 1);
          for (let idx = startIdx; idx <= endIdx; idx++) {
            if (idx < 0 || idx >= this.TIMESLOTS.length) continue;
            const ts = this.TIMESLOTS[idx];
            if (!Array.isArray(this.grid[day][ts])) this.grid[day][ts] = [];
            this.grid[day][ts].push(s);
          }
        }
        this.buildNormalCellMatrix();
      });
    } else if (this.viewMode === 'vacant') {
      this.api.getVacantRooms().subscribe(slots => {
        this.initializeGrid();
        for (const s of slots) {
          const day = s.day;
          if (!this.grid[day]) continue;
          const hourId: string = s.hourId || '';
          const period = s.period || 'matin';
          const match = hourId.match(/H(\d+)(?:-H?(\d+))?/);
          let startNum = 1, endNum = 1;
          if (match) {
            startNum = parseInt(match[1], 10);
            endNum = match[2] ? parseInt(match[2], 10) : startNum;
          }
          const base = (period === 'matin') ? 0 : 4;
          const startIdx = base + (startNum - 1);
          const endIdx = base + (endNum - 1);
          for (let idx = startIdx; idx <= endIdx; idx++) {
            if (idx < 0 || idx >= this.TIMESLOTS.length) continue;
            const ts = this.TIMESLOTS[idx];
            if (!Array.isArray(this.grid[day][ts])) this.grid[day][ts] = [];
            this.grid[day][ts].push(s);
          }
        }
        this.buildNormalCellMatrix();
      });
    }
  }

  private buildNormalCellMatrix(){
    // Construire la matrice avec fusion des cellules adjacentes identiques
    for(const d of this.DAYS){
      const matrix = this.TIMESLOTS.map(_ => ({ render: true, colspan: 1, entries: [] }));
      // Remplir les entrées
      for(let i=0;i<this.TIMESLOTS.length;i++){
        const ts = this.TIMESLOTS[i];
        const rawEntries = (this.grid[d] && this.grid[d][ts]) ? this.grid[d][ts] : [];
        matrix[i].entries = rawEntries.filter(e => {
          if(!e) return false;
          if (this.viewMode === 'teachers' || this.viewMode === 'subgroups') {
            const hasSubject = (e.subject || '').toString().trim() !== '';
            const hasTeacher = (e.teacher || '').toString().trim() !== '';
            const hasRoom = (e.room || '').toString().trim() !== '';
            const hasSubgroup = (e.subgroup || '').toString().trim() !== '';
            return hasSubject || hasTeacher || hasRoom || hasSubgroup;
          }
          if (this.viewMode === 'vacant') {
            const hasVacantLabel = (e.subgroup || '').toString().trim() !== '';
            return hasVacantLabel;
          }
          if (this.viewMode === 'rooms') {
            const hasClass = (e.subgroup || '').toString().trim() !== '';
            const hasSubject = (e.subject || '').toString().trim() !== '';
            const hasTeacher = (e.teacher || '').toString().trim() !== '';
            return hasClass || hasSubject || hasTeacher;
          }
          return false;
        });
      }
      
      // Fusionner les cellules adjacentes avec le même contenu (non vides)
      for(let i = 0; i < matrix.length; i++) {
        if (!matrix[i].render) continue; // Cellule déjà fusionnée
        
        // NE JAMAIS fusionner les cellules vides - vérification stricte
        const isEmpty = this.isEntriesEmpty(matrix[i].entries);
        
        if (isEmpty) {
          matrix[i].colspan = 1;
          matrix[i].render = true; // Toujours afficher les cellules vides séparément
          continue; // Passer à la cellule suivante sans fusion
        }
        
        // Compter combien de cellules adjacentes ont le même contenu (non vides uniquement)
        let colspan = 1;
        for (let j = i + 1; j < matrix.length; j++) {
          // Arrêter immédiatement si la cellule suivante est vide
          if (this.isEntriesEmpty(matrix[j].entries)) {
            break;
          }
          
          // Vérifier si les cellules sont identiques
          if (this.areCellEntriesIdentical(matrix[i].entries, matrix[j].entries)) {
            colspan++;
            matrix[j].render = false; // Masquer les cellules fusionnées
          } else {
            break; // Arrêter dès qu'on trouve une cellule différente
          }
        }
        
        matrix[i].colspan = colspan;
      }
      
      this.cellMatrix[d] = matrix;
    }
  }
  
  // Vérifie si deux ensembles d'entrées sont identiques
  private areCellEntriesIdentical(entries1: any[], entries2: any[]): boolean {
    // Si l'une des deux est vide, elles ne sont pas identiques (on ne fusionne JAMAIS les vides)
    const isEmpty1 = this.isEntriesEmpty(entries1);
    const isEmpty2 = this.isEntriesEmpty(entries2);
    
    if (isEmpty1 || isEmpty2) {
      return false; // Ne JAMAIS fusionner si l'une des cellules est vide
    }
    
    // Si les longueurs diffèrent, pas identiques
    if (entries1.length !== entries2.length) {
      return false;
    }
    
    // Comparer chaque entrée - TOUS les champs doivent être identiques
    for (let i = 0; i < entries1.length; i++) {
      const e1 = entries1[i];
      const e2 = entries2[i];
      
      // Comparer TOUS les champs pertinents (subject, teacher, subgroup, room)
      // pour s'assurer que les cellules sont vraiment identiques
      if ((e1.subject || '') !== (e2.subject || '')) return false;
      if ((e1.teacher || '') !== (e2.teacher || '')) return false;
      if ((e1.subgroup || '') !== (e2.subgroup || '')) return false;
      if ((e1.room || '') !== (e2.room || '')) return false;
    }
    
    return true;
  }

  // Utilitaire: vérifie si une liste d'entrées est vide (aucun champ affichable)
  public isEntriesEmpty(entries: any[] | null | undefined): boolean {
    if (!entries || entries.length === 0) return true;
    
    // Vérifier que TOUS les objets du tableau sont vides selon le mode de vue
    for (const e of entries) {
      if (!e) continue; // Ignorer les entrées null/undefined
      
      // Vérifier uniquement les champs AFFICHÉS selon le mode de vue
      if (this.viewMode === 'teachers') {
        // Dans la vue enseignant, on affiche: subgroup et room
        const hasSubgroup = (e.subgroup || '').toString().trim() !== '';
        const hasRoom = (e.room || '').toString().trim() !== '';
        if (hasSubgroup || hasRoom) return false;
      } else if (this.viewMode === 'subgroups') {
        // Dans la vue classe, on affiche: subject, teacher, et room
        const hasSubject = (e.subject || '').toString().trim() !== '';
        const hasTeacher = (e.teacher || '').toString().trim() !== '';
        const hasRoom = (e.room || '').toString().trim() !== '';
        if (hasSubject || hasTeacher || hasRoom) return false;
      } else if (this.viewMode === 'rooms') {
        // Dans la vue salle, on affiche: subgroup, subject, teacher
        const hasSubgroup = (e.subgroup || '').toString().trim() !== '';
        const hasSubject = (e.subject || '').toString().trim() !== '';
        const hasTeacher = (e.teacher || '').toString().trim() !== '';
        if (hasSubgroup || hasSubject || hasTeacher) return false;
      } else if (this.viewMode === 'vacant') {
        // Dans la vue salles vacantes, on affiche: subgroup (nom de la salle)
        const hasSubgroup = (e.subgroup || '').toString().trim() !== '';
        if (hasSubgroup) return false;
      } else if (this.viewMode === 'global') {
        // Dans la vue globale, on affiche: subgroup, subject, et room
        const hasSubgroup = (e.subgroup || '').toString().trim() !== '';
        const hasSubject = (e.subject || '').toString().trim() !== '';
        const hasRoom = (e.room || '').toString().trim() !== '';
        if (hasSubgroup || hasSubject || hasRoom) return false;
      } else {
        // Mode par défaut: vérifier tous les champs
        const hasSubject = (e.subject || '').toString().trim() !== '';
        const hasTeacher = (e.teacher || '').toString().trim() !== '';
        const hasRoom = (e.room || '').toString().trim() !== '';
        const hasSubgroup = (e.subgroup || '').toString().trim() !== '';
        if (hasSubject || hasTeacher || hasRoom || hasSubgroup) return false;
      }
    }
    
    // Tous les objets sont vides (ou tableau vide) → cellule vide
    return true;
  }

  // Vérifie si une SEULE entrée est vide (tous ses champs affichables sont vides)
  public isEntryEmpty(entry: any): boolean {
    if (!entry) return true;
    
    // Vérifier uniquement les champs AFFICHÉS selon le mode de vue
    if (this.viewMode === 'teachers') {
      const hasSubgroup = (entry.subgroup || '').toString().trim() !== '';
      const hasRoom = (entry.room || '').toString().trim() !== '';
      return !hasSubgroup && !hasRoom;
    } else if (this.viewMode === 'subgroups') {
      const hasSubject = (entry.subject || '').toString().trim() !== '';
      const hasTeacher = (entry.teacher || '').toString().trim() !== '';
      const hasRoom = (entry.room || '').toString().trim() !== '';
      return !hasSubject && !hasTeacher && !hasRoom;
    } else if (this.viewMode === 'rooms') {
      const hasSubgroup = (entry.subgroup || '').toString().trim() !== '';
      const hasSubject = (entry.subject || '').toString().trim() !== '';
      const hasTeacher = (entry.teacher || '').toString().trim() !== '';
      return !hasSubgroup && !hasSubject && !hasTeacher;
    } else if (this.viewMode === 'vacant') {
      const hasSubgroup = (entry.subgroup || '').toString().trim() !== '';
      return !hasSubgroup;
    } else if (this.viewMode === 'global') {
      const hasSubgroup = (entry.subgroup || '').toString().trim() !== '';
      const hasSubject = (entry.subject || '').toString().trim() !== '';
      const hasRoom = (entry.room || '').toString().trim() !== '';
      return !hasSubgroup && !hasSubject && !hasRoom;
    } else {
      const hasSubject = (entry.subject || '').toString().trim() !== '';
      const hasTeacher = (entry.teacher || '').toString().trim() !== '';
      const hasRoom = (entry.room || '').toString().trim() !== '';
      const hasSubgroup = (entry.subgroup || '').toString().trim() !== '';
      return !hasSubject && !hasTeacher && !hasRoom && !hasSubgroup;
    }
  }


  private cellsEqual(a: any[], b: any[]): boolean{
    // IMPORTANT: Ne JAMAIS fusionner deux cellules vides
    if((!a || a.length===0) || (!b || b.length===0)) return false;
    if(a.length !== b.length) return false;
    // compare each entry by core fields
    for(let i=0;i<a.length;i++){
      const x = a[i];
      const y = b[i];
      if(!x || !y) return false;
      if((x.subject||'') !== (y.subject||'')) return false;
      if((x.teacher||'') !== (y.teacher||'')) return false;
      if((x.subgroup||'') !== (y.subgroup||'')) return false;
      if((x.room||'') !== (y.room||'')) return false;
    }
    return true;
  }
  print(){ window.print(); }
  
  // Nouvelle méthode : génération PDF côté backend

  // Nouvelle méthode : Préparation spéciale pour l'arabe
  private async prepareArabicForPdf(element: HTMLElement): Promise<void> {
    // Attendre le chargement des polices
    await this.waitForFonts();
    
    // Normaliser le texte arabe pour éviter les problèmes de rendu
    const arabicElements = element.querySelectorAll('*');
    arabicElements.forEach((el: any) => {
      if (el.textContent && this.containsArabic(el.textContent)) {
        // Normaliser les caractères arabes (supprimer diacritiques problématiques)
        el.textContent = this.normalizeArabicText(el.textContent);
        
        // Forcer le style pour html2canvas
        el.style.webkitFontSmoothing = 'antialiased';
        el.style.mozOsxFontSmoothing = 'grayscale';
      }
    });
    
    // Forcer un repaint pour s'assurer que les changements sont appliqués
    element.style.transform = 'translateZ(0)';
    await new Promise(resolve => setTimeout(resolve, 100));
    element.style.transform = '';
  }

  // Détecter si le texte contient de l'arabe
  private containsArabic(text: string): boolean {
    const arabicRegex = /[\u0600-\u06FF\u0750-\u077F]/;
    return arabicRegex.test(text);
  }

  // Normaliser le texte arabe pour améliorer le rendu
  private normalizeArabicText(text: string): string {
    // Supprimer les diacritiques qui posent problème dans html2canvas
    return text
      .replace(/[\u064B-\u0652\u0670\u0640]/g, '') // Supprimer diacritiques et tatweel
      .replace(/\u200F|\u200E/g, '') // Supprimer marques directionnelles
      .trim();
  }

  // Attendre le chargement des polices web (Amiri / Noto Naskh) avant capture
  private async waitForFonts(timeoutMs = 5000): Promise<void> {
    try {
      const anyDoc: any = document as any;
      if (anyDoc?.fonts?.ready) {
        // Vérifier spécifiquement les polices arabes
        const arabicFonts = [
          'Cairo',
          'Tajawal', 
          'Almarai',
          'Noto Naskh Arabic',
          'Amiri'
        ];
        
        // Attendre que les polices arabes soient chargées
        const fontPromises = arabicFonts.map(async fontName => {
          if (anyDoc.fonts.check) {
            // Vérifier différentes tailles et poids pour s'assurer du chargement complet
            const checks = [
              anyDoc.fonts.check(`12px "${fontName}"`),
              anyDoc.fonts.check(`400 12px "${fontName}"`),
              anyDoc.fonts.check(`500 12px "${fontName}"`)
            ];
            return Promise.all(checks);
          }
          return true;
        });
        
        // Attendre toutes les vérifications de polices
        await Promise.all(fontPromises);
        
        const p = anyDoc.fonts.ready as Promise<void>;
        if (timeoutMs > 0) {
          await Promise.race([
            p,
            new Promise<void>(res => setTimeout(res, timeoutMs))
          ]);
        } else {
          await p;
        }
        
        // Attente supplémentaire pour s'assurer du rendu complet
        await new Promise<void>(res => setTimeout(res, 500));
      } else {
        // attente plus longue par défaut pour les polices arabes
        await new Promise<void>(res => setTimeout(res, 1000));
      }
    } catch {
      // En cas d'erreur, attendre quand même un délai raisonnable
      await new Promise<void>(res => setTimeout(res, 1000));
    }
  }

  async exportPdf() {
    try {
      // Message d'information
      const message = this.langService.getCurrentLanguage() === 'fr' ? 
        '📄 GÉNÉRATION PDF AVEC jsPDF:\n\n✅ Création directe du PDF\n✅ Support arabe optimisé\n✅ Format professionnel\n\nGénération en cours...' : 
        '📄 إنشاء PDF باستخدام jsPDF:\n\n✅ إنشاء مباشر للـ PDF\n✅ دعم محسن للعربية\n✅ تنسيق مهني\n\nجاري الإنشاء...';
      
      alert(message);
      
      // Récupérer l'orientation configurée
      const ps = this.getPrintSettings();
      const orientation = ps.pdfOrientation || 'portrait';
      
      // Créer un nouveau document PDF avec l'orientation configurée
      const doc = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: 'a4'
      });

      // Charger les polices Unicode (Arabe/Latin) si disponibles dans assets/fonts
      await this.ensurePdfFont(doc);
  
      // Debug: afficher l'état du chargement des polices
      console.log('=== PDF Font Loading Status ===');
      console.log('Arabic Font Loaded:', this.pdfArabicLoaded, '- Font Name:', this.pdfArabicFontName);
      console.log('Latin Font Loaded:', this.pdfLatinLoaded, '- Font Name:', this.pdfLatinFontName);
      console.log('Current Language:', this.langService.getCurrentLanguage());
      console.log('View Mode:', this.viewMode);
      console.log('Orientation:', orientation);
      console.log('==============================');
  
      // Police par défaut pour le document: Arabe si dispo (supporte aussi le latin), sinon Helvetica
      const defaultFont = this.pdfArabicLoaded ? this.pdfArabicFontName : 'helvetica';
      doc.setFont(defaultFont);
      
      // En-tête officiel (logo centré)
      await this.addOfficialHeader(doc);
      
      // Logo + informations d'établissement + ligne (année gauche / nom droite)
      const afterHeaderY = await this.addTimetableTitle(doc);
      
      // Générer le tableau avec autoTable sous l'en-tête calculé
      this.generateTimetableTable(doc, afterHeaderY + 6);
      
      // Pied de page
      this.addFooter(doc);
      
      // Sauvegarder le PDF
      const filename = this.getFilename();
      doc.save(filename);
      
      // Message de succès
      const successMessage = this.langService.getCurrentLanguage() === 'fr' ? 
        '✅ PDF généré avec succès !\n\nFichier téléchargé : ' + filename : 
        '✅ تم إنشاء PDF بنجاح!\n\nالملف المحمل : ' + filename;
      
      alert(successMessage);
      
    } catch (error) {
      console.error('Erreur lors de la génération PDF:', error);
      alert('Erreur lors de la génération du PDF. Vérifiez la console.');
    }
  }

  private wait(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }

  private async addOfficialHeader(doc: jsPDF) {
    const pageWidth = doc.internal.pageSize.getWidth();
    // Remplacer le texte par le logo s'il existe
    let lineY = 35; // position par défaut de la ligne de séparation
    if (this.schoolInfo?.logoUrl) {
      try {
        const dataUrl = await this.loadImageAsDataUrl(this.schoolInfo.logoUrl);
        if (dataUrl) {
          const w = Math.max(10, (this.schoolInfo.logoWidthCm || 11) * 10); // cm -> mm
          const h = Math.max(5, (this.schoolInfo.logoHeightCm || 2) * 10);   // cm -> mm
          const x = (pageWidth - w) / 2;
          const y = 10; // en haut de page
          const fmt = dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg') ? 'JPEG'
                      : dataUrl.startsWith('data:image/webp') ? 'WEBP'
                      : 'PNG';
          (doc as any).addImage(dataUrl, fmt, x, y, w, h);
          lineY = y + h + 6; // ligne après le logo
          this.lastHeaderBottomY = y + h; // mémoriser le bas du logo
        }
      } catch {}
    }
    // Ligne de séparation
    doc.setLineWidth(0.5);
    doc.line(20, lineY, pageWidth - 20, lineY);
  }

  private async addTimetableTitle(doc: jsPDF): Promise<number> {
    const pageWidth = doc.internal.pageSize.getWidth();
    let ps: any = null;
    try { const raw = localStorage.getItem('printSettings'); ps = raw ? JSON.parse(raw) : {}; } catch {}
    const headerYOffsetMm: number = typeof ps?.headerYOffsetMm === 'number' ? ps.headerYOffsetMm : 0;

    // Plus d'espacement après la ligne de séparation
    let yPos = (this.lastHeaderBottomY != null ? this.lastHeaderBottomY + 12 : 48);
    
    // 1ère ligne: Académie — Direction — Établissement (comme HTML)
    const si = this.schoolInfo || ({} as any);
    console.log('DEBUG schoolInfo:', this.schoolInfo);
    console.log('DEBUG academy:', si.academy);
    console.log('DEBUG direction:', si.direction);
    console.log('DEBUG establishment:', si.establishment);
    console.log('DEBUG schoolYear:', si.schoolYear);
    
    // Fonction pour nettoyer les underscores SANS toucher aux tirets
    const cleanText = (text: string): string => {
      if (!text) return '';
      // Seulement remplacer les underscores par des espaces
      return text.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
    };
    
    const parts1: string[] = [];
    if (si.academy && si.academy.trim()) parts1.push(cleanText(si.academy));
    if (si.direction && si.direction.trim()) parts1.push(cleanText(si.direction));
    if (si.establishment && si.establishment.trim()) parts1.push(cleanText(si.establishment));
    
    console.log('DEBUG parts1:', parts1);
    
    // 2ème ligne: التوزيع الأسبوعي - [Nom] - أستاذ(ة) مادة [Matière]
    const langIsAr = this.langService.getCurrentLanguage() === 'ar';
    let parts2: string[] = [];
    
    if (this.viewMode === 'teachers') {
      const prefix = langIsAr ? 'التوزيع الأسبوعي' : 'Emploi du temps';
      parts2.push(prefix);
      let name = this.selectedTeacher || this.getHeaderRightName();
      if (name) {
        name = name.replace(/__[A-Z0-9]+$/, '');
        name = name.replace(/_/g, ' ');
      }
      if (name && name.trim()) parts2.push(name.trim());
      const subj = this.getTeacherMainSubject();
      if (subj && subj.trim()) {
        parts2.push(langIsAr ? `أستاذ(ة) مادة ${subj}` : `Prof. ${subj}`);
      }
    } else if (this.viewMode === 'subgroups') {
      const prefix = langIsAr ? 'التوزيع الأسبوعي' : 'Emploi du temps';
      parts2.push(prefix);
      const cls = this.selectedSubgroup || this.getHeaderRightName();
      console.log('DEBUG selectedSubgroup:', cls);
      // NE PAS nettoyer le nom de la classe pour garder les tirets (3APIC-11, P-A-104)
      if (cls && cls.trim()) {
        console.log('DEBUG adding class to parts2:', cls.trim());
        parts2.push(cls.trim());
      }
    } else if (this.viewMode === 'rooms') {
      const prefix = langIsAr ? 'التوزيع الأسبوعي' : 'Emploi du temps';
      parts2.push(prefix);
      const room = this.selectedRoom || this.getHeaderRightName();
      if (room && room.trim()) {
        parts2.push(langIsAr ? `القاعة ${room.trim()}` : `Salle ${room.trim()}`);
      }
    }
    
    console.log('DEBUG parts2 before year:', parts2);
    
    // Préparer l'année scolaire pour l'ajouter au tableau 2
    const schoolYear = cleanText(this.schoolInfo?.schoolYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);
    const yearLabel = langIsAr ? `الموسم الدراسي ${schoolYear}` : `Année scolaire ${schoolYear}`;
    
    // Afficher en 2 lignes avec positionnement absolu (droite-centre-gauche)
    const xCenter = pageWidth / 2;
    const marginX = 20;
    const xRight = pageWidth - marginX;
    const xLeft = marginX;
    
    doc.setFont(this.pdfArabicLoaded ? this.pdfArabicFontName : 'helvetica', 'normal');
    doc.setFontSize(10); // Taille agrandie de 9 à 10
    
    // LIGNE 1: Académie - Direction - Établissement (répartis sur la ligne, INVERSÉ RTL)
    if (parts1.length > 0) {
      if (parts1.length === 3) {
        // 3 éléments: droite - centre - gauche (INVERSÉ pour RTL)
        doc.text(parts1[0], xRight, yPos, { align: 'right' } as any); // Académie à droite
        doc.text(parts1[1], xCenter, yPos, { align: 'center' } as any); // Direction au centre
        doc.text(parts1[2], xLeft, yPos, { align: 'left' } as any); // Établissement à gauche
      } else if (parts1.length === 2) {
        // 2 éléments: droite - gauche (INVERSÉ)
        doc.text(parts1[0], xRight, yPos, { align: 'right' } as any);
        doc.text(parts1[1], xLeft, yPos, { align: 'left' } as any);
      } else {
        // 1 seul élément: centré
        doc.text(parts1[0], xCenter, yPos, { align: 'center' } as any);
      }
      yPos += 6; // Plus d'espacement entre les lignes (était 5)
    }
    
    // LIGNE 2: Affichage en 3 parties (droite - centre - gauche)
    doc.setFont(this.pdfArabicLoaded ? this.pdfArabicFontName : 'helvetica', 'bold');
    doc.setFontSize(12); // Taille agrandie de 11 à 12
    
    // EXTRÊME DROITE: التوزيع الأسبوعي
    if (parts2[0]) {
      doc.text(parts2[0], xRight, yPos, { align: 'right' } as any);
    }
    
    // CENTRE: Nom de la classe OU nom du professeur + matière
    if (this.viewMode === 'teachers') {
      // Pour les profs: Nom + Matière (si disponible)
      const teacherParts = [];
      if (parts2[1]) teacherParts.push(parts2[1]); // Nom du prof
      if (parts2[2]) teacherParts.push(parts2[2]); // Matière
      if (teacherParts.length > 0) {
        doc.text(teacherParts.join(' - '), xCenter, yPos, { align: 'center' } as any);
      }
    } else {
      // Pour les classes: Nom de la classe
      if (parts2[1]) {
        doc.text(parts2[1], xCenter, yPos, { align: 'center' } as any);
      }
    }
    
    // EXTRÊME GAUCHE: Année scolaire
    doc.text(yearLabel, xLeft, yPos, { align: 'left' } as any);
    yPos += 2; // Réduit de 4 à 2 pour encore moins d'espace avant le tableau
    
    return yPos + headerYOffsetMm;
  }

  // Nom affiché à droite de la ligne sous l'en-tête: non normalisé
  private getHeaderRightName(): string {
    if (this.viewMode === 'teachers' && this.selectedTeacher) return this.selectedTeacher;
    if (this.viewMode === 'subgroups' && this.selectedSubgroup) return this.selectedSubgroup;
    return '';
  }

  // Construit le libellé de droite selon les options
  private getRightLabelForHeader(format: 'nameOnly' | 'nameWithSubjectAr'): string {
    const baseName = this.getHeaderRightName();
    if (format === 'nameWithSubjectAr' && this.viewMode === 'teachers' && baseName) {
      const subj = this.getTeacherMainSubject();
      if (subj) {
        return `السيد(ة): ${baseName} — أستاذ(ة) مادة ${subj}`;
      }
    }
    return baseName;
  }

  // Détecte la matière la plus fréquente pour le professeur sélectionné (vue teachers)
  private getTeacherMainSubject(): string {
    if (this.viewMode !== 'teachers' || !this.selectedTeacher) return '';
    const counts = new Map<string, number>();
    const normalize = (s: string) => {
      if (!s) return '';
      // Supprimer marqueurs de groupes (G1, G2, etc.) et underscores, compacter
      let v = s.replace(/[\s:()\-]*G\d+\b/gi, '');
      v = v.replace(/[()]/g, '');
      v = v.replace(/_/g, ' ');
      v = v.replace(/\s+/g, ' ').trim();
      return v;
    };
    for (const day of this.DAYS) {
      for (const ts of this.TIMESLOTS) {
        const entries = (this.grid[day] && this.grid[day][ts]) ? this.grid[day][ts] : [];
        if (!entries || entries.length === 0) continue;
        for (const e of entries) {
          const subj = normalize((e?.subject || '').toString());
          if (!subj) continue;
          counts.set(subj, (counts.get(subj) || 0) + 1);
        }
      }
    }
    let best = '';
    let bestCount = -1;
    for (const [s, c] of counts.entries()) {
      if (c > bestCount) { bestCount = c; best = s; }
    }
    return best;
  }

  private getPrintSettings(): any {
    try {
      const raw = localStorage.getItem('printSettings');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private getFontSizes(): { body: number; header: number } {
    const ps = this.getPrintSettings();
    const fontSize = ps.fontSize || 'medium';
    
    // Mapping: small, medium, large -> tailles de police
    const fontSizeMap = {
      small: { body: 6, header: 7 },
      medium: { body: 8, header: 9 },
      large: { body: 10, header: 11 }
    };
    
    return fontSizeMap[fontSize] || fontSizeMap.medium;
  }

  private getMargins(): { top: number; right: number; bottom: number; left: number } {
    const ps = this.getPrintSettings();
    // Convertir cm en mm (multiplier par 10)
    return {
      top: (ps.pdfMarginTopCm || 0.6) * 10,
      right: (ps.pdfMarginRightCm || 0.3) * 10,
      bottom: (ps.pdfMarginBottomCm || 0.6) * 10,
      left: (ps.pdfMarginLeftCm || 0.6) * 10
    };
  }

  private getBorderWidth(): number {
    const ps = this.getPrintSettings();
    return ps.thickBorders ? 0.5 : 0.1; // 0.5 pour épais, 0.1 pour normal
  }

  private getCellPadding(): number {
    const ps = this.getPrintSettings();
    return ps.cellPaddingMm || 0.3; // Valeur par défaut: 0.3 mm
  }

  private generateTimetableTable(doc: jsPDF, startY?: number) {
    const tableData = this.prepareTableDataForPDF();
    const lang = this.langService.getCurrentLanguage();
    const useArabicFont = (lang === 'ar' && this.pdfArabicLoaded);
    const tableFont = useArabicFont ? this.pdfArabicFontName : 'helvetica';
    
    // Récupérer les paramètres configurables
    const fontSizes = this.getFontSizes();
    const margins = this.getMargins();
    const borderWidth = this.getBorderWidth();
    const cellPadding = this.getCellPadding();
    
    // Utilisation de autoTable correctement importé
    autoTable(doc, {
      startY: Math.max(65, startY || 0),
      head: [tableData.headers.map(h => this.processPdfText(h))],
      body: tableData.rows.map(r => r.map(c => this.processPdfText(c))),
      theme: 'grid',
      styles: {
        font: tableFont,
        fontSize: fontSizes.body,
        cellPadding: cellPadding,
        fontStyle: 'normal',
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: borderWidth,
        overflow: 'linebreak',
        cellWidth: 'auto',
        halign: 'center',
        valign: 'middle',
        minCellWidth: 4,
      },
      headStyles: {
        font: tableFont,
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: fontSizes.header,
        halign: 'center',
        overflow: 'linebreak',
        cellPadding: cellPadding,
      },
      columnStyles: {
        0: { cellWidth: 18, fontSize: fontSizes.body },
      },
      margin: { 
        left: margins.left, 
        right: margins.right,
        top: margins.top,
        bottom: margins.bottom
      },
      tableWidth: 'auto',
      didParseCell: (data: any) => {
        const lang = this.langService.getCurrentLanguage();
        
        if (lang === 'ar' && this.pdfArabicLoaded) {
          data.cell.styles.font = this.pdfArabicFontName;
        } else {
          data.cell.styles.font = 'helvetica';
        }
        
        data.cell.styles.fontSize = fontSizes.body;
        data.cell.styles.lineWidth = borderWidth;
        
        // Centrer tout le contenu
        data.cell.styles.halign = 'center';
        data.cell.styles.valign = 'middle';
        
        // Appliquer le fond gris aux cellules vides (sauf en-têtes)
        if (data.section === 'body') {
          const cellText = data.cell.text?.toString().trim() || '';
          if (cellText === '' || cellText.length === 0) {
            data.cell.styles.fillColor = [224, 224, 224]; // #e0e0e0 en RGB
          }
        }
        
        // Définir la largeur pour toutes les colonnes
        const lastColIdx = data.table.columns.length - 1;
        
        if (data.column && data.column.index === 0) {
          // Première colonne (heures)
          data.cell.styles.cellWidth = 18;
        } else if (data.column && data.column.index === lastColIdx) {
          // Dernière colonne (jour)
          data.cell.styles.minCellWidth = 20;
        } else {
          // Toutes les autres colonnes (cours)
          data.cell.styles.cellWidth = 18;
        }
      }
    });
  }

  private addFooter(doc: jsPDF) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const lang = this.langService.getCurrentLanguage();
    
    // Récupérer la position Y après le tableau
    const tableEndY = (doc as any).lastAutoTable?.finalY || 200;
    let footerY = tableEndY + 10; // 1 cm (10mm) d'espace après le tableau
    
    // Pour les professeurs, ajouter la liste des classes enseignées
    if (this.viewMode === 'teachers') {
      doc.setFont(this.pdfArabicLoaded ? this.pdfArabicFontName : 'helvetica', 'bold');
      doc.setFontSize(10);
      
      const classesLabel = lang === 'ar' ? 'لائحة الأقسام المسندة للأستاذ(ة):' : 'Classes enseignées:';
      doc.text(classesLabel, pageWidth - 15, footerY, { align: 'right' } as any);
      
      // Collecter toutes les classes uniques du professeur
      const classes = new Set<string>();
      for (const day of this.DAYS) {
        for (const ts of this.TIMESLOTS) {
          const entries = this.grid[day]?.[ts] || [];
          for (const entry of entries) {
            if (entry.subgroup) {
              const classBase = entry.subgroup.toString().split(':')[0];
              if (classBase) classes.add(classBase);
            }
          }
        }
      }
      
      // Afficher les classes dans un rectangle
      const classesText = Array.from(classes).join(' + ');
      doc.setFont(this.pdfArabicLoaded ? this.pdfArabicFontName : 'helvetica', 'normal');
      doc.setFontSize(9);
      
      footerY += 5;
      // Rectangle pour les classes
      const rectHeight = 15;
      doc.rect(25, footerY, pageWidth - 50, rectHeight);
      doc.text(classesText, pageWidth - 30, footerY + 10, { align: 'right', maxWidth: pageWidth - 60 } as any);
      
      footerY += rectHeight + 5;
    }
    
    // Pour les classes, ajouter le tableau des matières et professeurs
    if (this.viewMode === 'subgroups') {
      // Collecter toutes les matières et professeurs uniques
      const subjectsMap = new Map<string, Set<string>>();
      
      for (const day of this.DAYS) {
        for (const ts of this.TIMESLOTS) {
          const entries = this.grid[day]?.[ts] || [];
          for (const entry of entries) {
            if (entry.subject) {
              let subject = entry.subject.toString().replace(/_/g, ' ').trim();
              
              // Supprimer les suffixes (G1), (G2), etc.
              subject = subject.replace(/\s*\(G\d+\)\s*$/i, '').trim();
              
              const teacher = entry.teacher ? entry.teacher.toString().replace(/_/g, ' ').trim() : '';
              
              if (!subjectsMap.has(subject)) {
                subjectsMap.set(subject, new Set());
              }
              if (teacher) {
                subjectsMap.get(subject)!.add(teacher);
              }
            }
          }
        }
      }
      
      // Créer le tableau avec 3 paires de colonnes (Matière - Professeur)
      const header1 = lang === 'ar' ? 'المادة' : 'Matière';
      const header2 = lang === 'ar' ? 'الأستاذ(ة)' : 'Professeur';
      
      // Convertir en tableau et répartir sur 3 colonnes
      const allEntries: Array<[string, string]> = [];
      subjectsMap.forEach((teachers, subject) => {
        const teachersList = Array.from(teachers).join(', ');
        allEntries.push([subject, teachersList]);
      });
      
      // Créer les lignes avec 3 paires de colonnes
      const tableData: string[][] = [];
      for (let i = 0; i < allEntries.length; i += 3) {
        const row: string[] = [];
        
        // Première paire (Matière 1 - Prof 1)
        if (allEntries[i]) {
          row.push(allEntries[i][0]); // Matière
          row.push(allEntries[i][1]); // Prof
        } else {
          row.push('', '');
        }
        
        // Deuxième paire (Matière 2 - Prof 2)
        if (allEntries[i + 1]) {
          row.push(allEntries[i + 1][0]);
          row.push(allEntries[i + 1][1]);
        } else {
          row.push('', '');
        }
        
        // Troisième paire (Matière 3 - Prof 3)
        if (allEntries[i + 2]) {
          row.push(allEntries[i + 2][0]);
          row.push(allEntries[i + 2][1]);
        } else {
          row.push('', '');
        }
        
        tableData.push(row);
      }
      
      // Titre du tableau
      doc.setFont(this.pdfArabicLoaded ? this.pdfArabicFontName : 'helvetica', 'bold');
      doc.setFontSize(10);
      const tableTitle = lang === 'ar' ? 'لائحة الأساتذة المسندين حسب المواد' : 'Liste des professeurs par matière';
      doc.text(tableTitle, pageWidth / 2, footerY, { align: 'center' } as any);
      
      footerY += 5;
      
      // Générer le tableau avec autoTable (3 paires de colonnes)
      autoTable(doc, {
        startY: footerY,
        head: [[header1, header2, header1, header2, header1, header2]],
        body: tableData,
        theme: 'grid',
        styles: {
          font: this.pdfArabicLoaded ? this.pdfArabicFontName : 'helvetica',
          fontSize: 7,
          cellPadding: 1.5,
          halign: 'center',
          valign: 'middle',
        },
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 8,
        },
        columnStyles: {
          0: { cellWidth: 'auto' }, // Matière 1
          1: { cellWidth: 'auto' }, // Prof 1
          2: { cellWidth: 'auto' }, // Matière 2
          3: { cellWidth: 'auto' }, // Prof 2
          4: { cellWidth: 'auto' }, // Matière 3
          5: { cellWidth: 'auto' }, // Prof 3
        },
        margin: { left: 5, right: 5 },
      });
      
      footerY = (doc as any).lastAutoTable.finalY + 5;
    }
    
    // Ligne de séparation
    doc.setLineWidth(0.5);
    doc.line(20, footerY, pageWidth - 20, footerY);
    
    footerY += 8;
    
    // Date de génération (côté gauche)
    const currentDate = new Date().toLocaleDateString('fr-FR');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Document généré le ${currentDate}`, 20, footerY);
    
    // Signature/cachet (côté droit en arabe) - dans un rectangle
    doc.setFont(this.pdfArabicLoaded ? this.pdfArabicFontName : 'helvetica', 'normal');
    const signatureLabel = lang === 'ar' ? 'خاتم و توقيع السيد مدير المؤسسة' : 'Signature et cachet';
    
    // Rectangle pour signature
    const sigWidth = 120;
    const sigHeight = 20;
    const sigX = pageWidth - sigWidth - 20;
    doc.rect(sigX, footerY - 5, sigWidth, sigHeight);
    doc.text(signatureLabel, sigX + sigWidth / 2, footerY + 5, { align: 'center' } as any);
  }

  private getEstablishmentInfo(): string[] {
    const si = this.schoolInfo || ({} as any);
    const lines: string[] = [];
    if (si.academy) lines.push(si.academy);
    if (si.direction) lines.push(si.direction);
    if (si.establishment) lines.push(si.establishment);
    // NE PAS inclure l'année scolaire ici — elle est affichée sur la ligne suivante (gauche)
    return lines.length ? lines : ['المؤسسة التعليمية', 'المديرية'];
  }

  private async loadImageAsDataUrl(url: string): Promise<string | null> {
    try {
      // If already a data URL, return as-is
      if (url.startsWith('data:image/')) return url;
      const resp = await fetch(url, { mode: 'cors' });
      if (!resp.ok) return null;
      const blob = await resp.blob();
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  private getTimetableTitle(): string {
    let title = 'جدول الأوقات - ';
    
    if (this.viewMode === 'teachers' && this.selectedTeacher) {
      title += `الأستاذ(ة): ${this.selectedTeacher}`;
    } else if (this.viewMode === 'subgroups' && this.selectedSubgroup) {
      title += `القسم: ${this.selectedSubgroup}`;
    } else if (this.viewMode === 'rooms' && this.selectedRoom) {
      title += this.langService.getCurrentLanguage() === 'fr' ? `Salle: ${this.selectedRoom}` : `القاعة: ${this.selectedRoom}`;
    } else if (this.viewMode === 'vacant') {
      title += this.langService.getCurrentLanguage() === 'fr' ? 'Salles vacantes' : 'القاعات الشاغرة';
    } else {
      title += 'عام';
    }
    
    return title;
  }

  private reverseTimeSlot(ts: string): string {
    // Inverser les heures (08:30 - 09:30 devient 09:30 - 08:30)
    if (!ts || !ts.includes(' - ')) return ts;
    const parts = ts.split(' - ');
    if (parts.length !== 2) return ts;
    return `${parts[1]} - ${parts[0]}`; // Inverser l'ordre
  }

  private prepareTableDataForPDF() {
    const lang = this.langService.getCurrentLanguage();
    
    // Pour les PROFS, CLASSES, SALLES et SALLES VACANTES en arabe: [colonnes = heures] et [lignes = jours] avec colonne jour à droite
    if (this.viewMode === 'teachers' || this.viewMode === 'rooms' || this.viewMode === 'vacant' || (this.viewMode === 'subgroups' && lang === 'ar')) {
      const times = [...this.TIMESLOTS];
      // En arabe on affiche: la colonne des jours à droite, et les heures vers la gauche (ordre inversé)
      if (lang === 'ar') times.reverse();

      const dayHeader = lang === 'ar' ? 'الساعة / اليوم' : 'Jour / Heure';
      // Inverser le format des heures en arabe (09:30 - 08:30)
      const headers: string[] = lang === 'ar' 
        ? times.map(ts => this.processPdfText(this.reverseTimeSlot(ts)))
        : times.map(ts => this.processPdfText(ts));
      headers.push(this.processPdfText(dayHeader));

      const rows: any[][] = [];

      // Format pour professeurs
      const formatTeacherEntries = (entries: any[]): string => {
        if (!entries || entries.length === 0) return '';
        
        const classLines: string[] = [];
        const rooms = new Set<string>();
        for (const e of entries) {
          if (!e) continue;
          
          const subgroupRaw = (e.subgroup || '').toString();
          const classBase = subgroupRaw ? subgroupRaw.split(':')[0] : '';
          const group = subgroupRaw && subgroupRaw.includes(':') ? `(${subgroupRaw.split(':')[1]})` : '';
          const classLabel = [classBase, group].filter(Boolean).join(' ').trim();
          if (classLabel) classLines.push(classLabel);
          const room = (e.room || '').toString().trim();
          if (room) rooms.add(room);
        }
        const uniqClass = Array.from(new Set(classLines));
        const roomLine = Array.from(rooms).join(', ');
        return [ ...uniqClass, roomLine ].filter(s => s && s.trim() !== '').join('\n');
      };
      
      // Format pour salles
      const formatRoomEntries = (entries: any[]): string => {
        if (!entries || entries.length === 0) return '';
        
        const lines: string[] = [];
        for (const e of entries) {
          if (!e) continue;
          
          const classLabel = (e.subgroup || '').toString().trim();
          const subject = (e.subject || '').toString().trim();
          const teacher = (e.teacher || '').toString().trim();
          
          if (classLabel) lines.push(classLabel);
          if (subject) lines.push(subject);
          if (teacher) lines.push(teacher);
        }
        return lines.filter(s => s && s.trim() !== '').join('\n');
      };
      
      // Format pour salles vacantes
      const formatVacantEntries = (entries: any[]): string => {
        if (!entries || entries.length === 0) return '';
        
        const rooms = new Set<string>();
        for (const e of entries) {
          if (!e) continue;
          const room = (e.room || e.subgroup || '').toString().trim();
          if (room) rooms.add(room);
        }
        return Array.from(rooms).join(', ');
      };

      // Format pour classes (subgroups) - séparer par groupes G1, G2, etc.
      const formatSubgroupEntries = (entries: any[]): string => {
        if (!entries || entries.length === 0) return '';
        
        const cleanText = (text: string): string => {
          if (!text) return '';
          // Remplacer SEULEMENT les underscores par espaces, garder les tirets
          return text.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
        };
        
        // Grouper par groupe (G1, G2, etc.) extrait du nom de la matière
        const groupMap = new Map<string, any[]>();
        
        for (const e of entries) {
          if (!e) continue;
          
          const subject = cleanText((e.subject || '').toString());
          // Extraire le groupe (G1), (G2) etc.
          const groupMatch = subject.match(/\(G(\d+)\)/i);
          const groupKey = groupMatch ? `G${groupMatch[1]}` : 'default';
          
          if (!groupMap.has(groupKey)) {
            groupMap.set(groupKey, []);
          }
          groupMap.get(groupKey)!.push(e);
        }
        
        // Si un seul groupe, affichage normal
        if (groupMap.size === 1) {
          const lines: string[] = [];
          const rooms = new Set<string>();
          
          for (const e of entries) {
            if (!e) continue;
            
            const subject = cleanText((e.subject || '').toString());
            const teacher = cleanText((e.teacher || '').toString());
            
            if (subject) lines.push(subject);
            if (teacher) lines.push(teacher);
            
            const room = (e.room || '').toString().trim();
            if (room) rooms.add(room);
          }
          
          const roomLine = Array.from(rooms).join(', ');
          return [...lines, roomLine].filter(s => s && s.trim() !== '').join('\n');
        }
        
        // Plusieurs groupes : séparer par ligne de tirets
        const groupBlocks: string[] = [];
        
        groupMap.forEach((groupEntries, groupKey) => {
          const lines: string[] = [];
          const rooms = new Set<string>();
          
          for (const e of groupEntries) {
            const subject = cleanText((e.subject || '').toString());
            const teacher = cleanText
            const room = (e.room || '').toString().trim();
            if (room) rooms.add(room);
          }
          
          const roomLine = Array.from(rooms).join(', ');
          groupBlocks.push([...lines, roomLine].filter(s => s && s.trim() !== '').join('\n'));
        });
        
        // Joindre les groupes avec séparateur
        return groupBlocks.join('\n────────\n');
      };

      // Une ligne par jour avec fusion des cellules identiques adjacentes
      for (const day of this.DAYS) {
        const rawRow: string[] = [];
        for (const ts of times) {
          const entries: any[] = (this.grid[day] && this.grid[day][ts]) ? this.grid[day][ts] : [];
          let text = '';
          if (this.viewMode === 'teachers') {
            text = this.processPdfText(formatTeacherEntries(entries));
          } else if (this.viewMode === 'rooms') {
            text = this.processPdfText(formatRoomEntries(entries));
          } else if (this.viewMode === 'vacant') {
            text = this.processPdfText(formatVacantEntries(entries));
          } else {
            text = this.processPdfText(formatSubgroupEntries(entries));
          }
          rawRow.push(text);
        }
        
        // Fusionner les cellules identiques adjacentes (non vides)
        const mergedRow: any[] = [];
        let i = 0;
        while (i < rawRow.length) {
          const currentCell = rawRow[i];
          let colspan = 1;
          
          // Compter les cellules identiques adjacentes (si non vide)
          // Ne fusionner que si le contenu est exactement identique ET non vide
          if (currentCell && currentCell.trim() !== '') {
            while (i + colspan < rawRow.length && 
                   rawRow[i + colspan] === currentCell &&
                   rawRow[i + colspan].trim() !== '') {
              colspan++;
            }
          }
          
          // Ajouter la cellule avec colspan si > 1
          if (colspan > 1) {
            mergedRow.push({ content: currentCell, colSpan: colspan });
          } else {
            mergedRow.push(currentCell);
          }
          
          i += colspan;
        }
        
        // Dernière cellule: nom du jour (ar/fr selon langue)
        const dayLabel = lang === 'ar' ? this.DAYS_DISPLAY[this.DAYS.indexOf(day)] : day;
        mergedRow.push(this.processPdfText(dayLabel));
        rows.push(mergedRow);
      }

      return { headers, rows };
    }

    // Mise en page par défaut pour classes en français (heures en première colonne, jours en colonnes)
    // Cette section n'est utilisée que pour les classes en français
    const timeHeader = this.langService.getCurrentLanguage() === 'ar' ? 'الفترة' : 'Heure';
    
    const headers: string[] = [this.processPdfText(timeHeader)].concat(
      this.DAYS_DISPLAY.map((d) => this.processPdfText(d))
    );

    const rows: string[][] = [];

    const formatEntry = (e: any): string => {
      if (!e) return '';
      const lang = this.langService.getCurrentLanguage();
      // Nettoyer les underscores pour éviter les problèmes d'affichage
      const cleanText = (text: string): string => {
        if (!text) return '';
        return text.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
      };
      
      const subject = cleanText((e.subject || '').toString());
      const teacher = cleanText((e.teacher || '').toString());
      const roomLabel = e.room ? (lang==='ar' ? 'قاعة' : 'Salle') : '';
      const roomNumber = e.room ? `${e.room}` : '';
      const parts = [subject, teacher, roomLabel, roomNumber].filter(s => !!s && s.trim() !== '');
      return parts.join('\n');
    };

    // Pour classes en français, utiliser l'ordre normal des jours
    const daysForContent = this.DAYS;

    for (let i = 0; i < this.TIMESLOTS.length; i++) {
      const ts = this.TIMESLOTS[i];
      const row: string[] = [this.processPdfText(ts)];
      for (const day of daysForContent) {
        const entries: any[] = (this.grid[day] && this.grid[day][ts]) ? this.grid[day][ts] : [];
        const text = entries.map(formatEntry).filter(Boolean).join('\n');
        row.push(this.processPdfText(text));
      }
      rows.push(row);
    }
    return { headers, rows };
  }

  private getFilename(): string {
    const date = new Date().toISOString().split('T')[0];
    let filename = `emploi-du-temps-${date}`;
    
    if (this.viewMode === 'teachers' && this.selectedTeacher) {
      filename += `-prof-${this.selectedTeacher.replace(/\s+/g, '-')}`;
    } else if (this.viewMode === 'subgroups' && this.selectedSubgroup) {
      filename += `-classe-${this.selectedSubgroup}`;
    } else if (this.viewMode === 'vacant') {
      filename += `-salles-vacantes`;
    }
    
    return filename + '.pdf';
  }

  async exportPdfAll() {
    try {
      // Déterminer les items à exporter selon le mode
      const items: string[] = this.viewMode === 'teachers' ? this.teachers : 
                              this.viewMode === 'rooms' ? this.rooms : 
                              this.subgroups;
      if (!items || items.length === 0) {
        alert(this.langService.getCurrentLanguage() === 'fr' ? 
          'Aucun élément à exporter' : 
          'لا توجد عناصر للتصدير');
        return;
      }

      // Sauvegarder la sélection précédente
      const prevTeacher = this.selectedTeacher;
      const prevSubgroup = this.selectedSubgroup;
      const prevRoom = this.selectedRoom;

      // Message d'information
      const totalItems = items.length;
      const typeLabel = this.viewMode === 'teachers' ? 
        (this.langService.getCurrentLanguage() === 'fr' ? 'Tous les enseignants' : 'جميع المدرسين') :
        this.viewMode === 'rooms' ?
        (this.langService.getCurrentLanguage() === 'fr' ? 'Toutes les salles' : 'جميع القاعات') :
        (this.langService.getCurrentLanguage() === 'fr' ? 'Toutes les classes' : 'جميع الأقسام');
        
      const message = this.langService.getCurrentLanguage() === 'fr' ? 
        `📄 GÉNÉRATION DE ${totalItems} PDFs\n\n✅ Format professionnel avec jsPDF\n✅ Support arabe optimisé\n✅ ${typeLabel}\n\nCela peut prendre quelques instants...\nVeuillez patienter.` : 
        `📄 إنشاء ${totalItems} ملف PDF\n\n✅ تنسيق مهني مع jsPDF\n✅ دعم محسن للعربية\n✅ ${typeLabel}\n\nقد يستغرق هذا بعض الوقت...\nيرجى الانتظار.`;
      
      alert(message);

      // Récupérer l'orientation configurée
      const ps = this.getPrintSettings();
      const orientation = ps.pdfOrientation || 'portrait';

      // Créer un document PDF unique avec toutes les pages
      const doc = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: 'a4'
      });

      // Charger les polices Unicode une seule fois
      await this.ensurePdfFont(doc);
      const defaultFont = this.pdfArabicLoaded ? this.pdfArabicFontName : 'helvetica';
      doc.setFont(defaultFont);

      let isFirstPage = true;

      // Générer chaque emploi du temps
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Sélectionner l'item courant
        if (this.viewMode === 'teachers') {
          this.selectedTeacher = item;
        } else if (this.viewMode === 'rooms') {
          this.selectedRoom = item;
        } else {
          this.selectedSubgroup = item;
        }
        
        // Charger les données
        this.showTimetable();
        
        // Attendre que les données soient chargées
        await this.wait(100);

        // Ajouter une nouvelle page si ce n'est pas la première
        if (!isFirstPage) {
          doc.addPage();
        }
        isFirstPage = false;

        // En-tête officiel (logo centré)
        await this.addOfficialHeader(doc);
        
        // Logo + informations d'établissement + titre
        const afterHeaderY = await this.addTimetableTitle(doc);
        
        // Générer le tableau avec autoTable
        this.generateTimetableTable(doc, afterHeaderY + 6);
        
        // Pied de page
        this.addFooter(doc);
      }

      // Restaurer la sélection précédente
      this.selectedTeacher = prevTeacher;
      this.selectedSubgroup = prevSubgroup;
      this.selectedRoom = prevRoom;
      this.showTimetable();

      // Sauvegarder le PDF unique
      const filename = this.viewMode === 'teachers' ? 
        'tous-les-enseignants.pdf' :
        this.viewMode === 'rooms' ?
        'toutes-les-salles.pdf' : 
        'toutes-les-classes.pdf';
      
      doc.save(filename);

      // Message de succès
      const successMessage = this.langService.getCurrentLanguage() === 'fr' ? 
        `✅ ${totalItems} emplois du temps générés avec succès !\n\nFichier téléchargé : ${filename}` : 
        `✅ تم إنشاء ${totalItems} جدول بنجاح!\n\nالملف المحمل : ${filename}`;
      
      alert(successMessage);
      
    } catch (error) {
      console.error('Erreur lors de la génération des PDFs:', error);
      alert('Erreur lors de la génération des PDFs. Vérifiez la console.');
    }
  }

  async exportGlobalViewPdf() {
    try {
      if (!this.globalCellMatrix || this.globalCellMatrix.length === 0) {
        alert(this.langService.getCurrentLanguage() === 'fr' ? 
          'Aucune donnée à exporter' : 
          'لا توجد بيانات للتصدير');
        return;
      }

      const message = this.langService.getCurrentLanguage() === 'fr' ? 
        `📄 GÉNÉRATION DU PDF A3\n\n✅ Format A3 paysage\n✅ Vue globale complète\n✅ Optimisé pour une seule page\n\nCela peut prendre quelques instants...\nVeuillez patienter.` : 
        `📄 إنشاء ملف PDF A3\n\n✅ تنسيق A3 أفقي\n✅ عرض شامل كامل\n✅ محسّن لصفحة واحدة\n\nقد يستغرق هذا بعض الوقت...\nيرجى الانتظار.`;
      
      alert(message);

      // Créer un document PDF A3 en paysage avec RTL
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a3',  // 420 x 297 mm
        putOnlyUsedFonts: true,
        compress: true
      });

      // Charger les polices Unicode
      await this.ensurePdfFont(doc);
      const defaultFont = this.pdfArabicLoaded ? this.pdfArabicFontName : 'helvetica';
      doc.setFont(defaultFont);

      // Préparer les données pour autoTable
      const headers: string[] = [];
      const rows: any[][] = [];

      if (this.globalViewOrientation === 'teachersRows') {
        // En-tête pour teachersRows: Jours → Périodes → Heures
        const headerRow1: any[] = []; // Vide au début, on ajoutera l'enseignant après inversion
        const headerRow2: any[] = [];
        const headerRow3: any[] = [];

        for (const dayHeader of this.globalHeaders) {
          headerRow1.push({ content: this.processPdfText(dayHeader.day), colSpan: 8, styles: { halign: 'center', fontStyle: 'bold' } });
          for (const period of dayHeader.periods) {
            headerRow2.push({ content: this.processPdfText(period.label), colSpan: 4, styles: { halign: 'center' } });
            for (let i = 1; i <= 4; i++) {
              headerRow3.push({ content: i.toString(), styles: { halign: 'center' } });
            }
          }
        }

        // Construire les lignes de données - RENVERSER L'ORDRE DES COLONNES POUR RTL
        for (let r = 0; r < this.globalRowHeaders.length; r++) {
          const row: any[] = [];
          
          // Collecter toutes les cellules d'abord
          const cells: any[] = [];
          for (let c = 0; c < this.globalCellMatrix[r].length; c++) {
            const cellInfo = this.globalCellMatrix[r][c];
            if (cellInfo.render) {
              let cellText = '';
              if (cellInfo.data && cellInfo.data.length > 0) {
                cellText = cellInfo.data.map((entry: any) => {
                  const parts = [];
                  if (entry.subgroup) parts.push(this.processPdfText(entry.subgroup));
                  if (entry.subject) parts.push(this.processPdfText(entry.subject));
                  if (entry.room) parts.push(this.processPdfText(entry.room));
                  return parts.join('\n');
                }).join('\n---\n');
              }
              
              if (cellInfo.colspan > 1) {
                cells.push({ content: cellText, colSpan: cellInfo.colspan, styles: { fontSize: 5 } });
              } else {
                cells.push({ content: cellText, styles: { fontSize: 5 } });
              }
            }
          }
          
          // Renverser l'ordre des cellules pour RTL
          cells.reverse();
          
          // Ajouter le nom de l'enseignant à la fin (à gauche en RTL)
          cells.push(this.processPdfText(this.globalRowHeaders[r]));
          
          rows.push(cells);
        }
        
        // Renverser aussi les en-têtes pour RTL
        headerRow1.reverse();
        // Ajouter le label pour la colonne des enseignants à la fin (à gauche en RTL)
        headerRow1.push({ 
          content: this.processPdfText(this.langService.getCurrentLanguage() === 'fr' ? 'Enseignant' : 'المدرس'), 
          rowSpan: 3, 
          styles: { halign: 'center', fontStyle: 'bold' } 
        });
        
        headerRow2.reverse();
        headerRow3.reverse();

        // Générer le tableau avec autoTable - OPTIMISÉ POUR UNE SEULE PAGE A3
        autoTable(doc, {
          head: [headerRow1, headerRow2, headerRow3],
          body: rows,
          styles: {
            font: defaultFont,
            fontSize: 4.5,  // Réduire encore plus pour tenir sur une page
            cellPadding: 0,  // Aucun padding - contenu colle aux bordures
            halign: 'center',  // Centrer le contenu
            valign: 'middle',
            overflow: 'linebreak',
            cellWidth: 'auto',
            lineColor: [0, 0, 0],
            lineWidth: 0.1,
            minCellHeight: 2  // Hauteur minimale réduite
          },
          headStyles: {
            fillColor: [200, 200, 200],
            textColor: [0, 0, 0],
            fontSize: 5,
            fontStyle: 'bold',
            halign: 'center',  // Centrer les en-têtes
            cellPadding: 0.1,  // Padding minimal pour les en-têtes
            minCellHeight: 2
          },
          columnStyles: {
            0: { cellWidth: 18, halign: 'center' }  // Dernière colonne (enseignants)
          },
          margin: { top: 2, right: 2, bottom: 2, left: 2 },  // Marges réduites
          theme: 'grid',
          tableWidth: 'auto',
          didParseCell: (data: any) => {
            // Forcer la police Amiri pour l'arabe
            if (this.pdfArabicLoaded) {
              data.cell.styles.font = this.pdfArabicFontName;
            }
            
            // Centrer toutes les cellules
            data.cell.styles.halign = 'center';
            
            // Appliquer le fond gris aux cellules vides (sauf en-têtes)
            if (data.section === 'body') {
              const cellText = data.cell.text?.toString().trim() || '';
              if (cellText === '' || cellText.length === 0) {
                data.cell.styles.fillColor = [224, 224, 224];
              }
            }
          }
        });

      } else {
        // En-tête pour daysRows: Enseignants (colonnes)
        const headerRow: any[] = [];
        
        // Ajouter d'abord les enseignants (qui seront à droite après inversion)
        for (const teacher of this.globalHeaders) {
          headerRow.push({ content: this.processPdfText(teacher), styles: { halign: 'center', fontStyle: 'bold', fontSize: 4.5 } });
        }
        
        // Puis ajouter Jour/Période/Heure à la fin (qui sera à gauche après inversion)
        headerRow.push({ content: this.processPdfText(this.langService.getCurrentLanguage() === 'fr' ? 'Jour/Période/Heure' : 'اليوم/الفترة/الساعة'), colSpan: 3, styles: { halign: 'center', fontStyle: 'bold' } });

        // Construire les lignes avec la structure Jour/Période/Heure
        const daysStructure = this.getDaysForDaysRows();
        let rowIdx = 0;
        
        // D'abord, construire toutes les lignes avec les données
        const tempRows: any[] = [];
        
        for (let dayIdx = 0; dayIdx < daysStructure.length; dayIdx++) {
          const dayHeader = daysStructure[dayIdx];
          
          for (let periodIdx = 0; periodIdx < dayHeader.periods.length; periodIdx++) {
            const period = dayHeader.periods[periodIdx];
            
            for (let slotIdx = 0; slotIdx < 4; slotIdx++) {
              const row: any[] = [];
              
              // Jour (rowspan pour 8 lignes)
              if (periodIdx === 0 && slotIdx === 0) {
                row.push({ content: this.processPdfText(dayHeader.day), rowSpan: 8, styles: { halign: 'center', fontStyle: 'bold' } });
              }
              
              // Période (rowspan pour 4 lignes)
              if (slotIdx === 0) {
                row.push({ content: this.processPdfText(period.label), rowSpan: 4, styles: { halign: 'center' } });
              }
              
              // Numéro de l'heure
              row.push({ content: (slotIdx + 1).toString(), styles: { halign: 'center' } });
              
              // Données pour chaque enseignant (stocker temporairement)
              const teacherCells: any[] = [];
              if (this.globalCellMatrix[rowIdx]) {
                for (let c = 0; c < this.globalCellMatrix[rowIdx].length; c++) {
                  const cellInfo = this.globalCellMatrix[rowIdx][c];
                  if (cellInfo.render) {
                    let cellText = '';
                    if (cellInfo.data && cellInfo.data.length > 0) {
                      cellText = cellInfo.data.map((entry: any) => {
                        const parts = [];
                        if (entry.subgroup) parts.push(this.processPdfText(entry.subgroup));
                        if (entry.subject) parts.push(this.processPdfText(entry.subject));
                        if (entry.room) parts.push(this.processPdfText(entry.room));
                        return parts.join('\n');
                      }).join('\n---\n');
                    }
                    teacherCells.push({ content: cellText, styles: { fontSize: 5 }, _originalText: cellText });
                  }
                }
              }
              
              tempRows.push({ 
                dayCol: row, 
                teacherCells: teacherCells, 
                rowIdx: rowIdx,
                dayIdx: dayIdx,      // Stocker l'index du jour
                periodIdx: periodIdx  // Stocker l'index de la période
              } as any);
              rowIdx++;
            }
          }
        }
        
        // Maintenant, appliquer la fusion verticale pour les cellules enseignants
        // IMPORTANT: Ne fusionner que si même jour ET même période
        const numTeachers = (tempRows[0] as any)?.teacherCells?.length || 0;
        const merged: boolean[][] = Array(tempRows.length).fill(null).map(() => Array(numTeachers).fill(false));
        
        for (let col = 0; col < numTeachers; col++) {
          for (let row = 0; row < tempRows.length; row++) {
            if (merged[row][col]) continue;
            
            const currentText = ((tempRows[row] as any).teacherCells[col]?._originalText || '').trim();
            // Cellule vide, pas de fusion
            if (!currentText || currentText.length === 0) continue;
            
            const currentDayIdx = (tempRows[row] as any).dayIdx;
            const currentPeriodIdx = (tempRows[row] as any).periodIdx;
            
            // Compter combien de lignes consécutives ont le même contenu non-vide
            // ET sont dans la même période et le même jour
            let spanCount = 1;
            for (let nextRow = row + 1; nextRow < tempRows.length; nextRow++) {
              const nextDayIdx = (tempRows[nextRow] as any).dayIdx;
              const nextPeriodIdx = (tempRows[nextRow] as any).periodIdx;
              
              // Vérifier que c'est le même jour ET la même période
              if (nextDayIdx !== currentDayIdx || nextPeriodIdx !== currentPeriodIdx) {
                break; // Différente période ou jour, arrêter la fusion
              }
              
              const nextText = ((tempRows[nextRow] as any).teacherCells[col]?._originalText || '').trim();
              // Comparer texte non-vide ET identique
              if (nextText && nextText.length > 0 && nextText === currentText) {
                spanCount++;
                merged[nextRow][col] = true;
              } else {
                break; // Arrêter dès qu'on trouve une cellule différente ou vide
              }
            }
            
            // Appliquer le rowSpan si > 1
            if (spanCount > 1) {
              (tempRows[row] as any).teacherCells[col].rowSpan = spanCount;
            }
          }
        }
        
        // Construire les lignes finales en sautant les cellules fusionnées
        // ET en inversant l'ordre des colonnes pour RTL
        for (let r = 0; r < tempRows.length; r++) {
          const finalRow: any[] = [];
          
          // Ajouter d'abord les cellules enseignants (qui seront à droite)
          for (let c = 0; c < numTeachers; c++) {
            if (!merged[r][c]) {
              finalRow.push((tempRows[r] as any).teacherCells[c]);
            }
          }
          
          // Puis ajouter les colonnes Jour/Période/Heure à la fin (qui seront à gauche)
          finalRow.push(...(tempRows[r] as any).dayCol);
          
          rows.push(finalRow);
        }

        // Générer le tableau avec autoTable - OPTIMISÉ POUR UNE SEULE PAGE A3
        const totalTeachers = this.globalHeaders.length;
        const dayColIdx = totalTeachers;     // Jour est maintenant à la fin
        const periodColIdx = totalTeachers + 1; // Période après Jour
        const hourColIdx = totalTeachers + 2;   // Heure en dernier
        
        autoTable(doc, {
          head: [headerRow],
          body: rows,
          styles: {
            font: defaultFont,
            fontSize: 4,  // Réduire à 4pt pour optimiser l'espace
            cellPadding: 0,  // Aucun padding - contenu colle aux bordures
            halign: 'center',  // Centrer le contenu
            valign: 'middle',
            overflow: 'linebreak',
            cellWidth: 'auto',
            lineColor: [0, 0, 0],
            lineWidth: 0.1,
            minCellHeight: 2
          },
          headStyles: {
            fillColor: [200, 200, 200],
            textColor: [0, 0, 0],
            fontSize: 4.5,
            fontStyle: 'bold',
            halign: 'center',  // Centrer les en-têtes
            cellPadding: 0.1,  // Padding minimal pour les en-têtes
            minCellHeight: 2
          },
          columnStyles: {
            [dayColIdx]: { cellWidth: 12, halign: 'center' },     // Jour (réduit de 15 à 12)
            [periodColIdx]: { cellWidth: 10, halign: 'center' },  // Période (réduit de 12 à 10)
            [hourColIdx]: { cellWidth: 6, halign: 'center' }      // Heure (réduit de 7 à 6)
          },
          margin: { top: 2, right: 2, bottom: 2, left: 2 },  // Marges réduites
          theme: 'grid',
          tableWidth: 'auto',
          didParseCell: (data: any) => {
            // Forcer la police Amiri pour l'arabe
            if (this.pdfArabicLoaded) {
              data.cell.styles.font = this.pdfArabicFontName;
            }
            
            // Centrer toutes les cellules
            data.cell.styles.halign = 'center';
            
            // Appliquer le fond gris aux cellules vides (sauf en-têtes)
            if (data.section === 'body') {
              const cellText = data.cell.text?.toString().trim() || '';
              if (cellText === '' || cellText.length === 0) {
                data.cell.styles.fillColor = [224, 224, 224];
              }
            }
          }
        });
      }

      // Sauvegarder le PDF
      const filename = this.globalViewOrientation === 'teachersRows' ? 
        'vue-globale-enseignants.pdf' : 
        'vue-globale-jours.pdf';
      
      doc.save(filename);

      const successMessage = this.langService.getCurrentLanguage() === 'fr' ? 
        `✅ PDF A3 généré avec succès !\n\nFichier téléchargé : ${filename}` : 
        `✅ تم إنشاء ملف PDF A3 بنجاح!\n\nالملف المحمل : ${filename}`;
      
      alert(successMessage);
      
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      alert('Erreur lors de la génération du PDF. Vérifiez la console.');
    }
  }

  colorForSubject(subject: string): string {
    if(!subject) return '';
    // Hash simple du nom de la matière
    let hash = 0;
    for (let i = 0; i < subject.length; i++) {
      hash = subject.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Générer une teinte pastel (saturation et luminosité fixes pour des couleurs douces)
    const h = Math.abs(hash % 360);
    const color = `hsl(${h}, 70%, 85%)`;
    return color;
  }
  
  /**
   * Extrait la liste unique des classes enseignées par le professeur sélectionné
   */
  getTeacherClasses(): string[] {
    const classes = new Set<string>();
    
    // Parcourir tous les slots affichés dans le tableau
    for (const day of this.DAYS) {
      const timeslots = this.cellMatrix[day];
      if (!timeslots) continue;
      
      for (const slot of timeslots) {
        if (!slot.entries || slot.entries.length === 0) continue;
        
        for (const entry of slot.entries) {
          if (entry.subgroup && entry.subgroup.trim()) {
            // Extraire le nom de base de la classe (sans :G1, :G2, etc.)
            const className = entry.subgroup.split(':')[0].trim();
            if (className) {
              classes.add(className);
            }
          }
        }
      }
    }
    
    return Array.from(classes).sort();
  }

  /**
   * Pour la vue "subgroups" (classe), retourne la liste dédupliquée des paires {matière, enseignant}
   * trouvées dans le tableau courant.
   */
  getSubjectTeacherPairsForClass(): Array<{ subject: string; teacher: string }>{
    if (this.viewMode !== 'subgroups' || !this.selectedSubgroup) return [];
    // Construire une table: subjectNormal -> (teacherNormal -> count)
    const bySubject = new Map<string, Map<string, number>>();

    const normalizeSubject = (s: string) => {
      if (!s) return '';
      // Supprimer marqueurs de groupes (G1, G2, ...) dans le libellé de la matière également
      let v = s.replace(/[\s:()\-]*G\d+\b/gi, '');
      // Nettoyer les parenthèses restantes éventuelles
      v = v.replace(/[()]/g, '');
      // Remplacer underscores par espaces et compacter les espaces
      v = v.replace(/_/g, ' ');
      v = v.replace(/\s+/g, ' ').trim();
      return v;
    };
    const normalizeTeacher = (s: string) => {
      if (!s) return '';
      let v = s;
      // Supprimer marqueurs de groupes (G1, G2, ...)
      v = v.replace(/[\s:()\-]*G\d+\b/gi, '');
      v = v.replace(/_/g, ' ');
      v = v.replace(/\s+/g, ' ').trim();
      return v;
    };

    for (const day of this.DAYS) {
      const timeslots = this.cellMatrix[day];
      if (!timeslots) continue;
      for (const slot of timeslots) {
        if (!slot.entries || slot.entries.length === 0) continue;
        for (const entry of slot.entries) {
          const subjectRaw = (entry.subject || '').toString();
          const teacherRaw = (entry.teacher || '').toString();
          const subject = normalizeSubject(subjectRaw);
          const teacher = normalizeTeacher(teacherRaw);
          if (!subject && !teacher) continue;
          if (!bySubject.has(subject)) bySubject.set(subject, new Map<string, number>());
          const map = bySubject.get(subject)!;
          map.set(teacher, (map.get(teacher) || 0) + 1);
        }
      }
    }

    // Pour chaque matière, sélectionner l'enseignant le plus fréquent
    const result: Array<{ subject: string; teacher: string }> = [];
    for (const [subject, tmap] of bySubject.entries()) {
      let bestTeacher = '';
      let bestCount = -1;
      for (const [teacher, count] of tmap.entries()) {
        if (count > bestCount) { bestCount = count; bestTeacher = teacher; }
      }
      result.push({ subject, teacher: bestTeacher });
    }

    // Trier par matière puis enseignant
    return result.sort((a,b) => {
      const s = a.subject.localeCompare(b.subject);
      return s !== 0 ? s : a.teacher.localeCompare(b.teacher);
    });
  }

  /**
   * Groupe la liste des paires matière/enseignant par lignes de `perRow` éléments
   * (pour construire un tableau multi-colonnes: deux colonnes par paire).
   */
  groupPairsForSummary(perRow = 3): Array<Array<{ subject: string; teacher: string } | null>> {
    const pairs = this.getSubjectTeacherPairsForClass();
    const rows: Array<Array<{ subject: string; teacher: string } | null>> = [];
    for (let i = 0; i < pairs.length; i += perRow) {
      const slice = pairs.slice(i, i + perRow);
      const row: Array<{ subject: string; teacher: string } | null> = [];
      // Fill with items then pad to perRow with nulls
      for (let j = 0; j < perRow; j++) {
        row.push(slice[j] || null);
      }
      rows.push(row);
    }
    if (rows.length === 0) {
      // Ensure at least one empty row to keep table structure
      rows.push(new Array(perRow).fill(null));
    }
    return rows;
  }

  objectKeys(obj: any): string[] {
    return Object.keys(obj);
  }

  setLanguage(lang: Language): void {
    this.langService.setLanguage(lang);
  }

  private updateDaysForLanguage(lang: Language): void {
    if (lang === 'ar') {
      this.DAYS_DISPLAY = ['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    } else {
      this.DAYS_DISPLAY = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    }
  }
}
