import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { MessageService } from 'primeng/api';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

interface DatabaseStatistics {
  retentionDays: number;
  currentSizeGb: number;
  history: Array<{
    date: string;
    vesselTelemetrySizeGb: number;
    vesselTelemetryCount: number;
  }>;
}

@Component({
  selector: 'app-database-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputNumberModule,
    TableModule,
    CardModule,
    ProgressSpinnerModule
  ],
  template: `
    <div class="database-settings">
      <div class="page-header">
        <h2>Database Settings</h2>
      </div>

      <p-card class="mb-4">
        <ng-template pTemplate="header">
          <div class="flex align-items-center justify-content-between p-3">
            <h3 class="m-0">Telemetry Data Management</h3>
            <span class="text-2xl font-semibold" *ngIf="statistics">
              Current Size: {{ statistics.currentSizeGb.toFixed(2) }} GB
            </span>
          </div>
        </ng-template>

        <div class="field grid">
          <label for="retentionDays" class="col-12 mb-2 md:col-2 md:mb-0">
            Retention Days
          </label>
          <div class="col-12 md:col-4">
            <p-inputNumber 
              id="retentionDays"
              [(ngModel)]="retentionDays"
              [min]="1"
              [max]="3650"
              [showButtons]="true"
              (ngModelChange)="onRetentionDaysChange()"
              [disabled]="loading"
            />
          </div>
          <div class="col-12 md:col-6">
            <small class="text-color-secondary">
              Telemetry data older than this many days will be automatically deleted daily at 2 AM.
            </small>
          </div>
        </div>

        <div class="flex gap-2 mt-4" *ngIf="hasChanges">
          <p-button 
            label="Save Changes" 
            [severity]="'primary'"
            (onClick)="saveChanges()"
            [disabled]="loading"
          />
          <p-button 
            label="Cancel" 
            [severity]="'secondary'"
            (onClick)="cancelChanges()"
            [disabled]="loading"
          />
        </div>
      </p-card>

      <p-card>
        <ng-template pTemplate="header">
          <div class="p-3">
            <h3 class="m-0">Growth History</h3>
          </div>
        </ng-template>

        <div *ngIf="loading" class="flex justify-content-center p-4">
          <p-progressSpinner />
        </div>

        <p-table 
          *ngIf="!loading && statistics"
          [value]="statistics.history" 
          [paginator]="true" 
          [rows]="10"
          [tableStyle]="{'min-width': '50rem'}"
        >
          <ng-template pTemplate="header">
            <tr>
              <th>Date</th>
              <th>Size (GB)</th>
              <th>Record Count</th>
              <th>Daily Growth (GB)</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-stat let-rowIndex="rowIndex">
            <tr>
              <td>{{ formatDate(stat.date) }}</td>
              <td>{{ stat.vesselTelemetrySizeGb.toFixed(4) }}</td>
              <td>{{ stat.vesselTelemetryCount.toLocaleString() }}</td>
              <td>
                <span *ngIf="rowIndex < statistics.history.length - 1">
                  {{ calculateGrowth(stat, statistics.history[rowIndex + 1]) }}
                </span>
                <span *ngIf="rowIndex === statistics.history.length - 1">
                  -
                </span>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="4" class="text-center">No historical data available yet.</td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>
    </div>
  `,
  styles: [`
    .database-settings {
      padding: 1rem;
    }

    .page-header {
      margin-bottom: 1.5rem;
    }

    .page-header h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
    }
  `]
})
export class DatabaseSettingsComponent implements OnInit {
  statistics: DatabaseStatistics | null = null;
  retentionDays: number = 365;
  originalRetentionDays: number = 365;
  hasChanges: boolean = false;
  loading: boolean = false;

  constructor(
    private http: HttpClient,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadDatabaseSettings();
  }

  loadDatabaseSettings() {
    this.loading = true;
    this.http.get<DatabaseStatistics>('/api/settings/database').subscribe({
      next: (data) => {
        this.statistics = data;
        this.retentionDays = data.retentionDays;
        this.originalRetentionDays = data.retentionDays;
        this.loading = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load database settings'
        });
        this.loading = false;
      }
    });
  }

  onRetentionDaysChange() {
    this.hasChanges = this.retentionDays !== this.originalRetentionDays;
  }

  saveChanges() {
    this.loading = true;
    this.http.put('/api/settings/database', { retentionDays: this.retentionDays }).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Database settings updated successfully'
        });
        this.originalRetentionDays = this.retentionDays;
        this.hasChanges = false;
        this.loading = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to update database settings'
        });
        this.loading = false;
      }
    });
  }

  cancelChanges() {
    this.retentionDays = this.originalRetentionDays;
    this.hasChanges = false;
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  }

  calculateGrowth(current: any, previous: any): string {
    const growth = current.vesselTelemetrySizeGb - previous.vesselTelemetrySizeGb;
    const prefix = growth >= 0 ? '+' : '';
    return `${prefix}${growth.toFixed(4)}`;
  }
}