import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface DonationContext {
  teacherName?: string;
  subjects?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class DonationContextService {
  private contextSubject = new BehaviorSubject<DonationContext>({});
  public context$ = this.contextSubject.asObservable();

  setTeacherContext(teacherName: string, subjects: string[]) {
    this.contextSubject.next({ teacherName, subjects });
  }

  clearContext() {
    this.contextSubject.next({});
  }

  getCurrentContext(): DonationContext {
    return this.contextSubject.value;
  }
}
