import { Component, input, output, model, effect, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { MessageModule } from 'primeng/message';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { Waypoint } from '../models/route.model';
import { RouteValidators } from '../validators/route.validators';

@Component({
  selector: 'app-waypoint-editor-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    TextareaModule,
    MessageModule,
    ConfirmDialogModule
  ],
  providers: [ConfirmationService],
  template: `
    <p-dialog 
      [(visible)]="visible"
      [modal]="true"
      [style]="{width: '600px'}"
      [closable]="false"
      [appendTo]="'body'">
      
      <ng-template pTemplate="header">
        <div class="flex items-center justify-between w-full">
          <span>Edit Waypoints</span>
          <button 
            pButton 
            type="button" 
            icon="pi pi-times" 
            class="p-button-text p-button-plain"
            (click)="onCancel()">
          </button>
        </div>
      </ng-template>
      
      <div class="mb-3">
        <p-message severity="info" [closable]="false">
          Enter waypoints as lat,lon pairs, one per line. For example:<br/>
          5.6037,0.0000<br/>
          5.6123,-0.0456
        </p-message>
      </div>

      <div class="field">
        <label for="waypoints-text" class="block mb-2">Waypoints</label>
        <textarea 
          pTextarea 
          id="waypoints-text"
          [(ngModel)]="waypointsText"
          rows="15"
          class="w-full"
          placeholder="5.6037,0.0000
5.6123,-0.0456
5.6234,-0.0789">
        </textarea>
      </div>

      @if (errorMessage()) {
        <p-message severity="error" [text]="errorMessage()" [closable]="false"></p-message>
      }

      <p-confirmDialog [appendTo]="'body'"></p-confirmDialog>

      <ng-template pTemplate="footer">
        <button 
          pButton 
          type="button" 
          label="Cancel" 
          class="p-button-text"
          (click)="onCancel()">
        </button>
        <button 
          pButton 
          type="button" 
          label="Apply" 
          icon="pi pi-check"
          (click)="onApply()">
        </button>
      </ng-template>
    </p-dialog>
  `,
  host: {
    class: 'waypoint-editor-dialog-host'
  }
})
export class WaypointEditorDialogComponent {
  private confirmationService = inject(ConfirmationService);
  
  // Inputs and outputs using new functions
  visible = model(false);
  waypoints = input<Waypoint[]>([]);
  waypointsChange = output<Waypoint[]>();
  
  // State
  waypointsText = '';
  errorMessage = signal('');
  private originalWaypointsText = '';
  private changesApplied = false;
  
  constructor() {
    // Effect to initialize waypoints when dialog becomes visible
    effect(() => {
      if (this.visible()) {
        this.initializeWaypoints();
      }
    });
  }

  private initializeWaypoints(): void {
    const currentWaypoints = this.waypoints() || [];
    this.waypointsText = currentWaypoints
      .map(wp => `${wp.lat},${wp.lng}`)
      .join('\n');
    this.originalWaypointsText = this.waypointsText;
    this.errorMessage.set('');
    this.changesApplied = false;
  }

  private hasUnsavedChanges(): boolean {
    return this.waypointsText !== this.originalWaypointsText;
  }

  onApply(): void {
    this.errorMessage.set('');
    
    const result = RouteValidators.parseWaypointsText(this.waypointsText);
    
    if (result.error) {
      this.errorMessage.set(result.error);
      return;
    }

    this.waypointsChange.emit(result.waypoints);
    this.changesApplied = true;
    this.closeDialog();
  }

  onCancel(): void {
    if (!this.changesApplied && this.hasUnsavedChanges()) {
      this.confirmationService.confirm({
        message: 'You have unsaved changes to the waypoints. Are you sure you want to cancel?',
        header: 'Unsaved Changes',
        icon: 'pi pi-exclamation-triangle',
        accept: () => {
          this.closeDialog();
        }
      });
    } else {
      this.closeDialog();
    }
  }

  private closeDialog(): void {
    this.waypointsText = '';
    this.errorMessage.set('');
    this.changesApplied = false;
    this.visible.set(false);
  }
}