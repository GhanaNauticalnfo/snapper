// features/kml/services/kml-dataset.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { KmlDataset } from '../models/kml-dataset.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class KmlDatasetService {
  private apiUrl = `${environment.apiUrl}/kml-datasets`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<KmlDataset[]> {
    return this.http.get<KmlDataset[]>(this.apiUrl);
  }

  getOne(id: number): Observable<KmlDataset> {
    return this.http.get<KmlDataset>(`${this.apiUrl}/${id}`);
  }

  getEnabled(): Observable<{ id: number; last_updated: Date }[]> {
    return this.http.get<{ id: number; last_updated: Date }[]>(`${this.apiUrl}/enabled`);
  }

  create(data: { kml: string, name: string, enabled?: boolean }): Observable<KmlDataset> {
    return this.http.post<KmlDataset>(this.apiUrl, data);
  }

  update(id: number, data: { kml?: string, name?: string, enabled?: boolean }): Observable<KmlDataset> {
    return this.http.put<KmlDataset>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}