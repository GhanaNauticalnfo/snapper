import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { MessageModule } from 'primeng/message';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { Waypoint } from '../models/route.model';

@Component({
  selector: 'app-waypoint-editor-dialog',
  standalone: true,
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
      [closable]="false">
      
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

      @if (errorMessage) {
        <p-message severity="error" [text]="errorMessage" [closable]="false"></p-message>
      }

      <p-confirmDialog></p-confirmDialog>

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
  styles: [`
    :host {
      display: block;
    }
    .dialog-header {
      width: 100%;
    }
  `]
})
export class WaypointEditorDialogComponent implements OnChanges {
  constructor(private confirmationService: ConfirmationService) {}
  @Input() visible = false;
  @Input() waypoints: Waypoint[] = [];
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() waypointsChange = new EventEmitter<Waypoint[]>();
  
  waypointsText = '';
  errorMessage = '';
  private _waypoints: Waypoint[] = [];
  private originalWaypointsText = '';
  private changesApplied = false;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible'] && changes['visible'].currentValue === true) {
      // When dialog is shown, initialize waypoints text
      this.initializeWaypoints();
    }
    if (changes['waypoints'] && !changes['visible']) {
      // If waypoints change while dialog is closed, store them
      this._waypoints = changes['waypoints'].currentValue || [];
    }
  }

  private initializeWaypoints() {
    // Use the current waypoints prop or fall back to stored waypoints
    const currentWaypoints = this.waypoints || this._waypoints || [];
    this.waypointsText = currentWaypoints
      .map(wp => `${wp.lat},${wp.lng}`)
      .join('\n');
    this.originalWaypointsText = this.waypointsText;
    this.errorMessage = '';
    this.changesApplied = false;
  }

  private hasUnsavedChanges(): boolean {
    return this.waypointsText !== this.originalWaypointsText;
  }

  onApply() {
    this.errorMessage = '';
    const lines = this.waypointsText.trim().split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      this.errorMessage = 'At least 2 waypoints are required';
      return;
    }

    const newWaypoints: Waypoint[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const parts = line.split(',').map(p => p.trim());
      
      if (parts.length !== 2) {
        this.errorMessage = `Line ${i + 1}: Invalid format. Expected "lat,lon"`;
        return;
      }

      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);

      if (isNaN(lat) || isNaN(lng)) {
        this.errorMessage = `Line ${i + 1}: Invalid coordinates. Must be numbers`;
        return;
      }

      if (lat < -90 || lat > 90) {
        this.errorMessage = `Line ${i + 1}: Latitude must be between -90 and 90`;
        return;
      }

      if (lng < -180 || lng > 180) {
        this.errorMessage = `Line ${i + 1}: Longitude must be between -180 and 180`;
        return;
      }

      newWaypoints.push({
        id: crypto.randomUUID(),
        lat,
        lng,
        order: i,
        name: `Waypoint ${i + 1}`
      });
    }

    this.waypointsChange.emit(newWaypoints);
    this.changesApplied = true;
    this.closeDialog();
  }

  onCancel() {
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

  private closeDialog() {
    this.waypointsText = '';
    this.errorMessage = '';
    this.changesApplied = false;
    this.visible = false;
    this.visibleChange.emit(false);
  }
}