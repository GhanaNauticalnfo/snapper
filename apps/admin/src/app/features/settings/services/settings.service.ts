import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SETTING_KEYS, SETTING_DEFAULTS } from '@ghanawaters/shared-models';

export interface Setting {
  key: string;
  value: string;
  created: string;
  last_updated: string;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private apiUrl = `${environment.apiUrl}/settings`;

  constructor(private http: HttpClient) {}

  getAllSettings(): Observable<Setting[]> {
    return this.http.get<Setting[]>(this.apiUrl);
  }

  getSetting(key: string): Observable<Setting> {
    return this.http.get<Setting>(`${this.apiUrl}/${key}`);
  }

  updateSetting(key: string, value: string): Observable<Setting> {
    return this.http.put<Setting>(`${this.apiUrl}/${key}`, { value });
  }

  getRouteColor(): Observable<string> {
    return new Observable(observer => {
      this.getSetting(SETTING_KEYS.ROUTE_COLOR).subscribe({
        next: (setting) => observer.next(setting.value),
        error: () => observer.next(SETTING_DEFAULTS[SETTING_KEYS.ROUTE_COLOR]), // Default fallback
        complete: () => observer.complete()
      });
    });
  }

  setRouteColor(color: string): Observable<Setting> {
    return this.updateSetting(SETTING_KEYS.ROUTE_COLOR, color);
  }
}