import { Component, signal, inject, ChangeDetectionStrategy, Output, EventEmitter, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, EMPTY, switchMap, tap, catchError, finalize } from 'rxjs';

// PrimeNG Imports
import { FileUploadModule, FileUploadHandlerEvent, FileSelectEvent, FileUploadErrorEvent } from 'primeng/fileupload';

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
    ],
    template: `
    <div class="tile-upload-wrapper">
      <h4>Upload New Tile GeoJSON</h4>
      <p-fileUpload
        #fileUploadComponent
        mode="basic"
        name="file"
        accept=".json,.geojson"
        [maxFileSize]="52428800"
        [auto]="true"
        [customUpload]="true"
        (uploadHandler)="onUpload($event)"
        (onSelect)="onFileSelect($event)"
        (onError)="onFileError($event)"
        [disabled]="isLoading()"
        chooseLabel="Choose GeoJSON"
        chooseIcon="pi pi-upload"
        [styleClass]="uploadError() ? 'p-invalid' : ''"
        >
      </p-fileUpload>

      @if (isLoading()) {
          <div class="loading-indicator">
            <span>Validating file...</span>
          </div>
      }
      @if (uploadError(); as errorMsg) {
        <div class="p-error upload-error-message">
             {{ errorMsg }}
        </div>
      }
    </div>
  `,
    styles: [`
    :host { display: block; margin-bottom: 1rem; }
    .tile-upload-wrapper { padding: 1rem 1.25rem; border: 1px solid var(--surface-d); background-color: var(--surface-a); border-radius: 6px; }
    h4 { margin-top: 0; margin-bottom: 1rem; color: var(--text-color-secondary); }
    :host ::ng-deep .p-fileupload-basic { width: auto; }
    :host ::ng-deep .p-fileupload.p-invalid .p-button { border-color: var(--red-500); }
    .loading-indicator { margin-top: 0.75rem; font-style: italic; color: var(--text-color-secondary); font-size: 0.9em; }
    .upload-error-message { margin-top: 0.75rem; font-size: 0.9em; }
  `]
})
export class TileUploadComponent {
    private voltaDepthService = inject(VoltaDepthService);
    private destroyRef = inject(DestroyRef);

    // --- State Signals ---
    readonly isLoading = signal(false);
    readonly uploadError = signal<string | null>(null);
    private currentFile: File | null = null;

    // --- Output Event ---
    @Output() uploadValidated = new EventEmitter<{ response: UploadResponse; file: File }>();

    // --- Upload Handler ---
    onUpload(event: FileUploadHandlerEvent): void {
        const file = event.files[0];
        if (!file) { this.uploadError.set("No file provided to upload handler."); return; }
        console.log(`TileUploadComponent: Uploading ${file.name}`);
        this.currentFile = file;
        this.isLoading.set(true);
        this.uploadError.set(null);

        this.voltaDepthService.uploadTile(file)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
            next: (response) => {
                console.log('TileUploadComponent: Validation success');
                this.uploadValidated.emit({ response, file }); // Emit event UP to parent
            },
            error: (err: Error) => {
                console.error('TileUploadComponent: Upload API error:', err);
                this.uploadError.set(err.message || 'Unknown upload validation error.');
            },
            complete: () => {
                this.isLoading.set(false);
                // Clearing p-fileUpload might require ViewChild and calling its clear() method
            }
        });
    }

    /** Called when a file is selected */
    onFileSelect(event: FileSelectEvent): void {
         this.uploadError.set(null); // Clear previous errors
         this.currentFile = event.files[0];
         console.log("File selected:", this.currentFile?.name);
    }

    /** Called by p-fileUpload on internal errors */
    onFileError(event: FileUploadErrorEvent): void {
        const firstFileName = event.files[0]?.name || 'unknown file';
        // Access error message if available (structure might vary by PrimeNG version)
        const internalError = (event as any).error?.message || 'Check constraints.'; // Use 'any' carefully if type is uncertain
        const errorMsg = `File rejected: ${firstFileName}. ${internalError}`;
        console.error("p-fileUpload error:", errorMsg, event);
        this.uploadError.set(errorMsg);
        this.isLoading.set(false);
        this.currentFile = null;
    }
}