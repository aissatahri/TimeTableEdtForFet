import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RenameConfigComponent } from '../rename-config/rename-config.component';
import { LanguageService } from '../services/language.service';

export interface SchoolInfo {
  academy: string;
  direction: string;
  establishment: string;
  logoUrl: string;
  logoSize: number; // en pixels
  logoWidthCm?: number; // largeur en cm (optionnel)
  logoHeightCm?: number; // hauteur en cm (optionnel)
  schoolYear?: string; // année scolaire (ex: "2024-2025")
}

@Component({
  selector: 'app-school-config',
  standalone: true,
  imports: [CommonModule, FormsModule, RenameConfigComponent],
  templateUrl: './school-config.component.html',
  styleUrls: ['./school-config.component.scss']
})
export class SchoolConfigComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  activeTab: 'school' | 'rename' | 'print' = 'school';
  
  schoolInfo: SchoolInfo = {
    academy: '',
    direction: '',
    establishment: '',
    logoUrl: '',
    logoSize: 100,
    logoWidthCm: 11,
    logoHeightCm: 2,
    schoolYear: '2024-2025'
  };
  
  logoFile?: File;
  logoPreview?: string;

  constructor(public lang: LanguageService) {}

  ngOnInit(): void {
    // Charger les informations sauvegardées
    const saved = localStorage.getItem('schoolInfo');
    if (saved) {
      this.schoolInfo = JSON.parse(saved);
      // Appliquer des valeurs par défaut si l'ancienne sauvegarde ne contient pas logoSize
      if (!this.schoolInfo.logoSize || isNaN(this.schoolInfo.logoSize as any)) {
        this.schoolInfo.logoSize = 100;
      }
      // Valeurs par défaut pour largeur/hauteur en cm si absentes
      if (!this.schoolInfo.logoWidthCm || isNaN(this.schoolInfo.logoWidthCm as any)) {
        this.schoolInfo.logoWidthCm = 11;
      }
      if (!this.schoolInfo.logoHeightCm || isNaN(this.schoolInfo.logoHeightCm as any)) {
        this.schoolInfo.logoHeightCm = 2;
      }
      // Valeur par défaut pour l'année scolaire si absente
      if (!this.schoolInfo.schoolYear) {
        this.schoolInfo.schoolYear = '2024-2025';
      }
      this.logoPreview = this.schoolInfo.logoUrl;
    }

    // Charger paramètres d'impression
    this.loadPrintSettings();
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.logoFile = input.files[0];
      
      // Créer une prévisualisation
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        this.logoPreview = e.target?.result as string;
      };
      reader.readAsDataURL(this.logoFile);
    }
  }

  save(): void {
    // Sauvegarder le logo en base64 si un fichier a été sélectionné
    if (this.logoPreview) {
      this.schoolInfo.logoUrl = this.logoPreview;
    }
    
    // Sauvegarder dans localStorage
    localStorage.setItem('schoolInfo', JSON.stringify(this.schoolInfo));
    
    // Déclencher un événement pour notifier les autres composants
    window.dispatchEvent(new Event('schoolInfoUpdated'));
    
    const message = this.lang.getCurrentLanguage() === 'fr'
      ? '✅ Informations de l\'établissement sauvegardées avec succès !'
      : '✅ تم حفظ معلومات المؤسسة بنجاح!';
    alert(message);
    
    this.close.emit();
  }

  cancel(): void {
    this.close.emit();
  }

  removeLogo(): void {
    this.logoFile = undefined;
    this.logoPreview = undefined;
    this.schoolInfo.logoUrl = '';
  }

  // Paramètres d'impression
  printSettings: {
    useDifferentLogoSize: boolean;
    printLogoWidthCm: number;
    printLogoHeightCm: number;
    // Ancien: marge uniforme (pour compatibilité)
    pdfMarginCm: number;
    // Nouveaux: marges par côté
    pdfMarginTopCm?: number;
    pdfMarginRightCm?: number;
    pdfMarginBottomCm?: number;
    pdfMarginLeftCm?: number;
    pdfScale: number;
    pdfOrientation: 'landscape' | 'portrait';
    forceOnePage: boolean;
    legacyPdf: boolean;
    printColors: boolean;
    fontSize: 'small' | 'medium' | 'large';
    emptyGray: 'light' | 'medium' | 'dark';
    thickBorders: boolean;
    cellPaddingMm?: number; // Nouveau: espacement interne des cellules (mm)
    // Nouveau: options d'en-tête PDF (jsPDF)
    rightLabelFormat?: 'nameOnly' | 'nameWithSubjectAr';
    invertYearAndName?: boolean;
    headerYOffsetMm?: number; // ajustement fin vertical (mm)
  } = {
    useDifferentLogoSize: false,
    printLogoWidthCm: 11,
    printLogoHeightCm: 2,
    pdfMarginCm: 0.6,
    pdfMarginTopCm: 0.6,
    pdfMarginRightCm: 0.3,
    pdfMarginBottomCm: 0.6,
    pdfMarginLeftCm: 0.6,
    pdfScale: 2,
    pdfOrientation: 'landscape',
    forceOnePage: true,
    legacyPdf: true,
    printColors: true,
    fontSize: 'medium',
    emptyGray: 'light',
    thickBorders: false,
    cellPaddingMm: 0.3,
    rightLabelFormat: 'nameOnly',
    invertYearAndName: false,
    headerYOffsetMm: 0
  };

  loadPrintSettings(): void {
    const raw = localStorage.getItem('printSettings');
    if (raw) {
      try {
        const obj = JSON.parse(raw);
        this.printSettings = { ...this.printSettings, ...obj };
        // Compatibilité: si les marges par côté ne sont pas définies, utiliser la marge uniforme
        const m = typeof obj?.pdfMarginCm === 'number' ? obj.pdfMarginCm : this.printSettings.pdfMarginCm;
        if (this.printSettings.pdfMarginTopCm == null) this.printSettings.pdfMarginTopCm = m;
        if (this.printSettings.pdfMarginRightCm == null) this.printSettings.pdfMarginRightCm = Math.min(m, 0.3);
        if (this.printSettings.pdfMarginBottomCm == null) this.printSettings.pdfMarginBottomCm = m;
        if (this.printSettings.pdfMarginLeftCm == null) this.printSettings.pdfMarginLeftCm = m;
        if (this.printSettings.cellPaddingMm == null) this.printSettings.cellPaddingMm = 0.3;
      } catch {}
    }
  }

  savePrintSettings(): void {
    localStorage.setItem('printSettings', JSON.stringify(this.printSettings));
    const message = this.lang.getCurrentLanguage() === 'fr'
      ? '✅ Paramètres d\'impression enregistrés'
      : '✅ تم حفظ إعدادات الطباعة';
    alert(message);
  }
}
