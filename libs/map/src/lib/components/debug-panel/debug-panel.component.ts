import { Component, OnInit, OnDestroy, Inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DebugLogService, DebugLogEntry } from '../../services/debug-log.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'lib-debug-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div #debugPanel class="debug-panel" [class.expanded]="isExpanded" *ngIf="isExpanded" 
         [style.left.px]="position.x" 
         [style.top.px]="position.y"
         [style.width.px]="size.width"
         [style.height.px]="size.height">
      <!-- Expanded panel state -->
      <div class="debug-header" 
           (mousedown)="onMouseDown($event)"
           style="background: #f0f0f0 !important; color: #333 !important;">
        <span class="debug-title">
          <i class="pi pi-arrows-alt drag-handle" title="Drag to move"></i>
          🐛 Debug Console
          <span class="log-count" *ngIf="logs.length > 0">({{ logs.length }})</span>
        </span>
        <button class="toggle-btn" (click)="toggleExpand()">
          {{ isExpanded ? '▼' : '▲' }}
        </button>
      </div>
      
      <div class="debug-content">
        <!-- Resize handles -->
        <div class="resize-handle resize-right" (mousedown)="onResizeStart($event, 'right')"></div>
        <div class="resize-handle resize-bottom" (mousedown)="onResizeStart($event, 'bottom')"></div>
        <div class="resize-handle resize-corner" (mousedown)="onResizeStart($event, 'corner')"></div>
        <div class="debug-controls">
          <button class="clear-btn" (click)="clearLogs()">
            🗑️ Clear
          </button>
          <div class="filters">
            <label class="filter-checkbox">
              <input type="checkbox" [(ngModel)]="showInfo" />
              Info
            </label>
            <label class="filter-checkbox">
              <input type="checkbox" [(ngModel)]="showWarn" />
              Warn
            </label>
            <label class="filter-checkbox">
              <input type="checkbox" [(ngModel)]="showError" />
              Error
            </label>
            <label class="filter-checkbox">
              <input type="checkbox" [(ngModel)]="showSuccess" />
              Success
            </label>
          </div>
        </div>
        
        <div class="log-container">
          <div class="log-entry" 
               *ngFor="let log of filteredLogs" 
               [class.info]="log.level === 'info'"
               [class.warn]="log.level === 'warn'"
               [class.error]="log.level === 'error'"
               [class.success]="log.level === 'success'">
            <div class="log-content">
              <span class="log-time">{{ formatTime(log.timestamp) }}</span>
              <span class="log-level" [class]="log.level">{{ log.level.toUpperCase() }}</span>
              <span class="log-category">[{{ log.category }}]</span>
              <span class="log-message">{{ log.message }}</span>
              <pre class="log-details" *ngIf="log.details">{{ formatDetails(log.details) }}</pre>
            </div>
            <button class="copy-btn" 
                    (click)="copyLogEntry(log)" 
                    title="Copy log entry">
              📋
            </button>
          </div>
          
          <div class="no-logs" *ngIf="filteredLogs.length === 0">
            No debug logs to display
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .debug-panel {
      position: fixed;
      background: rgba(255, 255, 255, 0.98);
      border: 2px solid #007acc;
      border-radius: 8px;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
      z-index: 999999;
      transition: box-shadow 0.2s ease;
      pointer-events: auto;
      user-select: none;
      min-width: 300px;
      min-height: 200px;
      display: flex;
      flex-direction: column;
    }

    .debug-panel.dragging,
    .debug-panel.resizing {
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
      transition: none;
    }

    .debug-header {
      padding: 12px 16px;
      cursor: move;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8f9fa;
      border-bottom: 1px solid #ddd;
      user-select: none;
      min-height: 48px;
      color: #333;
      font-weight: 600;
      border-radius: 6px 6px 0 0;
    }

    .debug-header:hover {
      background: #e9ecef;
    }

    .drag-handle {
      margin-right: 8px;
      color: #6c757d;
      font-size: 12px;
    }

    .debug-title {
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .log-count {
      color: var(--text-color-secondary);
      font-weight: normal;
    }

    .toggle-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      color: var(--text-color);
      z-index: 1;
      position: relative;
    }

    .toggle-btn:hover {
      background: rgba(0, 0, 0, 0.1);
      border-radius: 4px;
    }

    .debug-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: white;
      border-radius: 0 0 6px 6px;
      position: relative;
      overflow: hidden;
    }

    .debug-controls {
      padding: 8px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--surface-border);
      background: var(--surface-ground);
    }

    .clear-btn {
      background: var(--primary-color);
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 14px;
    }

    .clear-btn:hover {
      background: var(--primary-600);
    }

    .filters {
      display: flex;
      gap: 16px;
    }

    .filter-checkbox {
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      font-size: 14px;
    }

    .filter-checkbox input {
      cursor: pointer;
    }

    .log-container {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
      font-family: 'Monaco', 'Consolas', monospace;
      font-size: 11px;
      line-height: 1.4;
    }

    .log-entry {
      padding: 4px 8px;
      border-radius: 4px;
      margin-bottom: 2px;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
      word-break: break-word;
      user-select: text;
      cursor: text;
    }

    .log-entry:hover .copy-btn {
      opacity: 1;
    }

    .log-content {
      flex: 1;
      display: flex;
      align-items: flex-start;
      gap: 8px;
      flex-wrap: wrap;
    }

    .log-entry.info {
      background: rgba(33, 150, 243, 0.1);
    }

    .log-entry.warn {
      background: rgba(255, 152, 0, 0.1);
    }

    .log-entry.error {
      background: rgba(244, 67, 54, 0.1);
    }

    .log-entry.success {
      background: rgba(76, 175, 80, 0.1);
    }

    .log-time {
      color: var(--text-color-secondary);
      white-space: nowrap;
    }

    .log-level {
      font-weight: bold;
      width: 60px;
      text-align: center;
      border-radius: 3px;
      padding: 0 4px;
    }

    .log-level.info {
      color: #2196F3;
    }

    .log-level.warn {
      color: #FF9800;
    }

    .log-level.error {
      color: #F44336;
    }

    .log-level.success {
      color: #4CAF50;
    }

    .log-category {
      color: var(--primary-color);
      font-weight: 600;
    }

    .log-message {
      flex: 1;
      color: var(--text-color);
    }

    .log-details {
      margin: 4px 0 0 0;
      padding: 4px;
      background: var(--surface-50);
      border-radius: 3px;
      font-size: 11px;
      color: var(--text-color-secondary);
      overflow-x: auto;
      user-select: text;
      cursor: text;
      width: 100%;
    }

    .copy-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 3px;
      opacity: 0.6;
      transition: opacity 0.2s ease, background-color 0.2s ease;
      font-size: 12px;
      line-height: 1;
      user-select: none;
      flex-shrink: 0;
      height: fit-content;
    }

    .copy-btn:hover {
      opacity: 1;
      background: rgba(0, 0, 0, 0.1);
    }

    .copy-btn:active {
      transform: scale(0.95);
    }

    .no-logs {
      text-align: center;
      color: var(--text-color-secondary);
      padding: 20px;
    }

    .resize-handle {
      position: absolute;
      background: transparent;
    }

    .resize-right {
      top: 0;
      right: 0;
      width: 8px;
      height: 100%;
      cursor: ew-resize;
    }

    .resize-bottom {
      bottom: 0;
      left: 0;
      width: 100%;
      height: 8px;
      cursor: ns-resize;
    }

    .resize-corner {
      bottom: 0;
      right: 0;
      width: 16px;
      height: 16px;
      cursor: nw-resize;
      background: linear-gradient(-45deg, transparent 0%, transparent 30%, #ccc 30%, #ccc 35%, transparent 35%, transparent 65%, #ccc 65%, #ccc 70%, transparent 70%);
    }

    .resize-handle:hover {
      background-color: rgba(0, 122, 204, 0.2);
    }

    .resize-corner:hover {
      background: linear-gradient(-45deg, rgba(0, 122, 204, 0.2) 0%, rgba(0, 122, 204, 0.2) 30%, #007acc 30%, #007acc 35%, rgba(0, 122, 204, 0.2) 35%, rgba(0, 122, 204, 0.2) 65%, #007acc 65%, #007acc 70%, rgba(0, 122, 204, 0.2) 70%);
    }

    :host {
      display: block;
      position: relative;
      z-index: 999999;
    }
  `]
})
export class DebugPanelComponent implements OnInit, OnDestroy {
  @ViewChild('debugPanel', { static: false }) debugPanel!: ElementRef<HTMLDivElement>;
  
  isExpanded = false;
  logs: DebugLogEntry[] = [];
  showInfo = true;
  showWarn = true;
  showError = true;
  showSuccess = true;
  
  position = { x: 20, y: 80 }; // Default position
  size = { width: 400, height: 400 }; // Default size
  private isDragging = false;
  private isResizing = false;
  private resizeDirection = '';
  private dragOffset = { x: 0, y: 0 };
  private resizeStartSize = { width: 0, height: 0 };
  private resizeStartPos = { x: 0, y: 0 };
  private destroy$ = new Subject<void>();
  private toggleListener?: () => void;
  private mouseMoveListener?: (e: MouseEvent) => void;
  private mouseUpListener?: () => void;

  constructor(
    private debugLogService: DebugLogService,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit() {
    this.debugLogService.logs$
      .pipe(takeUntil(this.destroy$))
      .subscribe(logs => {
        this.logs = logs;
      });
      
    // Load saved position and size
    this.loadSettings();
      
    // Add initial log for visibility testing
    this.debugLogService.info('Debug Panel', 'Debug panel initialized and ready');

    // Listen for toggle events from topbar
    this.toggleListener = () => this.toggleExpand();
    this.document.defaultView?.addEventListener('toggle-debug-console', this.toggleListener);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Clean up event listeners
    if (this.toggleListener) {
      this.document.defaultView?.removeEventListener('toggle-debug-console', this.toggleListener);
    }
    this.removeDragListeners();
  }

  toggleExpand() {
    this.isExpanded = !this.isExpanded;
  }

  onMouseDown(event: MouseEvent) {
    // Don't start dragging if clicking the toggle button or resize handles
    const target = event.target as HTMLElement;
    if (target.classList.contains('toggle-btn') || target.classList.contains('resize-handle')) {
      return;
    }
    
    event.preventDefault();
    this.isDragging = true;
    
    const rect = this.debugPanel.nativeElement.getBoundingClientRect();
    this.dragOffset = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    
    // Add global mouse listeners
    this.mouseMoveListener = (e: MouseEvent) => this.onMouseMove(e);
    this.mouseUpListener = () => this.onMouseUp();
    
    this.document.addEventListener('mousemove', this.mouseMoveListener);
    this.document.addEventListener('mouseup', this.mouseUpListener);
    
    // Add dragging class for visual feedback
    this.debugPanel.nativeElement.classList.add('dragging');
  }

  onResizeStart(event: MouseEvent, direction: string) {
    event.preventDefault();
    event.stopPropagation();
    
    this.isResizing = true;
    this.resizeDirection = direction;
    
    this.resizeStartSize = { ...this.size };
    this.resizeStartPos = { x: event.clientX, y: event.clientY };
    
    // Add global mouse listeners
    this.mouseMoveListener = (e: MouseEvent) => this.onMouseMove(e);
    this.mouseUpListener = () => this.onMouseUp();
    
    this.document.addEventListener('mousemove', this.mouseMoveListener);
    this.document.addEventListener('mouseup', this.mouseUpListener);
    
    // Add resizing class for visual feedback
    this.debugPanel.nativeElement.classList.add('resizing');
  }

  onMouseMove(event: MouseEvent) {
    if (!this.isDragging && !this.isResizing) return;
    
    event.preventDefault();
    
    if (this.isDragging) {
      // Calculate new position
      const newX = event.clientX - this.dragOffset.x;
      const newY = event.clientY - this.dragOffset.y;
      
      // Keep panel within viewport bounds
      const viewport = {
        width: this.document.defaultView!.innerWidth,
        height: this.document.defaultView!.innerHeight
      };
      
      this.position = {
        x: Math.max(0, Math.min(newX, viewport.width - this.size.width)),
        y: Math.max(0, Math.min(newY, viewport.height - this.size.height))
      };
    } else if (this.isResizing) {
      // Calculate resize deltas
      const deltaX = event.clientX - this.resizeStartPos.x;
      const deltaY = event.clientY - this.resizeStartPos.y;
      
      // Minimum size constraints
      const minWidth = 300;
      const minHeight = 200;
      
      // Maximum size constraints (viewport bounds)
      const viewport = {
        width: this.document.defaultView!.innerWidth,
        height: this.document.defaultView!.innerHeight
      };
      
      const maxWidth = viewport.width - this.position.x;
      const maxHeight = viewport.height - this.position.y;
      
      // Apply resize based on direction
      switch (this.resizeDirection) {
        case 'right':
          this.size.width = Math.min(maxWidth, Math.max(minWidth, this.resizeStartSize.width + deltaX));
          break;
        case 'bottom':
          this.size.height = Math.min(maxHeight, Math.max(minHeight, this.resizeStartSize.height + deltaY));
          break;
        case 'corner':
          this.size.width = Math.min(maxWidth, Math.max(minWidth, this.resizeStartSize.width + deltaX));
          this.size.height = Math.min(maxHeight, Math.max(minHeight, this.resizeStartSize.height + deltaY));
          break;
      }
    }
  }

  onMouseUp() {
    if (!this.isDragging && !this.isResizing) return;
    
    this.isDragging = false;
    this.isResizing = false;
    this.resizeDirection = '';
    this.removeDragListeners();
    
    // Remove visual feedback classes
    this.debugPanel.nativeElement.classList.remove('dragging', 'resizing');
    
    // Save position and size
    this.saveSettings();
  }

  private removeDragListeners() {
    if (this.mouseMoveListener) {
      this.document.removeEventListener('mousemove', this.mouseMoveListener);
      this.mouseMoveListener = undefined;
    }
    if (this.mouseUpListener) {
      this.document.removeEventListener('mouseup', this.mouseUpListener);
      this.mouseUpListener = undefined;
    }
  }

  private loadSettings() {
    try {
      const savedSettings = localStorage.getItem('debug-panel-settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        this.position = settings.position || { x: 20, y: 80 };
        this.size = settings.size || { width: 400, height: 400 };
      }
    } catch (error) {
      console.warn('Failed to load debug panel settings:', error);
    }
  }

  private saveSettings() {
    try {
      const settings = {
        position: this.position,
        size: this.size
      };
      localStorage.setItem('debug-panel-settings', JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to save debug panel settings:', error);
    }
  }

  clearLogs() {
    this.debugLogService.clear();
  }

  get filteredLogs(): DebugLogEntry[] {
    return this.logs.filter(log => {
      switch (log.level) {
        case 'info': return this.showInfo;
        case 'warn': return this.showWarn;
        case 'error': return this.showError;
        case 'success': return this.showSuccess;
        default: return true;
      }
    });
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  }

  formatDetails(details: any): string {
    if (typeof details === 'string') return details;
    return JSON.stringify(details, null, 2);
  }

  async copyLogEntry(log: DebugLogEntry) {
    const logText = this.formatLogEntryForCopy(log);
    
    try {
      await navigator.clipboard.writeText(logText);
      
      // Show brief feedback
      this.debugLogService.success('Debug Panel', 'Log entry copied to clipboard');
    } catch (error) {
      console.warn('Failed to copy to clipboard:', error);
      
      // Fallback for older browsers
      this.fallbackCopyTextToClipboard(logText);
    }
  }

  private formatLogEntryForCopy(log: DebugLogEntry): string {
    const time = this.formatTime(log.timestamp);
    const level = log.level.toUpperCase();
    const category = log.category;
    const message = log.message;
    
    let result = `[${time}] ${level} [${category}] ${message}`;
    
    if (log.details) {
      const details = this.formatDetails(log.details);
      result += `\nDetails:\n${details}`;
    }
    
    return result;
  }

  private fallbackCopyTextToClipboard(text: string) {
    const textArea = this.document.createElement('textarea');
    textArea.value = text;
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';

    this.document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = this.document.execCommand('copy');
      if (successful) {
        this.debugLogService.success('Debug Panel', 'Log entry copied to clipboard');
      } else {
        this.debugLogService.warn('Debug Panel', 'Failed to copy log entry');
      }
    } catch (err) {
      this.debugLogService.error('Debug Panel', 'Copy operation failed', err);
    }

    this.document.body.removeChild(textArea);
  }
}