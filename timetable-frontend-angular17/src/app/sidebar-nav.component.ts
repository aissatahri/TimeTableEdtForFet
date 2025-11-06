import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar-nav',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav class="sidebar-nav" [class.open]="open">
      <button class="close-btn" (click)="close.emit()" title="Fermer">×</button>
      <div class="sidebar-header">Menu</div>
      <div class="sidebar-links">
        <a href="#" [class.active]="activeView==='timetable'" (click)="$event.preventDefault(); select('timetable')">Emplois du temps</a>
        <a href="#" [class.active]="activeView==='school-config'" (click)="$event.preventDefault(); select('school-config')">Configuration</a>
        <a href="#" (click)="$event.preventDefault(); aide.emit()">Aide</a>
      </div>
      <div class="sidebar-footer">© 2025 - Emplois du temps</div>
    </nav>
  `,
  styleUrls: ['./sidebar-nav.component.scss']
})
export class SidebarNavComponent {
  @Input() open = false;
  @Input() activeView: 'timetable' | 'school-config' = 'timetable';
  @Output() close = new EventEmitter<void>();
  @Output() navigate = new EventEmitter<'timetable'|'school-config'>();
  @Output() aide = new EventEmitter<void>();

  select(view: 'timetable'|'school-config') {
    this.navigate.emit(view);
    this.close.emit();
  }
}
