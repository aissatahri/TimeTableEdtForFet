import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../services/language.service';

@Component({
  selector: 'app-donation',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="donation-container" [dir]="lang.getCurrentLanguage() === 'ar' ? 'rtl' : 'ltr'">
      <h3>{{ lang.getCurrentLanguage() === 'fr' ? 'Soutenez ce projet' : 'ادعم هذا المشروع' }}</h3>
      
      <p class="donation-text">
        {{ lang.getCurrentLanguage() === 'fr' 
          ? 'Si cette application vous aide, vous pouvez soutenir son développement :' 
          : 'إذا كان هذا التطبيق يساعدك، يمكنك دعم تطويره:' }}
      </p>
      
      <!-- Quick donation amounts -->
      <div class="donation-amounts">
        <button class="donation-btn" (click)="selectAmount(10)">10 DH</button>
        <button class="donation-btn" (click)="selectAmount(20)">20 DH</button>
        <button class="donation-btn" (click)="selectAmount(50)">50 DH</button>
      </div>
      
      <!-- Payment methods -->
      <div class="payment-methods">
        <!-- RIB -->
        <div class="payment-method">
          <h4>💳 {{ lang.getCurrentLanguage() === 'fr' ? 'Virement bancaire (RIB)' : 'تحويل بنكي (RIB)' }}</h4>
          <div class="rib-details">
            <p><strong>RIB:</strong> <code>{{ rib }}</code></p>
            <button class="copy-btn" (click)="copyRIB()">
              {{ lang.getCurrentLanguage() === 'fr' ? 'Copier' : 'نسخ' }}
            </button>
          </div>
        </div>
        
        <!-- PayPal -->
        <div class="payment-method">
          <h4>💵 PayPal</h4>
          <a [href]="paypalLink" target="_blank" class="paypal-btn">
            {{ lang.getCurrentLanguage() === 'fr' ? 'Faire un don via PayPal' : 'تبرع عبر PayPal' }}
          </a>
        </div>
      </div>
      
      <p class="thank-you">
        {{ lang.getCurrentLanguage() === 'fr' ? 'Merci pour votre soutien ! 🙏' : 'شكراً لدعمكم! 🙏' }}
      </p>
    </div>
  `,
  styles: [`
    .donation-container {
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 12px;
      margin: 20px 0;
    }
    
    h3 {
      margin: 0 0 15px 0;
      font-size: 1.5rem;
    }
    
    .donation-text {
      margin-bottom: 20px;
      opacity: 0.95;
    }
    
    .donation-amounts {
      display: flex;
      gap: 10px;
      margin-bottom: 25px;
      flex-wrap: wrap;
    }
    
    .donation-btn {
      flex: 1;
      min-width: 80px;
      padding: 12px 20px;
      background: rgba(255, 255, 255, 0.2);
      border: 2px solid rgba(255, 255, 255, 0.3);
      color: white;
      font-size: 1.1rem;
      font-weight: bold;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    
    .donation-btn:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    
    .payment-methods {
      display: flex;
      flex-direction: column;
      gap: 15px;
      margin-bottom: 20px;
    }
    
    .payment-method {
      background: rgba(255, 255, 255, 0.1);
      padding: 15px;
      border-radius: 8px;
    }
    
    .payment-method h4 {
      margin: 0 0 10px 0;
      font-size: 1.1rem;
    }
    
    .rib-details {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    
    .rib-details code {
      background: rgba(0, 0, 0, 0.3);
      padding: 8px 12px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.95rem;
      letter-spacing: 1px;
    }
    
    .copy-btn, .paypal-btn {
      padding: 8px 16px;
      background: rgba(255, 255, 255, 0.9);
      color: #667eea;
      border: none;
      border-radius: 6px;
      font-weight: bold;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
      transition: all 0.3s ease;
    }
    
    .copy-btn:hover, .paypal-btn:hover {
      background: white;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    
    .thank-you {
      text-align: center;
      font-size: 1.1rem;
      margin: 20px 0 0 0;
      font-weight: 500;
    }
    
    @media (max-width: 768px) {
      .donation-amounts {
        flex-direction: column;
      }
      
      .donation-btn {
        width: 100%;
      }
    }
  `]
})
export class DonationComponent {
  // Replace with your actual RIB and PayPal link
  rib = '1234 5678 9012 3456 7890 1234'; // TODO: Replace with your real RIB
  paypalLink = 'https://www.paypal.com/donate/?hosted_button_id=YOUR_BUTTON_ID'; // TODO: Replace with your PayPal donation link
  
  selectedAmount = 10;
  
  constructor(public lang: LanguageService) {}
  
  selectAmount(amount: number) {
    this.selectedAmount = amount;
    // You can show additional instructions or redirect based on the amount
    console.log(`Selected donation amount: ${amount} DH`);
  }
  
  copyRIB() {
    navigator.clipboard.writeText(this.rib).then(() => {
      alert(this.lang.getCurrentLanguage() === 'fr' 
        ? 'RIB copié dans le presse-papiers !' 
        : 'تم نسخ RIB في الحافظة!');
    });
  }
}
