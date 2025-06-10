import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// PrimeNG imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { VesselTypeService, VesselType } from '../services/vessel-type.service';
import { BoatIconComponent } from '@snapper/shared';


@Component({
  selector: 'app-vessel-type-settings',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    MessageModule,
    ToastModule,
    BoatIconComponent
  ],
  providers: [MessageService],
  template: `
    <p-toast></p-toast>
    
    <div class="vessel-type-settings">
      <div class="header">
        <p-button
          icon="pi pi-plus"
          label="Add Vessel Type"
          (onClick)="createNewVesselType()"
          styleClass="p-button-success"
        ></p-button>
      </div>

      @if (error()) {
        <p-message severity="error" [text]="error() || ''" styleClass="w-full mb-3"></p-message>
      }

      <p-table [value]="vesselTypes()" [loading]="loading()" responsiveLayout="scroll">
        <ng-template pTemplate="header">
          <tr>
            <th>Name</th>
            <th>#Vessels</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-vesselType>
          <tr (click)="viewDetails(vesselType)" style="cursor: pointer;">
            <td>
              <div class="vessel-type-name">
                <app-boat-icon 
                  [color]="vesselType.color"
                  [size]="20"
                  [title]="vesselType.color">
                </app-boat-icon>
                <span>{{ vesselType.name }}</span>
              </div>
            </td>
            <td>{{ vesselType.vessel_count || 0 }}</td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="2" class="text-center">No vessel types found</td>
          </tr>
        </ng-template>
      </p-table>
    </div>
  `,
  styles: [`
    .vessel-type-settings {
      width: 100%;
    }

    .header {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .text-center {
      text-align: center;
    }

    .vessel-type-name {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    /* Utility classes */
    .w-full { width: 100%; }
    .mb-3 { margin-bottom: 1rem; }
  `]
})
export class VesselTypeSettingsComponent implements OnInit {
  private vesselTypeService = inject(VesselTypeService);
  private messageService = inject(MessageService);
  private router = inject(Router);

  vesselTypes = signal<VesselType[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadVesselTypes();
  }

  loadVesselTypes(): void {
    this.loading.set(true);
    this.error.set(null);

    this.vesselTypeService.getAll().subscribe({
      next: (data) => {
        this.vesselTypes.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load vessel types. Please try again later.');
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Load Error',
          detail: 'Failed to load vessel types',
          life: 3000
        });
      }
    });
  }

  viewDetails(vesselType: VesselType): void {
    this.router.navigate(['/settings/vessel-types', vesselType.id]);
  }

  createNewVesselType(): void {
    // Navigate to a new vessel type creation page (we'll use ID 'new')
    this.router.navigate(['/settings/vessel-types', 'new']);
  }
}