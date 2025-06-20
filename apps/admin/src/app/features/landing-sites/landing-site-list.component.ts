import { Component, EventEmitter, Input, Output, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { LandingSite } from './landing-site.model';

@Component({
  selector: 'app-landing-site-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TooltipModule,
    TagModule,
    ConfirmDialogModule
  ],
  providers: [ConfirmationService],
  template: `
    <div class="landing-site-list">
      <!-- Search bar -->
      <div class="flex justify-between items-center mb-4">
        <div class="flex gap-2">
          <span class="p-input-icon-left">
            <i class="pi pi-search"></i>
            <input 
              pInputText 
              type="text" 
              [(ngModel)]="searchQuery"
              (input)="onSearch()"
              placeholder="Search landing sites..." 
              class="w-80"
            />
          </span>
        </div>
        <button 
          pButton 
          label="New Landing Site" 
          icon="pi pi-plus" 
          (click)="onCreate()"
          class="p-button-success"
        ></button>
      </div>

      <!-- Table -->
      <p-table
        [value]="filteredLandingSites"
        [paginator]="true"
        [rows]="10"
        [loading]="loading"
        [rowHover]="true"
        styleClass="p-datatable-striped"
        [showCurrentPageReport]="true"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} landing sites"
        [globalFilterFields]="['name', 'description']"
      >
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="name" style="width: 25%">
              Name <p-sortIcon field="name"></p-sortIcon>
            </th>
            <th style="width: 30%">Description</th>
            <th style="width: 15%">Status</th>
            <th style="width: 15%">Location</th>
            <th pSortableColumn="updated_at" style="width: 15%">
              Updated <p-sortIcon field="updated_at"></p-sortIcon>
            </th>
            <th style="width: 120px">Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-landingSite>
          <tr>
            <td>
              <span class="font-semibold">{{ landingSite.name }}</span>
              <div class="text-sm text-gray-500" *ngIf="landingSite.description">
                {{ landingSite.description | slice:0:50 }}{{ landingSite.description.length > 50 ? '...' : '' }}
              </div>
            </td>
            <td>
              <span class="text-sm text-gray-600" *ngIf="landingSite.description">
                {{ landingSite.description | slice:0:80 }}{{ landingSite.description.length > 80 ? '...' : '' }}
              </span>
              <span *ngIf="!landingSite.description" class="text-gray-400">No description</span>
            </td>
            <td>
              <p-tag 
                [value]="landingSite.status" 
                [severity]="getStatusSeverity(landingSite.status)"
                styleClass="text-xs"
              ></p-tag>
            </td>
            <td>
              <span class="text-sm">
                {{ landingSite.location.coordinates[1].toFixed(4) }}, {{ landingSite.location.coordinates[0].toFixed(4) }}
              </span>
            </td>
            <td>
              <span class="text-sm">{{ formatDate(landingSite.updated_at) }}</span>
            </td>
            <td>
              <div class="flex gap-2">
                <button 
                  pButton 
                  icon="pi pi-pencil" 
                  class="p-button-text p-button-sm"
                  pTooltip="Edit"
                  (click)="onEdit(landingSite)"
                ></button>
                <button 
                  pButton 
                  icon="pi pi-trash" 
                  class="p-button-text p-button-danger p-button-sm"
                  pTooltip="Delete"
                  (click)="confirmDelete(landingSite)"
                ></button>
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="6" class="text-center py-4">
              <i class="pi pi-info-circle mr-2"></i>
              <span>No landing sites found</span>
            </td>
          </tr>
        </ng-template>
      </p-table>
      
      <p-confirmDialog></p-confirmDialog>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class LandingSiteListComponent implements OnInit, OnChanges {
  @Input() landingSites: LandingSite[] = [];
  @Input() loading = false;

  @Output() create = new EventEmitter<void>();
  @Output() edit = new EventEmitter<LandingSite>();
  @Output() delete = new EventEmitter<LandingSite>();
  @Output() search = new EventEmitter<string>();

  searchQuery = '';
  filteredLandingSites: LandingSite[] = [];
  private searchTimeout: any;

  constructor(private confirmationService: ConfirmationService) {}

  ngOnInit() {
    this.filteredLandingSites = this.landingSites;
  }

  ngOnChanges() {
    this.applyFilter();
  }

  onCreate() {
    this.create.emit();
  }

  onEdit(landingSite: LandingSite) {
    this.edit.emit(landingSite);
  }

  confirmDelete(landingSite: LandingSite) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete the landing site "${landingSite.name}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.delete.emit(landingSite);
      }
    });
  }


  onSearch() {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.search.emit(this.searchQuery);
      this.applyFilter();
    }, 300);
  }

  private applyFilter() {
    if (!this.searchQuery.trim()) {
      this.filteredLandingSites = this.landingSites;
    } else {
      const query = this.searchQuery.toLowerCase();
      this.filteredLandingSites = this.landingSites.filter(site => 
        site.name.toLowerCase().includes(query) || 
        (site.description && site.description.toLowerCase().includes(query))
      );
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusSeverity(status: string): "success" | "warn" | "danger" | "secondary" {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'warn';
      case 'restricted':
        return 'danger';
      default:
        return 'secondary';
    }
  }
}