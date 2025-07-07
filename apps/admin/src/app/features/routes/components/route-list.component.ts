import { Component, OnInit, AfterViewInit, ChangeDetectionStrategy, TemplateRef, signal, viewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { ResourceListComponent, ResourceListConfig, ResourceAction } from '@ghanawaters/shared';
import { RouteService } from '../services/route.service';
import { Route } from '../models/route.model';
import { RouteFormComponent } from './route-form.component';

@Component({
  selector: 'app-route-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    TagModule,
    ResourceListComponent,
    RouteFormComponent
  ],
  providers: [MessageService],
  template: `
    <lib-resource-list
      [config]="listConfig"
      [data]="routes()"
      [loading]="loading()"
      [dialogMode]="dialogMode()"
      [selectedItem]="selectedRoute()"
      [showDialog]="showDialog"
      (showDialogChange)="showDialog = $event"
      (action)="handleAction($event)"
      (dialogShown)="onDialogShow()">
      
      @if (showDialog) {
        <app-route-form
          formContent
          #routeForm
          [route]="selectedRoute()"
          [mode]="dialogMode()"
          (save)="saveRoute($event)"
          (cancel)="showDialog = false">
        </app-route-form>
      }
    </lib-resource-list>
    
    <!-- Column Templates -->
    <ng-template #waypointsTemplate let-item>
      {{ item.waypoints.length }} waypoints
    </ng-template>
    
    <ng-template #statusTemplate let-item>
      <p-tag 
        [value]="item.enabled ? 'Active' : 'Inactive'" 
        [severity]="item.enabled ? 'success' : 'danger'">
      </p-tag>
    </ng-template>
    
    <ng-template #lastUpdatedTemplate let-item>
      {{ item.last_updated | date:'short' }}
    </ng-template>
  `,
  host: {
    'class': 'route-list-host'
  }
})
export class RouteListComponent implements OnInit, AfterViewInit {
  // Services
  private routeService = inject(RouteService);
  private messageService = inject(MessageService);

  // View children
  routeFormComponent = viewChild<RouteFormComponent>('routeForm');
  waypointsTemplate = viewChild.required<TemplateRef<any>>('waypointsTemplate');
  statusTemplate = viewChild.required<TemplateRef<any>>('statusTemplate');
  lastUpdatedTemplate = viewChild.required<TemplateRef<any>>('lastUpdatedTemplate');
  
  // Signals
  routes = signal<Route[]>([]);
  selectedRoute = signal<Route | null>(null);
  loading = signal(false);
  showDialog = false;
  dialogMode = signal<'view' | 'edit' | 'create'>('create');
  
  listConfig!: ResourceListConfig<Route>;
  
  ngOnInit() {
    // Initialize config without template references
    this.listConfig = {
      title: '', // Remove duplicate title - parent component already has page header
      searchPlaceholder: 'Search routes...',
      newButtonLabel: 'New Route',
      entityName: 'routes',
      entityNameSingular: 'route',
      columns: [
        { field: 'name', header: 'Name', sortable: true },
        { field: 'description', header: 'Description', sortable: false },
        { field: 'waypoints', header: 'Waypoints', sortable: true },
        { field: 'enabled', header: 'Status', sortable: true },
        { field: 'last_updated', header: 'Last Updated', sortable: true }
      ],
      searchFields: ['name', 'description'],
      actions: {
        view: true,
        edit: true,
        delete: true
      },
      deleteConfirmMessage: (item) => `Are you sure you want to delete the route "${item.name}"?`,
      emptyMessage: 'No routes found',
      pageSize: 10
    };
    
    this.loadRoutes();
  }
  
  ngAfterViewInit() {
    // Now add the template references
    this.listConfig.columns[2].template = this.waypointsTemplate();
    this.listConfig.columns[3].template = this.statusTemplate();
    this.listConfig.columns[4].template = this.lastUpdatedTemplate();
  }
  
  loadRoutes() {
    this.loading.set(true);
    this.routeService.getAll().subscribe({
      next: (routes) => {
        this.routes.set(routes);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.message || error.message || 'Failed to load routes'
        });
      }
    });
  }
  
  handleAction(action: ResourceAction<Route>) {
    switch (action.type) {
      case 'create':
        this.showCreateDialog();
        break;
      case 'view':
        if (action.item) this.viewRoute(action.item);
        break;
      case 'edit':
        if (action.item) this.editRoute(action.item);
        break;
      case 'delete':
        if (action.item) this.deleteRoute(action.item);
        break;
    }
  }
  
  showCreateDialog() {
    // For create mode, set selectedRoute to null instead of empty object
    this.selectedRoute.set(null);
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
            detail: error.error?.message || error.message || 'Failed to create route'
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
            detail: error.error?.message || error.message || 'Failed to update route'
          });
        }
      });
    }
  }
  
  deleteRoute(route: Route) {
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
            detail: error.error?.message || error.message || 'Failed to delete route'
          });
        }
      });
    }
  }
  
  onDialogShow() {
    // Wait for dialog animation to complete, then prepare map
    setTimeout(() => {
      const formComponent = this.routeFormComponent();
      if (formComponent) {
        // Initialize map after dialog is fully open
        formComponent.prepareMap();
      }
    }, 10); // Minimal delay since dialog now opens instantly
  }
}