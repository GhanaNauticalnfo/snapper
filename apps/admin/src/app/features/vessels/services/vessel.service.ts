import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { VesselResponseDto, CreateVesselDto, UpdateVesselDto } from '../models/vessel.dto';

@Injectable({
  providedIn: 'root'
})
export class VesselService {
  private apiUrl = `${environment.apiUrl}/vessels`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<VesselResponseDto[]> {
    return this.http.get<VesselResponseDto[]>(`${this.apiUrl}?includeLatestPosition=true`);
  }

  getOne(id: number): Observable<VesselResponseDto> {
    return this.http.get<VesselResponseDto>(`${this.apiUrl}/${id}`);
  }

  create(data: CreateVesselDto): Observable<VesselResponseDto> {
    // Set defaults for required fields if not provided
    const createData = {
      length_meters: 15.0,
      owner_name: 'Unknown',
      owner_contact: '',
      home_port: 'Unknown',
      ...data
    };
    
    return this.http.post<VesselResponseDto>(this.apiUrl, createData);
  }

  update(id: number, data: UpdateVesselDto): Observable<VesselResponseDto> {
    return this.http.put<VesselResponseDto>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}