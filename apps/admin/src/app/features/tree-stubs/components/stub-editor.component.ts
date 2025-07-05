import { Component, OnInit, OnDestroy, signal, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TreeStubService } from '../services/tree-stub.service';
import { TreeStubGroupResponseDto, TreeStubResponseDto } from '@ghanawaters/shared-models';
import { MapComponent, LayerManagerService } from '@ghanawaters/map';
import { TreeStubLayerService } from '../services/tree-stub-layer.service';

@Component({
  selector: 'app-stub-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TableModule,
    ToastModule,
    ConfirmDialogModule,
    TagModule,
    MapComponent
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="stub-editor-container">
      <div class="flex justify-between items-center mb-4">
        <div class="flex items-center gap-3">
          <button 
            pButton 
            type="button" 
            icon="pi pi-arrow-left" 
            class="p-button-text"
            (click)="goBack()">
          </button>
          <h2>Tree Stubs - {{ group()?.name }}</h2>
        </div>
        <div class="flex gap-2">
          <button 
            pButton 
            type="button" 
            label="Add Point" 
            icon="pi pi-plus" 
            class="p-button-success"
            (click)="addPoint()"
            [disabled]="!group()">
          </button>
          <button 
            pButton 
            type="button" 
            label="Add Polygon" 
            icon="pi pi-plus" 
            class="p-button-success"
            (click)="addPolygon()"
            [disabled]="!group()">
          </button>
          <button 
            pButton 
            type="button" 
            label="Clear All" 
            icon="pi pi-trash" 
            class="p-button-danger p-button-outlined"
            (click)="confirmClearAll()"
            [disabled]="treeStubs().length === 0">
          </button>
        </div>
      </div>

      <div class="grid">
        <!-- Map -->
        <div class="col-8">
          <div class="card h-full">
            <lib-map 
              #mapComponent
              [config]="{
                height: '600px',
                center: [-0.0366, 6.5833],
                zoom: 10,
                showControls: false,
                showFullscreenControl: true,
                showCoordinateDisplay: true,
                availableLayers: ['tree-stubs'],
                initialActiveLayers: ['tree-stubs']
              }">
            </lib-map>
          </div>
        </div>

        <!-- Tree Stubs List -->
        <div class="col-4">
          <div class="card h-full">
            <h3>Tree Stubs</h3>
            <p-table 
              [value]="treeStubs()" 
              [loading]="loading()"
              [scrollable]="true"
              scrollHeight="500px"
              styleClass="p-datatable-sm">
              
              <ng-template pTemplate="header">
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Action</th>
                </tr>
              </ng-template>

              <ng-template pTemplate="body" let-stub>
                <tr>
                  <td>{{ stub.id }}</td>
                  <td>
                    <p-tag 
                      [value]="getGeometryType(stub.geometry)" 
                      [severity]="getGeometryType(stub.geometry) === 'Point' ? 'info' : 'warn'">
                    </p-tag>
                  </td>
                  <td>
                    <button 
                      pButton 
                      type="button" 
                      icon="pi pi-trash" 
                      class="p-button-text p-button-danger p-button-sm"
                      (click)="confirmDeleteStub(stub)"
                      pTooltip="Delete">
                    </button>
                  </td>
                </tr>
              </ng-template>

              <ng-template pTemplate="emptymessage">
                <tr>
                  <td colspan="3" class="text-center">
                    @if (loading()) {
                      Loading tree stubs...
                    } @else {
                      No tree stubs in this group
                    }
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </div>
        </div>
      </div>

      <p-confirmDialog></p-confirmDialog>
      <p-toast></p-toast>
    </div>
  `,
  styles: [`
    .stub-editor-container {
      padding: 0 1.5rem 1.5rem 1.5rem;
    }
    
    .map-container {
      border-radius: 8px;
    }
  `]
})
export class StubEditorComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapComponent') mapComponent!: MapComponent;
  
  groupId = signal<number | null>(null);
  group = signal<TreeStubGroupResponseDto | null>(null);
  treeStubs = signal<TreeStubResponseDto[]>([]);
  loading = signal(false);
  
  private drawingMode: 'none' | 'point' | 'polygon' = 'none';
  private polygonCoordinates: [number, number][] = [];
  private treeStubLayer?: TreeStubLayerService;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private treeStubService: TreeStubService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private layerManager: LayerManagerService,
    private treeStubLayerService: TreeStubLayerService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = parseInt(params['id']);
      if (id) {
        this.groupId.set(id);
        this.loadGroup();
        this.loadTreeStubs();
      }
    });
  }

  ngAfterViewInit() {
    // Register the tree stubs layer with the layer manager
    this.layerManager.registerLayer('tree-stubs', TreeStubLayerService);
    
    // Set up map interaction handlers once map is ready
    setTimeout(() => {
      this.setupMapInteractions();
    }, 1000); // Give the map time to initialize
  }

  ngOnDestroy() {
    // The shared map component handles its own cleanup
  }

  private getTreeStubLayer(): TreeStubLayerService | null {
    if (!this.treeStubLayer) {
      this.treeStubLayer = this.layerManager.getLayer('tree-stubs') as TreeStubLayerService;
    }
    return this.treeStubLayer;
  }

  private setupMapInteractions() {
    const map = this.mapComponent?.map;
    if (!map) return;

    map.on('click', (e) => {
      if (this.drawingMode === 'point') {
        this.createPointTreeStub(e.lngLat.lng, e.lngLat.lat);
      } else if (this.drawingMode === 'polygon') {
        this.addPolygonPoint(e.lngLat.lng, e.lngLat.lat);
      }
    });

    map.on('dblclick', (e) => {
      if (this.drawingMode === 'polygon') {
        e.preventDefault();
        this.finishPolygon();
      }
    });

    // Handle escape key to cancel drawing
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.cancelDrawing();
      }
    });
  }

  private updateTreeStubsOnMap() {
    const layer = this.getTreeStubLayer();
    if (layer) {
      layer.setTreeStubs(this.treeStubs());
    }
  }

  loadGroup() {
    const id = this.groupId();
    if (!id) return;

    this.treeStubService.getGroup(id).subscribe({
      next: (group) => {
        this.group.set(group);
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load group'
        });
        this.goBack();
      }
    });
  }

  loadTreeStubs() {
    const id = this.groupId();
    if (!id) return;

    this.loading.set(true);
    this.treeStubService.getTreeStubs(id).subscribe({
      next: (stubs) => {
        this.treeStubs.set(stubs);
        this.loading.set(false);
        this.updateTreeStubsOnMap();
      },
      error: (error) => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load tree stubs'
        });
      }
    });
  }

  goBack() {
    this.router.navigate(['/tree-stubs']);
  }

  addPoint() {
    this.drawingMode = 'point';
    this.updateMapCursor();
    this.messageService.add({
      severity: 'info',
      summary: 'Point Mode',
      detail: 'Click on the map to add a tree stub point. Press ESC to cancel.'
    });
  }

  private createPointTreeStub(lng: number, lat: number) {
    const groupId = this.groupId();
    if (!groupId) return;

    const pointStub = {
      group_id: groupId,
      geometry: `POINT(${lng} ${lat})`
    };

    this.treeStubService.createTreeStub(pointStub).subscribe({
      next: (newStub) => {
        this.treeStubs.update(stubs => [...stubs, newStub]);
        this.updateTreeStubsOnMap();
        this.cancelDrawing();
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Tree stub point created'
        });
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to create tree stub'
        });
      }
    });
  }

  addPolygon() {
    this.drawingMode = 'polygon';
    this.polygonCoordinates = [];
    this.updateMapCursor();
    this.messageService.add({
      severity: 'info',
      summary: 'Polygon Mode',
      detail: 'Click on the map to add polygon points. Double-click to finish. Press ESC to cancel.'
    });
  }

  private addPolygonPoint(lng: number, lat: number) {
    this.polygonCoordinates.push([lng, lat]);
    
    if (this.polygonCoordinates.length >= 3) {
      // Show preview of polygon being drawn
      this.showPolygonPreview();
    }
  }

  private showPolygonPreview() {
    const map = this.mapComponent?.map;
    if (!map || this.polygonCoordinates.length < 3) return;

    // Add temporary preview layer
    const previewData = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [this.polygonCoordinates.concat([this.polygonCoordinates[0]])] // Close the polygon
        },
        properties: {}
      }]
    };

    if (map.getSource('polygon-preview')) {
      (map.getSource('polygon-preview') as any).setData(previewData as any);
    } else {
      map.addSource('polygon-preview', {
        type: 'geojson',
        data: previewData as any
      });

      map.addLayer({
        id: 'polygon-preview-fill',
        type: 'fill',
        source: 'polygon-preview',
        paint: {
          'fill-color': '#ffff00',
          'fill-opacity': 0.3
        }
      });

      map.addLayer({
        id: 'polygon-preview-outline',
        type: 'line',
        source: 'polygon-preview',
        paint: {
          'line-color': '#ffff00',
          'line-width': 2,
          'line-dasharray': [2, 2]
        }
      });
    }
  }

  private finishPolygon() {
    if (this.polygonCoordinates.length < 3) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Invalid Polygon',
        detail: 'A polygon must have at least 3 points'
      });
      return;
    }

    const groupId = this.groupId();
    if (!groupId) return;

    // Close the polygon by adding the first point at the end
    const closedCoords = [...this.polygonCoordinates, this.polygonCoordinates[0]];
    const coordsString = closedCoords.map(coord => `${coord[0]} ${coord[1]}`).join(', ');
    
    const polygonStub = {
      group_id: groupId,
      geometry: `POLYGON((${coordsString}))`
    };

    this.treeStubService.createTreeStub(polygonStub).subscribe({
      next: (newStub) => {
        this.treeStubs.update(stubs => [...stubs, newStub]);
        this.updateTreeStubsOnMap();
        this.cancelDrawing();
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Tree stub polygon created'
        });
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to create tree stub'
        });
      }
    });
  }

  private updateMapCursor() {
    const map = this.mapComponent?.map;
    if (!map) return;
    
    const container = map.getContainer();
    if (this.drawingMode === 'none') {
      container.style.cursor = '';
    } else {
      container.style.cursor = 'crosshair';
    }
  }

  private cancelDrawing() {
    this.drawingMode = 'none';
    this.polygonCoordinates = [];
    this.updateMapCursor();
    
    // Remove preview layers
    const map = this.mapComponent?.map;
    if (map) {
      if (map.getLayer('polygon-preview-fill')) {
        map.removeLayer('polygon-preview-fill');
      }
      if (map.getLayer('polygon-preview-outline')) {
        map.removeLayer('polygon-preview-outline');
      }
      if (map.getSource('polygon-preview')) {
        map.removeSource('polygon-preview');
      }
    }
  }

  confirmDeleteStub(stub: TreeStubResponseDto) {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this tree stub?',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.treeStubService.deleteTreeStub(stub.id).subscribe({
          next: () => {
            this.treeStubs.update(stubs => stubs.filter(s => s.id !== stub.id));
            this.updateTreeStubsOnMap();
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Tree stub deleted successfully'
            });
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to delete tree stub'
            });
          }
        });
      }
    });
  }

  confirmClearAll() {
    const groupId = this.groupId();
    if (!groupId) return;

    this.confirmationService.confirm({
      message: 'Are you sure you want to delete all tree stubs in this group?',
      header: 'Confirm Clear All',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.treeStubService.deleteTreeStubsByGroup(groupId).subscribe({
          next: () => {
            this.treeStubs.set([]);
            this.updateTreeStubsOnMap();
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'All tree stubs deleted successfully'
            });
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to delete tree stubs'
            });
          }
        });
      }
    });
  }

  getGeometryType(geometry: string): string {
    if (geometry.includes('POINT')) return 'Point';
    if (geometry.includes('POLYGON')) return 'Polygon';
    return 'Unknown';
  }
}