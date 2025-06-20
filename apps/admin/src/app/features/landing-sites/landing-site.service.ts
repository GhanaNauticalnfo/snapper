import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { LandingSite, CreateLandingSiteDto, UpdateLandingSiteDto } from './landing-site.model';


@Injectable({
  providedIn: 'root'
})
export class LandingSiteService {
  private apiUrl = '/api/landing-sites';

  constructor(private http: HttpClient) {}

  getLandingSites(search?: string): Observable<LandingSite[]> {
    let httpParams = new HttpParams();
    
    if (search) {
      httpParams = httpParams.set('search', search);
    }

    return this.http.get<LandingSite[]>(this.apiUrl, { params: httpParams });
  }

  getLandingSite(id: number): Observable<LandingSite> {
    return this.http.get<LandingSite>(`${this.apiUrl}/${id}`);
  }

  createLandingSite(data: CreateLandingSiteDto): Observable<LandingSite> {
    return this.http.post<LandingSite>(this.apiUrl, data);
  }

  updateLandingSite(id: number, data: UpdateLandingSiteDto): Observable<LandingSite> {
    return this.http.put<LandingSite>(`${this.apiUrl}/${id}`, data);
  }

  deleteLandingSite(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}