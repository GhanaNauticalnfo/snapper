import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Route } from '../models/route.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RouteService {
  private apiUrl = `${environment.apiUrl}/routes`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Route[]> {
    return this.http.get<Route[]>(this.apiUrl).pipe(
      catchError(error => {
        console.error('Error fetching routes:', error);
        console.error('Error details:', error.error);
        return throwError(() => error);
      })
    );
  }

  getOne(id: number): Observable<Route> {
    return this.http.get<Route>(`${this.apiUrl}/${id}`);
  }

  getEnabled(): Observable<Route[]> {
    return this.http.get<Route[]>(`${this.apiUrl}/enabled`);
  }

  create(route: Route): Observable<Route> {
    return this.http.post<Route>(this.apiUrl, route);
  }

  update(id: number, route: Route): Observable<Route> {
    return this.http.put<Route>(`${this.apiUrl}/${id}`, route);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}