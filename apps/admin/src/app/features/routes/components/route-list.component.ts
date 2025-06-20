import { Component, OnInit, ViewChild, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService, ConfirmationService } from 'primeng/api';
import { RouteService } from '../services/route.service';
import { Route } from '../models/route.model';
import { RouteFormComponent } from './route-form.component';

@Component({
  selector: 'app-route-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
    SkeletonModule,
    RouteFormComponent
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="route-list-container">
      <div class="flex justify-end items-center mb-4">
        <button 
          pButton 
          type="button" 
          label="New Route" 
          icon="pi pi-plus" 
          class="p-button-success"
          (click)="showCreateDialog()">
        </button>
      </div>

      <div class="mb-3">
        <span class="p-input-icon-left">
          <i class="pi pi-search"></i>
          <input 
            pInputText 
            type="text" 
            [(ngModel)]="searchQuery" 
            placeholder="Search routes..." 
            class="w-full">
        </span>
      </div>

      <p-table 
        [value]="filteredRoutes()" 
        [loading]="loading()"
        [paginator]="true" 
        [rows]="10"
        [showCurrentPageReport]="true"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} routes"
        styleClass="p-datatable-gridlines">
        
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="name">
              Name <p-sortIcon field="name"></p-sortIcon>
            </th>
            <th>Description</th>
            <th pSortableColumn="waypoints">
              Waypoints <p-sortIcon field="waypoints"></p-sortIcon>
            </th>
            <th pSortableColumn="enabled">
              Status <p-sortIcon field="enabled"></p-sortIcon>
            </th>
            <th pSortableColumn="last_updated">
              Last Updated <p-sortIcon field="last_updated"></p-sortIcon>
            </th>
            <th>Actions</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-route>
          <tr>
            <td>{{ route.name }}</td>
            <td>{{ route.description || '-' }}</td>
            <td>
              <p-tag 
                [value]="route.waypoints.length + ' waypoints'" 
                severity="info">
              </p-tag>
            </td>
            <td>
              <p-tag 
                [value]="route.enabled ? 'Active' : 'Inactive'" 
                [severity]="route.enabled ? 'success' : 'danger'">
              </p-tag>
            </td>
            <td>{{ route.last_updated | date:'short' }}</td>
            <td>
              <button 
                pButton 
                type="button" 
                icon="pi pi-eye" 
                class="p-button-text p-button-info"
                (click)="viewRoute(route)"
                pTooltip="View">
              </button>
              <button 
                pButton 
                type="button" 
                icon="pi pi-pencil" 
                class="p-button-text p-button-warning"
                (click)="editRoute(route)"
                pTooltip="Edit">
              </button>
              <button 
                pButton 
                type="button" 
                icon="pi pi-trash" 
                class="p-button-text p-button-danger"
                (click)="confirmDelete(route)"
                pTooltip="Delete">
              </button>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="6" class="text-center">
              @if (loading()) {
                <div class="flex flex-col items-center gap-3">
                  @for (i of [1,2,3]; track i) {
                    <p-skeleton width="100%" height="2rem"></p-skeleton>
                  }
                </div>
              } @else {
                No routes found
              }
            </td>
          </tr>
        </ng-template>
      </p-table>

      <p-dialog 
        [(visible)]="showDialog" 
        [header]="dialogMode() === 'view' ? 'View Route' : (dialogMode() === 'edit' ? 'Edit Route' : 'Create Route')"
        [modal]="true"
        [style]="{width: '90vw', height: '85vh'}"
        [maximizable]="true"
        [draggable]="false"
        [resizable]="false"
        [appendTo]="'body'"
        [blockScroll]="true"
        [closable]="false"
        (onShow)="onDialogShow()">
        
        <app-route-form
          #routeForm
          [route]="selectedRoute()"
          [mode]="dialogMode()"
          (save)="saveRoute($event)"
          (cancel)="onFormCancel()">
        </app-route-form>
      </p-dialog>

      <p-confirmDialog></p-confirmDialog>
      <p-toast></p-toast>
    </div>
  `,
  styles: [`
    .route-list-container {
      padding: 0 1.5rem 1.5rem 1.5rem;
    }
  `],
  host: {
    'class': 'route-list-host'
  }
})
export class RouteListComponent implements OnInit {
  @ViewChild('routeForm') routeFormComponent?: RouteFormComponent;
  
  routes = signal<Route[]>([]);
  selectedRoute = signal<Route | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  searchQuery = '';
  showDialog = false;
  dialogMode = signal<'view' | 'edit' | 'create'>('create');

  filteredRoutes = computed(() => {
    const query = this.searchQuery.toLowerCase();
    const routeList = this.routes();
    
    if (!query) return routeList;
    
    return routeList.filter(route => 
      route.name.toLowerCase().includes(query) ||
      route.description?.toLowerCase().includes(query)
    );
  });

  constructor(
    private routeService: RouteService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit() {
    this.loadRoutes();
  }

  loadRoutes() {
    this.loading.set(true);
    this.routeService.getAll().subscribe({
      next: (routes) => {
        this.routes.set(routes);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set('Failed to load routes');
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load routes'
        });
      }
    });
  }

  showCreateDialog() {
    this.selectedRoute.set({
      name: '',
      description: '',
      waypoints: [],
      enabled: true,
      color: '#FF0000'
    } as Route);
    this.dialogMode.set('create');
    this.showDialog = true;
  }

  viewRoute(route: Route) {
    this.selectedRoute.set(route);
    this.dialogMode.set('view');
    this.showDialog = true;
  }

  editRoute(route: Route) {
    // Make a deep copy of the route including waypoints
    this.selectedRoute.set({ 
      ...route,
      waypoints: route.waypoints ? [...route.waypoints] : []
    });
    this.dialogMode.set('edit');
    this.showDialog = true;
  }

  saveRoute(route: Route) {
    if (this.dialogMode() === 'create') {
      this.routeService.create(route).subscribe({
        next: (newRoute) => {
          this.routes.update(routes => [...routes, newRoute]);
          this.showDialog = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Route created successfully'
          });
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to create route'
          });
        }
      });
    } else if (this.dialogMode() === 'edit' && route.id) {
      this.routeService.update(route.id, route).subscribe({
        next: (updatedRoute) => {
          this.routes.update(routes => 
            routes.map(r => r.id === updatedRoute.id ? updatedRoute : r)
          );
          this.showDialog = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Route updated successfully'
          });
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update route'
          });
        }
      });
    }
  }

  confirmDelete(route: Route) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete the route "${route.name}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        if (route.id) {
          this.routeService.delete(route.id).subscribe({
            next: () => {
              this.routes.update(routes => routes.filter(r => r.id !== route.id));
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Route deleted successfully'
              });
            },
            error: (error) => {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to delete route'
              });
            }
          });
        }
      }
    });
  }

  onDialogShow() {
    // Allow dialog to render, then initialize/resize map
    setTimeout(() => {
      if (this.routeFormComponent) {
        // If the map is already initialized, resize it
        (this.routeFormComponent as any).map?.resize();
      }
    }, 100);
  }

  onFormCancel() {
    this.showDialog = false;
    // Reset selected route to prevent stale data
    this.selectedRoute.set(null);
  }
}