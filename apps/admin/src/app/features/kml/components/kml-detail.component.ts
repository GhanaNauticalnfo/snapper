// features/kml/components/kml-detail.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { KmlDatasetService } from '../services/kml-dataset.service';
import { KmlDataset } from '../models/kml-dataset.model';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ChipModule } from 'primeng/chip';

@Component({
  selector: 'app-kml-detail',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    CardModule, 
    ButtonModule, 
    DividerModule, 
    ProgressSpinnerModule,
    MessageModule,
    ToastModule,
    ChipModule
  ],
  providers: [MessageService],
  template: `
    <p-toast></p-toast>
    
    <div class="kml-detail-container">
      @if (loading()) {
        <div class="loading-container">
          <p-progressSpinner></p-progressSpinner>
        </div>
      }
      
      @if (error()) {
        <p-message severity="error" [text]="error()!" styleClass="w-full"></p-message>
      }
      
      @if (dataset() && !loading()) {
        <p-card>
          <ng-template pTemplate="title">
            <div class="flex justify-content-between align-items-center">
              <h2>{{ dataset()?.name }}</h2>
              <div class="button-group">
                <p-button
                  icon="pi pi-pencil"
                  label="Edit"
                  styleClass="p-button-success mr-2"
                  [routerLink]="['/kml', dataset()?.id, 'edit']"
                ></p-button>
                <p-button
                  icon="pi pi-arrow-left"
                  label="Back to List"
                  styleClass="p-button-secondary"
                  [routerLink]="['/kml']"
                ></p-button>
              </div>
            </div>
          </ng-template>
          
          <div class="kml-detail-content">
            <div class="grid">
              <div class="col-12 md:col-6">
                <div class="detail-item">
                  <span class="detail-label">ID:</span>
                  <span class="detail-value">{{ dataset()?.id }}</span>
                </div>
              </div>
              
              <div class="col-12 md:col-6">
                <div class="detail-item">
                  <span class="detail-label">Enabled:</span>
                  <p-chip 
                    [label]="dataset()?.enabled ? 'Yes' : 'No'" 
                    [styleClass]="dataset()?.enabled ? 'bg-green-500 text-white' : 'bg-red-500 text-white'"
                  ></p-chip>
                </div>
              </div>
              
              <div class="col-12 md:col-6">
                <div class="detail-item">
                  <span class="detail-label">Created:</span>
                  <span class="detail-value">{{ dataset()?.created | date:'medium' }}</span>
                </div>
              </div>
              
              <div class="col-12 md:col-6">
                <div class="detail-item">
                  <span class="detail-label">Last Updated:</span>
                  <span class="detail-value">{{ dataset()?.last_updated | date:'medium' }}</span>
                </div>
              </div>
            </div>
            
            <p-divider></p-divider>
            
            <h3>KML Content</h3>
            <div class="kml-code-container">
              <pre class="kml-code">{{ dataset()?.kml }}</pre>
            </div>
          </div>
        </p-card>
      }
    </div>
  `,
  styles: [`
    .kml-detail-container {
      padding: 0.5rem;
    }
    
    .loading-container {
      display: flex;
      justify-content: center;
      padding: 2rem;
    }
    
    .button-group {
      display: flex;
    }
    
    .detail-item {
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
    }
    
    .detail-label {
      font-weight: 600;
      min-width: 150px;
    }
    
    .kml-code-container {
      max-height: 400px;
      overflow: auto;
      background-color: #f8f9fa;
      border-radius: 4px;
      border: 1px solid #e9ecef;
    }
    
    .kml-code {
      padding: 15px;
      white-space: pre-wrap;
      overflow-x: auto;
      font-family: monospace;
      color: #333;
      margin: 0;
    }
    
    h3 {
      margin-top: 1rem;
      margin-bottom: 0.5rem;
    }
    
    :host ::ng-deep .p-card {
      box-shadow: 0 2px 1px -1px rgba(0,0,0,.2), 0 1px 1px 0 rgba(0,0,0,.14), 0 1px 3px 0 rgba(0,0,0,.12);
    }
    
    .flex {
      display: flex;
    }
    
    .justify-content-between {
      justify-content: space-between;
    }
    
    .align-items-center {
      align-items: center;
    }
    
    .w-full {
      width: 100%;
    }
    
    .mr-2 {
      margin-right: 0.5rem;
    }
  `]
})
export class KmlDetailComponent implements OnInit {
  private kmlDatasetService = inject(KmlDatasetService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private messageService = inject(MessageService);
  
  dataset = signal<KmlDataset | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadDataset();
  }

  loadDataset(): void {
    this.loading.set(true);
    this.error.set(null);
    
    const id = this.route.snapshot.paramMap.get('id');
    
    if (!id) {
      this.error.set('Invalid dataset ID');
      this.loading.set(false);
      return;
    }
    
    this.kmlDatasetService.getOne(+id).subscribe({
      next: (data) => {
        this.dataset.set(data);
        this.loading.set(false);
        console.log('KML Dataset loaded:', data);
      },
      error: (err) => {
        this.error.set('Failed to load KML dataset. Please try again later.');
        this.loading.set(false);
        console.error('Error loading KML dataset:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load KML dataset'
        });
      }
    });
  }
}