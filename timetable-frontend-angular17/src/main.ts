import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { sessionInterceptor } from './app/services/session-interceptor';

if (import.meta && (import.meta as any).env && (import.meta as any).env.PROD) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withInterceptors([sessionInterceptor]))
  ]
}).catch(err => console.error(err));
