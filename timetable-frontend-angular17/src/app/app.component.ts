import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimetableComponent } from './timetable/timetable.component';
import { SchoolConfigComponent } from './school-config/school-config.component';
import { SidebarNavComponent } from './sidebar-nav.component';
import { LanguageService, Language } from './services/language.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, TimetableComponent, SchoolConfigComponent, SidebarNavComponent],
  template: `
  <app-sidebar-nav [open]="sidebarOpen" [activeView]="showView" (close)="sidebarOpen=false" (navigate)="navigate($event)" (aide)="openAide()"></app-sidebar-nav>
  <header class="app-header no-print" style="display: flex; align-items: center; justify-content: space-between;">
    <div style="display: flex; align-items: center; gap: 16px;">
      <button (click)="sidebarOpen=true" class="sidebar-toggle" style="font-size: 1.7em; background: none; border: none; color: #4676fa; cursor: pointer; margin-right: 4px;">☰</button>
      <div class="brand" (click)="scrollTo('top')">Timetable</div>
      <a href="#" (click)="$event.preventDefault(); openConfigModal()" class="config-btn-left" style="font-size: 18px; padding: 6px 16px; background: #4676fa; color: #fff; border-radius: 6px; text-decoration: none; font-weight: 500;">
        {{ currentLanguage === 'fr' ? '⚙️ Configuration' : '⚙️ الإعدادات' }}
      </a>
    </div>
    <nav class="menu">
      <a href="#" (click)="$event.preventDefault(); scrollTo('top')">{{ t('title') }}</a>
      <div style="font-size: 14px; color: #ffffff; margin-left: 20px; white-space: nowrap;">
        {{ currentDateTime }}
      </div>
    </nav>
    <div class="lang" style="display: flex; align-items: center; gap: 8px; position: relative;">
      <button (click)="showLangMenu = !showLangMenu" style="font-size: 1.5em; background: none; border: none; cursor: pointer; padding: 4px 8px;" title="Changer la langue">
        🌐
      </button>
      <div *ngIf="showLangMenu" style="position: absolute; top: 100%; right: 0; background: white; border: 1px solid #ccc; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); margin-top: 8px; min-width: 160px; z-index: 1000;">
        <button (click)="setLanguage('fr'); showLangMenu = false" [style.background]="currentLanguage === 'fr' ? '#e8f0fe' : 'white'" style="display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 16px; border: none; cursor: pointer; font-size: 14px; color: #333; border-radius: 6px 6px 0 0;">
          <svg width="24" height="16" viewBox="0 0 900 600" style="border: 1px solid #ddd;">
            <rect width="300" height="600" fill="#002395"/>
            <rect x="300" width="300" height="600" fill="#FFFFFF"/>
            <rect x="600" width="300" height="600" fill="#ED2939"/>
          </svg>
          <span>Français</span>
        </button>
        <button (click)="setLanguage('ar'); showLangMenu = false" [style.background]="currentLanguage === 'ar' ? '#e8f0fe' : 'white'" style="display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 16px; border: none; cursor: pointer; font-size: 14px; color: #333; border-radius: 0 0 6px 6px;">
          <svg width="24" height="16" viewBox="0 0 900 600" style="border: 1px solid #ddd;">
            <rect width="900" height="600" fill="#C1272D"/>
            <polygon points="450,150 350,450 550,250 350,250 550,450" fill="none" stroke="#006233" stroke-width="35"/>
            <polygon points="450,150 350,450 550,250 350,250 550,450" fill="#006233"/>
          </svg>
          <span>العربية</span>
        </button>
      </div>
      <button (click)="toggleContrast()" title="Contraste élevé" style="font-size:1.1em;">🌓</button>
      <button (click)="toggleFontSize()" title="Taille police" style="font-size:1.1em;">A↕</button>
      <button (click)="showDonationModal = true" title="{{ currentLanguage === 'fr' ? 'Soutenir le projet' : 'دعم المشروع' }}" style="font-size:1.3em; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; color: white;">
        💝
      </button>
    </div>
  </header>
  
  <!-- Modal de Donation -->
  <div *ngIf="showDonationModal" (click)="showDonationModal = false" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 10000;">
    <div (click)="$event.stopPropagation()" style="background: white; padding: 40px; border-radius: 16px; max-width: 500px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); position: relative;">
      <button (click)="showDonationModal = false" style="position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 28px; cursor: pointer; color: #999; line-height: 1;">×</button>
      
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="font-size: 48px; margin-bottom: 15px;">💝</div>
        <h2 style="margin: 0 0 10px 0; color: #333; font-size: 24px;">
          {{ currentLanguage === 'fr' ? 'Soutenez ce projet !' : 'ادعم هذا المشروع!' }}
        </h2>
        <p style="color: #666; margin: 0; font-size: 15px;" [innerHTML]="getDonationMessage()"></p>
      </div>
      
      <div style="margin-bottom: 25px;">
        <h3 style="font-size: 16px; color: #555; margin-bottom: 15px; text-align: center;">
          {{ currentLanguage === 'fr' ? 'Choisissez votre montant :' : 'اختر المبلغ :' }}
        </h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
          <button (click)="donate(50)" style="padding: 15px; border: 2px solid #667eea; border-radius: 8px; background: white; cursor: pointer; font-size: 16px; font-weight: 600; color: #667eea; transition: all 0.3s;">
            50 DH
          </button>
          <button (click)="donate(100)" style="padding: 15px; border: 2px solid #667eea; border-radius: 8px; background: white; cursor: pointer; font-size: 16px; font-weight: 600; color: #667eea; transition: all 0.3s;">
            100 DH
          </button>
          <button (click)="donate(200)" style="padding: 15px; border: 2px solid #667eea; border-radius: 8px; background: white; cursor: pointer; font-size: 16px; font-weight: 600; color: #667eea; transition: all 0.3s;">
            200 DH
          </button>
        </div>
      </div>
      
      <div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 0 0 15px 0; font-size: 14px; color: #666;">
          {{ currentLanguage === 'fr' ? 'Envoyez votre don via :' : 'أرسل تبرعك عبر :' }}
        </p>
        <div style="display: flex; flex-direction: column; gap: 10px; align-items: center;">
          <a href="https://www.paypal.com/paypalme/aissatahri" target="_blank" style="padding: 12px 30px; background: #0070ba; color: white; border-radius: 6px; text-decoration: none; font-weight: 600; display: flex; align-items: center; gap: 10px; transition: all 0.3s;">
            <span style="font-size: 20px;">💳</span>
            <span>{{ currentLanguage === 'fr' ? 'Faire un don via PayPal' : 'تبرع عبر PayPal' }}</span>
          </a>
          <div style="padding: 12px 20px; background: white; border-radius: 6px; border: 1px solid #ddd; font-size: 13px; font-weight: 600; color: #333; max-width: 100%; overflow-x: auto; direction: ltr;">
            💳 <span style="color: #667eea;">RIB:</span> <span style="color: #667eea; font-family: monospace;">157 570 2111180350290005 25</span>
          </div>
        </div>
      </div>
      
      <p style="text-align: center; font-size: 13px; color: #999; margin: 0;">
        {{ currentLanguage === 'fr' ? 'Merci pour votre soutien ! 🙏' : 'شكرا لدعمك! 🙏' }}
      </p>
    </div>
  </div>
  
  <main class="app-main" id="top">
    <app-timetable *ngIf="showView === 'timetable'"></app-timetable>
    <app-school-config *ngIf="showView === 'school-config'" (close)="showView = 'timetable'"></app-school-config>
  </main>
  <footer class="app-footer no-print">
    <span>&copy; 2025 - Emplois du temps - Développé par <strong>TAHRI Aissa</strong></span>
  </footer>
  `
})
export class AppComponent {
  currentDateTime: string = '';
  showLangMenu = false;
  showDonationModal = false;
  
