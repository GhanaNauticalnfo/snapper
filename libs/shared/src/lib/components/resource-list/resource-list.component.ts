import { Component, ChangeDetectionStrategy, input, output, contentChild, TemplateRef, computed, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ResourceListConfig, ResourceAction } from './resource-list.models';

@Component({
  selector: 'lib-resource-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    TagModule,
    ToastModule,
    TooltipModule,
    ConfirmDialogModule,
    SkeletonModule
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="resource-list-container">
      @if (config().title) {
        <div class="page-header">
          <h2>{{ config().title }}</h2>
        </div>
      }

      <div class="flex justify-between items-center mb-3">
        <button 
          pButton 
          type="button" 
          [label]="config().newButtonLabel" 
          icon="pi pi-plus" 
          class="p-button-success"
          (click)="onCreateNew()">
        </button>
        
        <div class="search-container relative">
          <input 
            pInputText 
            type="text" 
            [ngModel]="searchQuery()" 
            (ngModelChange)="searchQuery.set($event)"
            [placeholder]="config().searchPlaceholder"
            class="search-input pr-10">
          <i class="pi pi-search absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
        </div>
      </div>

      <p-table 
        [value]="filteredData()" 
        [loading]="loading()"
        [paginator]="true" 
        [rows]="config().pageSize || 10"
        [showCurrentPageReport]="true"
        [currentPageReportTemplate]="currentPageReportTemplate()"
        styleClass="p-datatable-gridlines">
        
        <ng-template pTemplate="header">
          <tr>
            @for (column of config().columns; track column.field) {
              @if (column.sortable !== false) {
                <th [pSortableColumn]="column.field" [style.width]="column.width">
                  {{ column.header }} <p-sortIcon [field]="column.field"></p-sortIcon>
                </th>
              } @else {
                <th [style.width]="column.width">{{ column.header }}</th>
              }
            }
            @if (config().actions) {
              <th>Actions</th>
            }
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-item>
          <tr>
            @for (column of config().columns; track column.field) {
              <td>
                @if (column.template) {
                  <ng-container *ngTemplateOutlet="column.template; context: { $implicit: item }"></ng-container>
                } @else {
                  {{ getFieldValue(item, column.field) }}
                }
              </td>
            }
            @if (config().actions) {
              <td>
                @if (config().actions?.view) {
                  <button 
                    pButton 
                    type="button" 
                    icon="pi pi-eye" 
                    class="p-button-text p-button-info"
                    (click)="onAction('view', item)"
                    pTooltip="View">
                  </button>
                }
                @if (config().actions?.edit) {
                  <button 
                    pButton 
                    type="button" 
                    icon="pi pi-pencil" 
                    class="p-button-text p-button-warning"
                    (click)="onAction('edit', item)"
                    pTooltip="Edit">
                  </button>
                }
                @if (config().actions?.delete) {
                  <button 
                    pButton 
                    type="button" 
                    icon="pi pi-trash" 
                    class="p-button-text p-button-danger"
                    (click)="onAction('delete', item)"
                    pTooltip="Delete">
                  </button>
                }
                @for (customAction of config().actions?.custom; track customAction.key) {
                  <button 
                    pButton 
                    type="button" 
                    [icon]="customAction.icon" 
                    [class]="'p-button-text ' + (customAction.styleClass || '')"
                    (click)="onAction(customAction.key, item)"
                    [pTooltip]="customAction.tooltip">
                  </button>
                }
              </td>
            }
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr>
            <td [attr.colspan]="columnCount()" class="text-center">
              @if (loading()) {
                <div class="flex flex-col items-center gap-3">
                  @for (i of [1,2,3]; track i) {
                    <p-skeleton width="100%" height="2rem"></p-skeleton>
                  }
                </div>
              } @else {
                {{ config().emptyMessage || 'No data found' }}
              }
            </td>
          </tr>
        </ng-template>
      </p-table>

      <p-dialog 
        [visible]="showDialog()"
        (visibleChange)="onDialogVisibilityChange($event)"
        [header]="dialogHeader()"
        [modal]="true"
        [style]="{width: '90vw', height: '85vh'}"
        [contentStyle]="{height: '100%', display: 'flex', flexDirection: 'column'}"
        [transitionOptions]="'0ms'"
        [maximizable]="true"
        [draggable]="false"
        [resizable]="false"
        [appendTo]="'body'"
        [blockScroll]="true"
        (onShow)="onDialogShow()">
        
        <ng-content select="[formContent]"></ng-content>
      </p-dialog>

      <p-confirmDialog></p-confirmDialog>
      <p-toast></p-toast>
    </div>
  `,
  styles: [`
    .search-container {
      width: 300px;
    }
    
    .search-container .search-input {
      width: 100%;
    }
  `],
  host: {
    'class': 'resource-list-host'
  }
})
export class ResourceListComponent<T extends { id?: number | string }> {
  // Input signals
  config = input.required<ResourceListConfig<T>>();
  data = input<T[]>([]);
  loading = input<boolean>(false);
  dialogMode = input<'view' | 'edit' | 'create'>('create');
  selectedItem = input<T | null>(null);
  showDialog = input<boolean>(false);
  
  // Output signals
  action = output<ResourceAction<T>>();
  dialogShown = output<void>();
  showDialogChange = output<boolean>();

  // Content child
  columnTemplate = contentChild<TemplateRef<any>>('columnTemplate');

  // Services
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  searchQuery = signal('');

  // Use effect to sync data input to internal signal
  private dataEffect = effect(() => {
    const currentData = this.data();
    this.dataSignal.set(currentData);
  });
  
  // Internal signal to track data changes
  private dataSignal = signal<T[]>([]);

  filteredData = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const dataList = this.dataSignal();
    const currentConfig = this.config();
    
    console.log('Filtering data:', { query, dataLength: dataList.length, data: dataList });
    
    if (!query || !currentConfig.searchFields) return dataList;
    
    return dataList.filter(item => 
      currentConfig.searchFields!.some(field => {
        const value = this.getFieldValue(item, field);
        return value?.toString().toLowerCase().includes(query);
      })
    );
  });

  currentPageReportTemplate = computed(() => {
    const entityName = this.config().entityName || 'items';
    return `Showing {first} to {last} of {totalRecords} ${entityName}`;
  });

  dialogHeader = computed(() => {
    const entitySingular = this.config().entityNameSingular || 'Item';
    switch (this.dialogMode()) {
      case 'view': return `View ${entitySingular}`;
      case 'edit': return `Edit ${entitySingular}`;
      case 'create': return `Create ${entitySingular}`;
    }
  });

  columnCount = computed(() => {
    return this.config().columns.length + (this.config().actions ? 1 : 0);
  });

  onCreateNew() {
    this.action.emit({ type: 'create' });
  }

  onAction(type: string, item: T) {
    if (type === 'delete') {
      this.confirmDelete(item);
    } else {
      this.action.emit({ type, item });
    }
  }

  confirmDelete(item: T) {
    const message = this.config().deleteConfirmMessage?.(item) || 
      `Are you sure you want to delete this ${this.config().entityNameSingular || 'item'}?`;
    
    this.confirmationService.confirm({
      message,
      header: this.config().deleteConfirmHeader || 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      acceptLabel: 'Delete Permanently',
      rejectLabel: 'Cancel',
      accept: () => {
        this.action.emit({ type: 'delete', item });
      }
    });
  }

  onDialogShow() {
    this.dialogShown.emit();
  }

  onDialogVisibilityChange(visible: boolean) {
    this.showDialogChange.emit(visible);
  }

  getFieldValue(item: any, field: string): any {
    const keys = field.split('.');
    let value = item;
    
    for (const key of keys) {
      value = value?.[key];
    }
    
    return value;
  }

  showSuccessMessage(message: string) {
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: message
    });
  }

  showErrorMessage(message: string) {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: message
    });
  }
}