import { Component, signal, inject, effect, computed, ChangeDetectionStrategy, DestroyRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// PrimeNG Imports
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';
import { MessageModule } from 'primeng/message';

// Child Components (Standalone)
import { TileUploadComponent } from './components/tile-upload/tile-upload.component';
import { TileListComponent } from './components/tile-list/tile-list.component';
import { UploadConfirmationComponent } from './components/upload-confirmation/upload-confirmation.component';
// Models and Service
import { UploadResponse } from './models/upload-response.model';
import { VoltaDepthService } from './volta-depth.service';

// Export interface for type safety when injecting parent
export interface StagedUpload {
  response: UploadResponse;
  file: File;
}

@Component({
  selector: 'app-volta-depth',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    // Child Components
    TileUploadComponent,
    TileListComponent,
    UploadConfirmationComponent,
    // PrimeNG Modules/Components
    ToastModule,
    DialogModule,
    ButtonModule,
    ProgressSpinnerModule,
    MessageModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast key="mainToast" position="top-center"></p-toast>

    <div class="volta-depth-container">
      <div class="page-header">
        <h2 class="text-2xl">Volta Depth</h2>
      </div>
      
      <!-- List component first -->
      @if (!showConfirmation()) {
        <app-tile-list></app-tile-list>
        <hr>
        <app-tile-upload (uploadValidated)="onUploadValidated($event)"></app-tile-upload>
      }

      <p-dialog
        header="Confirm Upload"
        [(visible)]="showConfirmationDialog"
        [modal]="true" [draggable]="false" [resizable]="false"
        [style]="{width: '60vw', minWidth: '500px'}"
        (onHide)="cancelCommit()"
        >
          @if (showConfirmation()) {
             <app-upload-confirmation></app-upload-confirmation>
          }

           @if (commitLoading()) {
             <div class="dialog-loading-overlay">
                <p-progressSpinner strokeWidth="4" styleClass="w-8 h-8"></p-progressSpinner>
             </div>
           }
      </p-dialog>

       @if (commitError(); as errorMsg) {
        <div class="p-message p-message-error p-mt-3">
             {{ errorMsg }}
        </div>
      }
    </div>
  `,
  styles: [`
    .volta-depth-container { padding: 0 20px 20px 20px; }
    hr { margin: 2rem 0; border: 0; border-top: 1px solid var(--surface-d); }
    .p-message.p-message-error { margin-top: 1rem; }
    .dialog-loading-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(255, 255, 255, 0.7); display: flex; justify-content: center; align-items: center; z-index: 10; border-radius: inherit; }
  `]
})
export class VoltaDepthComponent {
  private voltaDepthService = inject(VoltaDepthService);
  private messageService = inject(MessageService);
  private destroyRef = inject(DestroyRef);

  // --- Signal-Based Child Query ---
  private tileList = viewChild(TileListComponent);

  // --- Core State Signals ---
  readonly currentUploadData = signal<StagedUpload | null>(null);
  readonly commitLoading = signal(false);
  readonly commitError = signal<string | null>(null);

  // --- Derived/UI State Signals ---
  readonly showConfirmation = computed(() => !!this.currentUploadData());
  showConfirmationDialog = false; // Use boolean for p-dialog visible binding

  constructor() {
    // --- Effect to Manage Dialog Visibility ---
    effect(() => {
      const shouldShow = this.showConfirmation();
      if (this.showConfirmationDialog !== shouldShow) {
        this.showConfirmationDialog = shouldShow;
      }
    }, { allowSignalWrites: true });

    // Optional: Log when tileList becomes available/unavailable
    effect(() => { console.log('TileListComponent instance via viewChild:', this.tileList() ? 'Available' : 'Unavailable'); });
  }

  // --- Event Handler from TileUploadComponent ---
  onUploadValidated(stagedUpload: StagedUpload): void {
    console.log('VoltaDepthComponent: Received upload validation');
    console.log('[Frontend] Received upload ID:', stagedUpload.response.uploadId);
    this.commitError.set(null);
    this.currentUploadData.set(stagedUpload); // Triggers effect to show dialog
  }

  // --- Methods Called by UploadConfirmationComponent (via parent injection) ---
  triggerCommit(): void {
    console.log('triggerCommit called in VoltaDepthComponent');
  
    const uploadData = this.currentUploadData();
    if (!uploadData) {
      console.error('No upload data available for commit');
      return;
    }
    
    const uploadId = uploadData.response.uploadId;
    console.log('[Frontend] Committing with upload ID:', uploadId);
  
    this.commitLoading.set(true);
    this.commitError.set(null);

    this.voltaDepthService.commitUpload(uploadData.response.uploadId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          console.log('Commit successful:', result);
          this.currentUploadData.set(null); // Close dialog via effect
          this.messageService.add({ key: 'mainToast', severity: 'success', summary: 'Success', detail: `Tile ${result.tileId} committed.` });

          // Defer refresh call until after view updates
          queueMicrotask(() => {
              const listComp = this.tileList(); // Read signal query AFTER view updates
              if (listComp) {
                  console.log("VoltaDepthComponent: Calling refreshTiles on list component.");
                  listComp.refreshTiles(); // Call public method on child instance
              } else {
                  console.warn("VoltaDepthComponent: Could not refresh tile list - component instance not found after commit.");
              }
          });
        },
        error: (err: Error) => {
          console.error('Commit error:', err);
          const detail = err.message || 'Unknown commit error.';
          this.commitError.set(detail);
          this.messageService.add({ key: 'mainToast', severity: 'error', summary: 'Commit Failed', detail: this.commitError() ?? 'Unknown error', sticky: true });
        },
        
        complete: () => {
          console.log('[Frontend] Committing with upload ID:', uploadData.response.uploadId);
          this.commitLoading.set(false);
        }
      });
  }

  cancelCommit(): void {
    console.log('Commit cancelled.');
    this.currentUploadData.set(null); // Close dialog via effect
    this.commitError.set(null);
    this.commitLoading.set(false);
  }
}