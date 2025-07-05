import { Component, Input, Output, EventEmitter, signal, computed, OnInit, TemplateRef, ContentChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface SearchDropdownItem {
  id: string | number;
  [key: string]: any;
}

export interface SearchDropdownConfig {
  placeholder?: string;
  searchFields?: string[];
  maxResults?: number;
  showKeyboardHints?: boolean;
  noResultsText?: string;
  loadingText?: string;
}

@Component({
  selector: 'lib-search-dropdown',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="search-container">
      <div class="search-input-wrapper">
        <i class="pi pi-search search-icon"></i>
        <input 
          type="text" 
          [(ngModel)]="searchTerm"
          (input)="onSearchInput($event)"
          (keydown)="onKeyDown($event)"
          (focus)="showDropdown.set(true)"
          (blur)="onBlur()"
          [placeholder]="placeholder"
          class="search-input"
        />
        @if (searchTerm) {
          <i class="pi pi-times clear-icon" (click)="clearSearch()"></i>
        }
      </div>
      
      @if (showDropdown() && filteredItems().length > 0) {
        <div class="dropdown">
          @for (item of filteredItems(); track item.id; let i = $index) {
            <div 
              class="dropdown-item"
              [class.selected]="selectedIndex() === i"
              (mousedown)="selectItem(item)"
              (mouseenter)="selectedIndex.set(i)"
            >
              <ng-container 
                *ngTemplateOutlet="itemTemplate; context: { $implicit: item, index: i, selected: selectedIndex() === i }"
              ></ng-container>
            </div>
          }
          @if (config.showKeyboardHints) {
            <div class="keyboard-hints">
              <span class="hint"><kbd>↵</kbd> to select</span>
              <span class="hint"><kbd>↓</kbd><kbd>↑</kbd> to navigate</span>
              <span class="hint"><kbd>esc</kbd> to close</span>
            </div>
          }
        </div>
      }
      
      @if (showDropdown() && searchTerm && filteredItems().length === 0 && !isLoading) {
        <div class="dropdown">
          <div class="dropdown-item no-results">
            <i class="pi pi-exclamation-circle"></i>
            {{ config.noResultsText || 'No results found' }} "{{ searchTerm }}"
          </div>
        </div>
      }
      
      @if (isLoading) {
        <div class="dropdown">
          <div class="dropdown-item loading">
            <i class="pi pi-spin pi-spinner"></i>
            {{ config.loadingText || 'Loading...' }}
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .search-container {
      position: relative;
      width: 320px;
      z-index: 1000;
    }
    
    .search-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    
    .search-input {
      width: 100%;
      padding: 12px 45px 12px 40px;
      border: 2px solid #e1e5e9;
      border-radius: 8px;
      font-size: 14px;
      background: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: all 0.2s ease;
      font-family: inherit;
    }
    
    .search-input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 4px 8px rgba(59, 130, 246, 0.15);
    }
    
    .search-icon {
      position: absolute;
      left: 12px;
      color: #6b7280;
      pointer-events: none;
      z-index: 1;
    }
    
    .clear-icon {
      position: absolute;
      right: 12px;
      color: #6b7280;
      cursor: pointer;
      z-index: 1;
      transition: color 0.2s ease;
    }
    
    .clear-icon:hover {
      color: #374151;
    }
    
    .dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      border: 1px solid #e1e5e9;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.15);
      max-height: 400px;
      overflow-y: auto;
      margin-top: 4px;
      z-index: 1001;
    }
    
    .dropdown-item {
      padding: 16px;
      cursor: pointer;
      border-bottom: 1px solid #f3f4f6;
      transition: background-color 0.2s ease;
    }
    
    .dropdown-item:hover,
    .dropdown-item.selected {
      background-color: #f8fafc;
    }
    
    .dropdown-item.selected {
      background-color: #dbeafe;
      border-left: 3px solid #2563eb;
    }
    
    .dropdown-item:last-child {
      border-bottom: none;
    }
    
    .no-results, .loading {
      color: #6b7280;
      font-style: italic;
      cursor: default;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .no-results:hover, .loading:hover {
      background-color: transparent;
    }
    
    .loading i {
      color: #3b82f6;
    }
    
    .keyboard-hints {
      display: flex;
      justify-content: center;
      gap: 16px;
      padding: 12px 16px;
      background-color: #f9fafb;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;
    }
    
    .hint {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    kbd {
      background-color: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 3px;
      padding: 2px 6px;
      font-family: monospace;
      font-size: 11px;
      color: #374151;
      min-width: 18px;
      text-align: center;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
  `]
})
export class SearchDropdownComponent<T extends SearchDropdownItem> implements OnInit {
  @Input() items: T[] = [];
  @Input() config: SearchDropdownConfig = {};
  @Input() isLoading = false;
  @Input() itemTemplate!: TemplateRef<any>;
  
  @Output() itemSelected = new EventEmitter<T>();
  @Output() searchChanged = new EventEmitter<string>();
  
  searchTerm = '';
  showDropdown = signal(false);
  selectedIndex = signal(-1);
  filteredItems = signal<T[]>([]);
  
  get placeholder(): string {
    return this.config.placeholder || 'Search...';
  }
  
  ngOnInit() {
    this.filterItems();
  }
  
  onSearchInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchTerm = target.value;
    this.showDropdown.set(true);
    this.selectedIndex.set(-1);
    this.filterItems();
    this.searchChanged.emit(this.searchTerm);
  }

  onKeyDown(event: KeyboardEvent) {
    const items = this.filteredItems();
    
    if (!this.showDropdown() || items.length === 0) return;
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        const nextIndex = Math.min(this.selectedIndex() + 1, items.length - 1);
        this.selectedIndex.set(nextIndex);
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        const prevIndex = Math.max(this.selectedIndex() - 1, -1);
        this.selectedIndex.set(prevIndex);
        break;
        
      case 'Enter':
        event.preventDefault();
        const selectedIdx = this.selectedIndex();
        if (selectedIdx >= 0 && selectedIdx < items.length) {
          this.selectItem(items[selectedIdx]);
        }
        break;
        
      case 'Escape':
        event.preventDefault();
        this.showDropdown.set(false);
        this.selectedIndex.set(-1);
        break;
    }
  }
  
  private filterItems() {
    if (!this.searchTerm.trim()) {
      this.filteredItems.set([]);
      return;
    }
    
    const term = this.searchTerm.toLowerCase();
    const searchFields = this.config.searchFields || ['name'];
    const maxResults = this.config.maxResults || 10;
    
    const filtered = this.items.filter(item => {
      return searchFields.some(field => {
        const value = item[field];
        return value && value.toString().toLowerCase().includes(term);
      });
    }).slice(0, maxResults);
    
    this.filteredItems.set(filtered);
  }
  
  onBlur() {
    // Delay hiding dropdown to allow click events
    setTimeout(() => {
      this.showDropdown.set(false);
      this.selectedIndex.set(-1);
    }, 200);
  }
  
  clearSearch() {
    this.searchTerm = '';
    this.showDropdown.set(false);
    this.selectedIndex.set(-1);
    this.filterItems();
    this.searchChanged.emit('');
  }
  
  selectItem(item: T) {
    this.showDropdown.set(false);
    this.selectedIndex.set(-1);
    this.itemSelected.emit(item);
  }
}