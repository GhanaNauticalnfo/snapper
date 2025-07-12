import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import Keycloak from 'keycloak-js';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, ProgressSpinnerModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  private keycloak = inject(Keycloak);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  
  isLoading = false;
  returnUrl: string | null = null;

  async ngOnInit() {
    // Check if already authenticated
    if (this.keycloak.authenticated) {
      this.router.navigate(['/']);
      return;
    }
    
    // Get return url from route parameters or default to '/'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }

  async login() {
    this.isLoading = true;
    
    // Store target URL in session storage for retrieval after redirect
    if (this.returnUrl && this.returnUrl !== '/') {
      sessionStorage.setItem('auth.targetUrl', this.returnUrl);
    }
    
    await this.keycloak.login({
      redirectUri: window.location.origin + '/auth/callback'
    });
  }
}
