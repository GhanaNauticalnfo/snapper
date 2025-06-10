import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { MessageModule } from 'primeng/message';
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
    MessageModule
  ],
  template: `
    <p-dialog 
      [(visible)]="visible"
      [header]="'Edit Waypoints'"
      [modal]="true"
      [style]="{width: '600px'}"
      [closable]="true"
      (onHide)="onCancel()">
      
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
  `]
})
export class WaypointEditorDialogComponent {
  @Input() visible = false;
  @Input() set waypoints(value: Waypoint[]) {
    this._waypoints = value;
    this.waypointsToText();
  }
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() waypointsChange = new EventEmitter<Waypoint[]>();
  
  waypointsText = '';
  errorMessage = '';
  private _waypoints: Waypoint[] = [];

  waypointsToText() {
    this.waypointsText = this._waypoints
      .map(wp => `${wp.lat},${wp.lng}`)
      .join('\n');
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
    this.visible = false;
    this.visibleChange.emit(false);
  }

  onCancel() {
    this.waypointsText = '';
    this.errorMessage = '';
    this.visible = false;
    this.visibleChange.emit(false);
  }
}