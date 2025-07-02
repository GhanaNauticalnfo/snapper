import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface SyncSummary {
  totalEntries: number;
  lastSyncVersion: string;
  entityTypes: number;
}

export interface EntityStats {
  entityType: string;
  create: number;
  update: number;
  delete: number;
  totalSize: number;
  total: number;
}

export interface RecentEntry {
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'delete';
  dataSize: number;
  hasData: boolean;
  timestamp: string | null;
}

export interface SyncManageResponse {
  version: string;
  majorVersion: number;
  summary: SyncSummary;
  entityStats: EntityStats[];
  recentEntries: RecentEntry[];
}

export interface SyncResetResponse {
  success: boolean;
  majorVersion: number;
}

@Injectable()
export class SyncService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/data`;

  getSyncManageData(since?: string, limit?: number): Observable<SyncManageResponse> {
    const params: any = {};
    if (since) params.since = since;
    if (limit) params.limit = limit.toString();
    
    return this.http.get<SyncManageResponse>(`${this.apiUrl}/sync/manage`, { params });
  }

  resetSync(): Observable<SyncResetResponse> {
    return this.http.post<SyncResetResponse>(`${this.apiUrl}/sync/reset`, {});
  }
}