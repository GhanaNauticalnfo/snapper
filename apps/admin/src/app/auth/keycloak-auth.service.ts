// apps/admin/src/app/auth/keycloak-auth.service.ts
import { Injectable, signal, computed } from '@angular/core';
import { KeycloakService } from 'keycloak-angular';
import { KeycloakProfile } from 'keycloak-js';

@Injectable({
  providedIn: 'root'
})
export class KeycloakAuthService {
  private _userProfile = signal<KeycloakProfile | null>(null);
  private _roles = signal<string[]>([]);
  private _isAuthenticated = signal<boolean>(false);

  // Public read-only signals
  public readonly userProfile = this._userProfile.asReadonly();
  public readonly roles = this._roles.asReadonly();
  public readonly isAuthenticated = this._isAuthenticated.asReadonly();
  
  // Computed signals
  public readonly hasAdminRole = computed(() => 
    this._roles().includes('admin')
  );

  constructor(private keycloakService: KeycloakService) {
    this.init();
  }

  private async init() {
    const isLoggedIn = await this.keycloakService.isLoggedIn();
    this._isAuthenticated.set(isLoggedIn);
    
    if (isLoggedIn) {
      this._roles.set(this.keycloakService.getUserRoles());
      
      try {
        const profile = await this.keycloakService.loadUserProfile();
        this._userProfile.set(profile);
      } catch (error) {
        console.error('Failed to load user profile', error);
      }
    }
  }

  public async login(): Promise<void> {
    await this.keycloakService.login();
    await this.init(); // Refresh state after login
  }

  public async logout(): Promise<void> {
    await this.keycloakService.logout();
    this._isAuthenticated.set(false);
    this._userProfile.set(null);
    this._roles.set([]);
  }

  public refreshState(): Promise<void> {
    return this.init();
  }
}