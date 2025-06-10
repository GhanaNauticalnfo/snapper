import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VesselDataset } from '../models/vessel-dataset.model';
import { VesselDatasetService } from '../services/vessel-dataset.service';
import { ConfirmationService, MessageService } from 'primeng/api';

// PrimeNG imports
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

@Component({
  selector: 'app-vessel-tab-danger-zone',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    ConfirmDialogModule
  ],
  providers: [ConfirmationService],
  template: `
    <p-confirmDialog
      header="Confirm Deletion" 
      icon="pi pi-exclamation-triangle" 
      acceptButtonStyleClass="p-button-danger" 
      acceptIcon="pi pi-trash"
      rejectButtonStyleClass="p-button-secondary"
      [style]="{width: '50vw', 'max-width': '600px'}">
    </p-confirmDialog>
    
    <div class="view-dialog-content">
      <div class="danger-zone-section">
        <div class="danger-zone">
          <p class="danger-zone-description">
            Permanently delete this vessel and all associated data. This action cannot be undone.
          </p>
          <div class="danger-details">
            <p><strong>This will permanently delete:</strong></p>
            <ul>
              <li>The vessel record and all its information</li>
              <li>All associated devices and their authentication tokens</li>
              <li>All tracking data and position history</li>
            </ul>
            <p class="warning-text">⚠️ This action cannot be undone and all data will be lost forever.</p>
          </div>
          <p-button 
            label="Delete Vessel Permanently" 
            icon="pi pi-trash" 
            styleClass="p-button-danger action-button" 
            (onClick)="confirmDelete()"
            [loading]="deleting()"
            [disabled]="!vessel">
          </p-button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Danger Zone Styles */
    .danger-zone-section {
      margin-bottom: 1.5rem;
    }

    .section-title {
      margin: 0 0 1rem 0;
      color: var(--text-color);
      font-size: 1.1rem;
      font-weight: 600;
    }

    .danger-zone-title {
      color: var(--red-700);
    }

    .danger-zone {
      padding: 1rem;
      border: 1px solid var(--red-400);
      border-radius: 8px;
      background: var(--red-50);
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .danger-zone-description {
      margin: 0;
      color: var(--red-600);
      font-size: 0.875rem;
      line-height: 1.4;
    }

    .action-button {
      height: 40px;
      padding: 0 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    
    .danger-details {
      margin: 1rem 0;
      padding: 1rem;
      background: var(--red-25);
      border: 1px solid var(--red-200);
      border-radius: 4px;
    }
    
    .danger-details ul {
      margin: 0.5rem 0;
      padding-left: 1.5rem;
    }
    
    .danger-details li {
      margin: 0.25rem 0;
      color: var(--red-700);
    }
    
    .warning-text {
      color: var(--red-700);
      font-weight: 600;
      margin: 0.75rem 0 0 0;
    }

    /* Dark mode adjustments for danger zone */
    @media (prefers-color-scheme: dark) {
      .danger-zone {
        background: rgba(var(--red-500-rgb), 0.1);
        border-color: var(--red-400);
      }
      
      .danger-zone-title {
        color: var(--red-400);
      }
      
      .danger-zone-description {
        color: var(--red-300);
      }
    }
  `]
})
export class VesselTabDangerZoneComponent {
  @Input() vessel: VesselDataset | null = null;
  @Output() vesselDeleted = new EventEmitter<number>();

  deleting = signal(false);

  constructor(
    private vesselDatasetService: VesselDatasetService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  confirmDelete() {
    if (!this.vessel || this.vessel.id === undefined) return;

    const warningMessage = `Are you sure you want to delete the vessel "${this.vessel.name}" (ID: ${this.vessel.id})?<br><br>This will permanently delete:<br><br><ul style="margin: 0; padding-left: 20px;"><li>The vessel record and all its information</li><li>All associated devices and their authentication tokens</li><li>All tracking data and position history</li></ul><br><strong>⚠️ This action cannot be undone and all data will be lost forever.</strong>`;

    this.confirmationService.confirm({
      message: warningMessage,
      header: 'Delete Vessel - Permanent Action',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      acceptLabel: 'Delete Permanently',
      rejectLabel: 'Cancel',
      accept: () => this.deleteVessel(this.vessel!.id),
    });
  }

  private deleteVessel(id: number) {
    this.deleting.set(true);
    this.vesselDatasetService.delete(id).subscribe({
      next: () => {
        console.log('Vessel deleted:', id);
        this.messageService.add({
          severity: 'success',
          summary: 'Vessel Deleted',
          detail: 'Vessel and all associated data have been permanently deleted',
          life: 4000
        });
        this.vesselDeleted.emit(id);
      },
      error: (err) => {
        console.error('Error deleting vessel:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Delete Error',
          detail: err.error?.message || 'Failed to delete vessel. Please try again.',
          life: 5000
        });
      },
      complete: () => {
         this.deleting.set(false);
      }
    });
  }
}