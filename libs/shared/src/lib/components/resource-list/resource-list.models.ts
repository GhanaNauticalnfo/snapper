import { TemplateRef } from '@angular/core';

export interface ResourceListConfig<T> {
  // Display configuration
  title: string;
  searchPlaceholder: string;
  newButtonLabel: string;
  
  // Entity naming for messages
  entityName?: string; // plural, e.g., 'landing sites'
  entityNameSingular?: string; // singular, e.g., 'landing site'
  
  // Table columns
  columns: ColumnConfig[];
  
  // Search configuration
  searchFields?: string[]; // Fields to search in
  
  // Actions
  actions?: {
    view?: boolean;
    edit?: boolean;
    delete?: boolean;
    custom?: CustomAction[];
  };
  
  // Messages
  deleteConfirmMessage?: (item: T) => string;
  deleteConfirmHeader?: string;
  emptyMessage?: string;
  
  // Pagination
  pageSize?: number;
  pageSizeOptions?: number[];
}

export interface ColumnConfig {
  field: string;
  header: string;
  sortable?: boolean;
  template?: TemplateRef<any>;
  width?: string;
}

export interface CustomAction {
  key: string;
  icon: string;
  tooltip: string;
  styleClass?: string;
}

export interface ResourceAction<T> {
  type: string;
  item?: T;
}

export interface ResourceService<T, CreateDto, UpdateDto> {
  getAll(): Promise<T[]> | any; // Observable or Promise
  getOne(id: number | string): Promise<T> | any;
  create(data: CreateDto): Promise<T> | any;
  update(id: number | string, data: UpdateDto): Promise<T> | any;
  delete(id: number | string): Promise<void> | any;
}