import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { TileInfo } from './models/tile-info.model';
import { UploadResponse } from './models/upload-response.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class VoltaDepthService {
  private apiUrlBase = `${environment.apiUrl}/volta-depth`;

  constructor(private http: HttpClient) {}

  listTiles(): Observable<TileInfo[]> {
    return this.http.get<TileInfo[]>(`${this.apiUrlBase}/tiles`)
      .pipe(catchError(this.handleError));
  }

  getTileInfo(tileId: string): Observable<TileInfo> {
    return this.http.get<TileInfo>(`${this.apiUrlBase}/tiles/${tileId}`)
      .pipe(catchError(this.handleError));
  }

  uploadTile(file: File): Observable<UploadResponse> {
    const formData = new FormData();
    
    // Add the file to the form data with field name 'file' to match the FileInterceptor
    formData.append('file', file, file.name);
    
    // Importantly, DO NOT set Content-Type header when sending FormData
    // The browser will automatically set it to multipart/form-data with the correct boundary
    return this.http.post<UploadResponse>(`${this.apiUrlBase}/upload`, formData)
      .pipe(catchError(this.handleError));
  }

  commitUpload(uploadId: string): Observable<{ message: string; tileId: string }> {
    const payload = { uploadId };
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<{ message: string; tileId: string }>(`${this.apiUrlBase}/commit`, payload, { headers })
      .pipe(catchError(this.handleError));
  }

  deleteTile(tileId: string): Observable<{ message: string; tileId: string }> {
    return this.http.delete<{ message: string; tileId: string }>(`${this.apiUrlBase}/tiles/${tileId}`)
      .pipe(catchError(this.handleError));
  }
  
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred!';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Client Error: ${error.error.message}`;
    } else if (error.error?.message) {
       errorMessage = `${error.status}: ${error.error.message}`; // Use backend message if available
    } else {
      errorMessage = `Server Error Code: ${error.status}, Message: ${error.message}`;
    }
    console.error("API Error:", errorMessage, error);
    return throwError(() => new Error(errorMessage)); // Return observable error
  }
}