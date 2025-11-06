import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TimetableService {
  base = environment.apiUrl;
  constructor(private http: HttpClient) {}
  uploadFiles(teachers: File|null, subgroups: File|null, activities: File|null): Observable<any> {
    const fd = new FormData();
    if(teachers) fd.append('teachersXml', teachers);
    if(subgroups) fd.append('subgroupsXml', subgroups);
    if(activities) fd.append('activitiesXml', activities);
    return this.http.post(`${this.base}/upload`, fd, { withCredentials: true });
  }
  getTeachers(): Observable<Record<string, string[]>> { return this.http.get<Record<string, string[]>>(`${this.base}/teachers`, { withCredentials: true }); }
  getTimetableForTeacher(name: string): Observable<any[]> { return this.http.get<any[]>(`${this.base}/timetable/teacher/${encodeURIComponent(name)}`, { withCredentials: true }); }
  getSubgroups(): Observable<string[]> { return this.http.get<string[]>(`${this.base}/subgroups`, { withCredentials: true }); }
  getTimetableForSubgroup(name: string, labelMode?: string, labelSubjects?: string): Observable<any[]> {
    let url = `${this.base}/timetable/subgroup/${encodeURIComponent(name)}`;
    const params: string[] = [];
    if (labelMode) params.push(`labelMode=${encodeURIComponent(labelMode)}`);
    if (labelSubjects) params.push(`labelSubjects=${encodeURIComponent(labelSubjects)}`);
    if (params.length) url += `?${params.join('&')}`;
    return this.http.get<any[]>(url, { withCredentials: true });
  }

  getSubgroupsForClass(className: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/classes/${encodeURIComponent(className)}/subgroups`, { withCredentials: true });
  }

  // Vacant rooms per timeslot
  getVacantRooms(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/rooms/vacant`, { withCredentials: true });
  }

  // Get list of all rooms
  getRooms(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/rooms/list`, { withCredentials: true });
  }

  // Get timetable for a specific room
  getTimetableForRoom(roomName: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/timetable/room/${encodeURIComponent(roomName)}`, { withCredentials: true });
  }

  // PDF Generation endpoints (backend-generated)

}
