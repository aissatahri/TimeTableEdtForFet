import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface RenameItem {
  original: string;
  renamed: string;
}

@Injectable({
  providedIn: 'root'
})
export class RenameService {
  private apiUrl = `${environment.apiUrl}/rename`;

  constructor(private http: HttpClient) {}

  // Liste des professeurs avec leurs renommages
  getTeachersList(): Observable<RenameItem[]> {
    return this.http.get<RenameItem[]>(`${this.apiUrl}/teachers/list`, { withCredentials: true });
  }

  // Liste des salles avec leurs renommages
  getRoomsList(): Observable<RenameItem[]> {
    return this.http.get<RenameItem[]>(`${this.apiUrl}/rooms/list`, { withCredentials: true });
  }

  // Renommer un professeur
  renameTeacher(original: string, renamed: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/teacher`, { original, renamed }, { withCredentials: true });
  }

  // Renommer une salle
  renameRoom(original: string, renamed: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/room`, { original, renamed }, { withCredentials: true });
  }

  // Récupérer tous les mappings
  getMappings(): Observable<any> {
    return this.http.get(`${this.apiUrl}/mappings`, { withCredentials: true });
  }
}
