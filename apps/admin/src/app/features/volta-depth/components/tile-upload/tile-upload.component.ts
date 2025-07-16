import { Component, signal, inject, ChangeDetectionStrategy, Output, EventEmitter, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// PrimeNG Imports
import { FileUploadModule } from 'primeng/fileupload';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';

// Models/Service
import { VoltaDepthService } from '../../volta-depth.service';
import { UploadResponse } from '../../models/upload-response.model';

@Component({
    selector: 'app-tile-upload',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        FileUploadModule,
        ToastModule,
        ProgressBarModule,
        TagModule,
        ButtonModule
    ],
    providers: [MessageService],
    template: `
    <div class="tile-upload-wrapper">
      <h4>Upload New Tile</h4>
      
      <p-fileUpload
        #fileUpload
        mode="advanced"
        [customUpload]="true"
        (uploadHandler)="onUpload($event)"
        accept=".json,.geojson"
        [maxFileSize]="52428800"
        [disabled]="isLoading()"
        chooseLabel="Select GeoJSON"
        [showCancelButton]="false"
        [showUploadButton]="false"
        [auto]="true"
        (onSelect)="onFileSelect($event)"
        (onError)="onFileError($event)"
        styleClass="w-full"
        [styleClass]="uploadError() ? 'p-invalid' : ''"
      >
        <ng-template pTemplate="content">
          <div class="upload-status flex justify-content-between align-items-center" *ngIf="selectedFile()">
            <div class="flex align-items-center">
              <i class="pi pi-file-edit mr-2 text-xl"></i>
              <span class="font-semibold">{{ selectedFile()?.name }}</span>
              <p-tag 
                [value]="isLoading() ? 'Validating...' : 'Selected'" 
                [severity]="isLoading() ? 'info' : 'success'"
                styleClass="ml-2"
              ></p-tag>
            </div>
            <div *ngIf="isLoading()" class="flex align-items-center">
              <p-progressBar mode="indeterminate" [style]="{'height': '6px', 'width': '200px'}"></p-progressBar>
            </div>
          </div>
        </ng-template>
        
        <ng-template pTemplate="empty">
          <div class="flex flex-column align-items-center p-4 gap-3 border-2 border-dashed surface-border border-round">
            <i class="pi pi-cloud-upload text-5xl text-primary"></i>
            <span class="font-semibold">Drag and drop GeoJSON file here</span>
            <span class="text-sm text-color-secondary">or click to browse</span>
          </div>
        </ng-template>
      </p-fileUpload>

      <div *ngIf="uploadError()" class="p-error upload-error-message mt-2 text-sm">
        <i class="pi pi-exclamation-triangle mr-2"></i>{{ uploadError() }}
      </div>
    </div>
  `,
    styles: [`
    :host { display: block; margin-bottom: 1rem; }
    .tile-upload-wrapper { padding: 1rem 1.25rem; border: 1px solid var(--surface-d); background-color: var(--surface-a); border-radius: 6px; }
    h4 { margin-top: 0; margin-bottom: 1rem; color: var(--text-color-secondary); }
    .upload-error-message { margin-top: 0.75rem; padding: 0.5rem; border-radius: 4px; background-color: var(--red-50); }
  `]
})
export class TileUploadComponent {
    private voltaDepthService = inject(VoltaDepthService);
    private destroyRef = inject(DestroyRef);
    private messageService = inject(MessageService);

    // --- State Signals ---
    readonly isLoading = signal(false);
    readonly uploadError = signal<string | null>(null);
    readonly selectedFile = signal<File | null>(null);

    // --- Output Event ---
    @Output() uploadValidated = new EventEmitter<{ response: UploadResponse; file: File }>();

    // --- Upload Handler ---
    onUpload(event: any): void {
        const file = event.files[0];
        if (!file) { 
            this.uploadError.set("No file provided to upload handler."); 
            return; 
        }
        
        console.log(`TileUploadComponent: Uploading ${file.name}`);
        this.isLoading.set(true);
        this.uploadError.set(null);

        this.voltaDepthService.uploadTile(file)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (response) => {
                    console.log('TileUploadComponent: Validation success');
                    this.uploadValidated.emit({ response, file }); // Emit event UP to parent
                    this.messageService.add({
                        severity: 'success',
                        summary: 'File Validated',
                        detail: `Successfully validated ${file.name} for Tile ${response.deducedTileId}`
                    });
                },
                error: (err: Error) => {
                    console.error('TileUploadComponent: Upload API error:', err);
                    this.uploadError.set(err.message || 'Unknown upload validation error.');
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Validation Failed',
                        detail: err.message || 'Unknown upload validation error.'
                    });
                },
                complete: () => {
                    this.isLoading.set(false);
                }
            });
    }

    /** Called when a file is selected */
    onFileSelect(event: any): void {
        this.uploadError.set(null); // Clear previous errors
        this.selectedFile.set(event.files[0]);
        console.log("File selected:", event.files[0]?.name);
    }

    /** Called by p-fileUpload on internal errors */
    onFileError(event: any): void {
        const firstFileName = event.files[0]?.name || 'unknown file';
        // Access error message if available (structure might vary by PrimeNG version)
        const internalError = event.error?.message || 'Check file size and format constraints.';
        const errorMsg = `File rejected: ${firstFileName}. ${internalError}`;
        console.error("p-fileUpload error:", errorMsg, event);
        this.uploadError.set(errorMsg);
        this.isLoading.set(false);
        this.selectedFile.set(null);
        
        this.messageService.add({
            severity: 'error',
            summary: 'Upload Error',
            detail: errorMsg
        });
    }
}