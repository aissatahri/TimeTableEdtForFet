import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Language = 'fr' | 'ar';

export interface Translations {
  title: string;
  selectXmlFiles: string;
  loadButton: string;
  teacherSchedule: string;
  classSchedule: string;
  vacantRooms: string;
  selectTeacher: string;
  selectClass: string;
  displayButton: string;
  printButton: string;
  exportPdfButton: string;
  exportAllPdfButton: string;
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  dayHour: string;
  language: string;
  french: string;
  arabic: string;
}

const TRANSLATIONS: Record<Language, Translations> = {
  fr: {
    title: 'Emplois du temps',
    selectXmlFiles: 'Sélectionner les fichiers XML',
    loadButton: 'Charger',
    teacherSchedule: 'Emplois du temps des professeurs',
    classSchedule: 'Emplois du temps des classes',
    vacantRooms: 'Salles vacantes',
    selectTeacher: '-- Choisir professeur --',
    selectClass: '-- Choisir classe --',
    displayButton: 'Afficher',
    printButton: 'Imprimer',
  exportPdfButton: 'Exporter PDF',
  exportAllPdfButton: 'Exporter tout (PDF)',
    monday: 'Lundi',
    tuesday: 'Mardi',
    wednesday: 'Mercredi',
    thursday: 'Jeudi',
    friday: 'Vendredi',
    saturday: 'Samedi',
    dayHour: 'Jour / Heure',
    language: 'Langue',
    french: 'Français',
    arabic: 'العربية'
  },
  ar: {
    title: 'جداول الأوقات',
    selectXmlFiles: 'اختر ملفات XML',
    loadButton: 'تحميل',
    teacherSchedule: 'جداول الأساتذة',
    classSchedule: 'جداول الأقسام',
    vacantRooms: 'القاعات الشاغرة',
    selectTeacher: '-- اختر الأستاذ --',
    selectClass: '-- اختر القسم --',
    displayButton: 'عرض',
    printButton: 'طباعة',
  exportPdfButton: 'تصدير PDF',
  exportAllPdfButton: 'تصدير الكل (PDF)',
    monday: 'الاثنين',
    tuesday: 'الثلاثاء',
    wednesday: 'الأربعاء',
    thursday: 'الخميس',
    friday: 'الجمعة',
    saturday: 'السبت',
    dayHour: 'اليوم / الساعة',
    language: 'اللغة',
    french: 'Français',
    arabic: 'العربية'
  }
};

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private currentLanguageSubject = new BehaviorSubject<Language>('ar');
  public currentLanguage$ = this.currentLanguageSubject.asObservable();

  constructor() {
    // Charger la langue sauvegardée ou utiliser l'arabe par défaut
    const saved = localStorage.getItem('language') as Language;
    if (saved === 'ar' || saved === 'fr') {
      this.currentLanguageSubject.next(saved);
      this.updateDirection(saved);
    } else {
      // Si aucune langue sauvegardée, utiliser l'arabe par défaut
      this.updateDirection('ar');
    }
  }

  getCurrentLanguage(): Language {
    return this.currentLanguageSubject.value;
  }

  setLanguage(lang: Language): void {
    this.currentLanguageSubject.next(lang);
    localStorage.setItem('language', lang);
    this.updateDirection(lang);
  }

  getTranslations(): Translations {
    return TRANSLATIONS[this.currentLanguageSubject.value];
  }

  t(key: keyof Translations): string {
    return TRANSLATIONS[this.currentLanguageSubject.value][key];
  }

  private updateDirection(lang: Language): void {
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', lang);
  }
}
