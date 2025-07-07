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
        return throwError(() => error);
      })
    );
  }


  create(route: Route): Observable<Route> {
    // Remove id from the route object as it's not part of RouteInputDto
    const { id: _, ...routeData } = route;
    return this.http.post<Route>(this.apiUrl, routeData);
  }

  update(id: number, route: Route): Observable<Route> {
    // Remove id from the route object as it's not part of RouteInputDto
    const { id: _, ...routeData } = route;
    return this.http.put<Route>(`${this.apiUrl}/${id}`, routeData);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}