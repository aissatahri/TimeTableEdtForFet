import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RenameService, RenameItem } from '../services/rename.service';
import { LanguageService } from '../services/language.service';

@Component({
  selector: 'app-rename-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rename-config.component.html',
  styleUrls: ['./rename-config.component.scss']
})
export class RenameConfigComponent implements OnInit {
  @Input() embedded = false;
  @Output() close = new EventEmitter<void>();
  
  teachers: RenameItem[] = [];
  rooms: RenameItem[] = [];
  activeTab: 'teachers' | 'rooms' = 'teachers';
  loading = false;
  message = '';

  constructor(
    public renameService: RenameService,
    public lang: LanguageService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    
    this.renameService.getTeachersList().subscribe({
      next: (data) => {
        this.teachers = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement professeurs:', err);
        this.loading = false;
      }
    });

    this.renameService.getRoomsList().subscribe({
      next: (data) => {
        this.rooms = data;
      },
      error: (err) => {
        console.error('Erreur chargement salles:', err);
      }
    });
  }

  saveTeacher(item: RenameItem) {
    this.renameService.renameTeacher(item.original, item.renamed).subscribe({
      next: () => {
        this.showMessage('✓ Renommage enregistré');
      },
      error: (err) => {
        this.showMessage('⚠ Erreur: ' + err.message);
      }
    });
  }

  saveRoom(item: RenameItem) {
    this.renameService.renameRoom(item.original, item.renamed).subscribe({
      next: () => {
        this.showMessage('✓ Renommage enregistré');
      },
      error: (err) => {
        this.showMessage('⚠ Erreur: ' + err.message);
      }
    });
  }

  clearTeacher(item: RenameItem) {
    item.renamed = '';
    this.saveTeacher(item);
  }

  clearRoom(item: RenameItem) {
    item.renamed = '';
    this.saveRoom(item);
  }

  showMessage(msg: string) {
    this.message = msg;
    setTimeout(() => this.message = '', 3000);
  }
}
