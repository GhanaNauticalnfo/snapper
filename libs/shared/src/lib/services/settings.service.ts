import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { SETTING_KEYS, SETTING_DEFAULTS, SettingKey } from '@ghanawaters/shared-models';

export interface Setting {
  key: string;
  value: string;
  created: string;
  last_updated: string;
}

/**
 * Central settings service for managing application-wide settings
 * 
 * This service provides a centralized way to access and manage settings
 * across the application with caching and type safety.
 */
@Injectable({
  providedIn: 'root'
})
export class CentralSettingsService {
  private apiUrl: string | null = null;
  private cache = new Map<string, BehaviorSubject<string>>();

  constructor(private http: HttpClient) {}

  /**
   * Configure the service with API URL
   */
  configureApiUrl(apiUrl: string): void {
    this.apiUrl = apiUrl;
  }

  /**
   * Get a setting value by key
   */
  getSetting(key: SettingKey): Observable<string> {
    if (!this.cache.has(key)) {
      this.cache.set(key, new BehaviorSubject<string>(this.getDefaultValue(key)));
      this.loadSetting(key);
    }
    
    return this.cache.get(key)!.asObservable();
  }

  /**
   * Set a setting value
   */
  setSetting(key: SettingKey, value: string): Observable<Setting> {
    if (!this.apiUrl) {
      throw new Error('API URL not configured');
    }

    return this.http.put<Setting>(`${this.apiUrl}/settings/${key}`, { value }).pipe(
      tap((setting) => {
        // Update cache
        if (this.cache.has(key)) {
          this.cache.get(key)!.next(setting.value);
        }
      })
    );
  }

  /**
   * Get route color (convenience method)
   */
  getRouteColor(): Observable<string> {
    return this.getSetting(SETTING_KEYS.ROUTE_COLOR);
  }

  /**
   * Set route color (convenience method)
   */
  setRouteColor(color: string): Observable<Setting> {
    return this.setSetting(SETTING_KEYS.ROUTE_COLOR, color);
  }

  /**
   * Refresh a setting from the API
   */
  refreshSetting(key: SettingKey): void {
    this.loadSetting(key);
  }

  /**
   * Clear all cached settings
   */
  clearCache(): void {
    this.cache.clear();
  }

  private loadSetting(key: SettingKey): void {
    if (!this.apiUrl) {
      return; // Skip if API URL not configured
    }

    this.http.get<Setting>(`${this.apiUrl}/settings/${key}`).pipe(
      map(setting => setting.value),
      catchError(() => of(this.getDefaultValue(key)))
    ).subscribe(value => {
      if (this.cache.has(key)) {
        this.cache.get(key)!.next(value);
      }
    });
  }

  private getDefaultValue(key: SettingKey): string {
    return SETTING_DEFAULTS[key] || '';
  }
}