  toggleContrast() {
    document.body.classList.toggle('high-contrast');
  }
  toggleFontSize() {
    if(document.body.classList.contains('large-font')) {
      document.body.classList.remove('large-font');
      document.body.classList.add('small-font');
    } else if(document.body.classList.contains('small-font')) {
      document.body.classList.remove('small-font');
    } else {
      document.body.classList.add('large-font');
    }
  }
  currentLanguage: Language = 'fr';
  showView: 'timetable' | 'school-config' = 'timetable';
  sidebarOpen = false;

  constructor(private lang: LanguageService){
    this.currentLanguage = lang.getCurrentLanguage();
    this.lang.currentLanguage$.subscribe(l => this.currentLanguage = l);
    this.updateDateTime();
    // Mettre à jour l'heure toutes les secondes
    setInterval(() => this.updateDateTime(), 1000);
  }
  
  updateDateTime() {
    const now = new Date();
    if (this.currentLanguage === 'ar') {
      // Format arabe
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      };
      this.currentDateTime = now.toLocaleDateString('ar-MA', options);
    } else {
      // Format français
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      };
      this.currentDateTime = now.toLocaleDateString('fr-FR', options);
    }
  }
  setLanguage(l: Language){ 
    this.lang.setLanguage(l);
    this.updateDateTime(); // Mettre à jour le format de la date quand on change de langue
  }
  t(key: any){ return this.lang.t(key as any); }
  scrollTo(id: string){
    this.showView = 'timetable';
    setTimeout(() => {
      const el = document.getElementById(id);
      if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
    }, 100);
  }
  openConfigModal() {
    this.showView = 'school-config';
  }
  navigate(view: 'timetable'|'school-config') {
    this.showView = view;
    this.sidebarOpen = false;
  }
  openAide() {
    alert('Aide et tutoriel interactif à venir !');
  }
  
  getDonationMessage(): string {
    if (this.currentLanguage === 'fr') {
      return 'Cette application est <strong>100% gratuite</strong>.<br>Votre don aide à la maintenir et l\'améliorer.';
    } else {
      return 'هذا التطبيق <strong>مجاني 100%</strong>.<br>تبرعك يساعد في صيانته وتحسينه.';
    }
  }
  
  donate(amount: number) {
    const message = this.currentLanguage === 'fr' 
      ? `Merci pour votre don de ${amount} DH !\n\nVeuillez envoyer votre don via :\n� PayPal: paypal.me/aissatahri\n💳 RIB: 157 570 2111180350290005 25\n\nMerci pour votre soutien ! 🙏`
      : `شكرا على تبرعك ب ${amount} درهم!\n\nيرجى إرسال تبرعك عبر:\n� PayPal: paypal.me/aissatahri\n💳 RIB: 157 570 2111180350290005 25\n\nشكرا لدعمك! 🙏`;
    
    alert(message);
    this.showDonationModal = false;
  }
}
