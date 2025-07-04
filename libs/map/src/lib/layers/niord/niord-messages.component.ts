// libs/map/src/lib/layers/niord/niord-messages.component.ts
import { Component, computed, effect, signal, inject, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { DestroyRef } from '@angular/core';
// Import from shared models library
import { NiordMessage, NiordResponse } from '@ghanawaters/shared-models';

@Component({
  selector: 'lib-niord-messages',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="container">
      <h2>Niord Messages</h2>
      
      @if (messagesResource.isLoading()) {
        <div class="loading">
          Loading messages...
        </div>
      }
      
      @if (messagesResource.error()) {
        <div class="error">
          Error loading messages: {{ messagesResource.error()?.toString() }}
        </div>
      }

      @if (messages().length) {
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Short ID</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            @for (message of messages(); track message.id) {
              <tr>
                <td>{{ message.id }}</td>
                <td>{{ message.shortId }}</td>
                <td>{{ message.created | date:'ISO' }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
      
      <div class="footer">
        <p>Last updated: {{ lastUpdated() | date:'medium' }}</p>
        <p>Auto-refresh: 
          <button (click)="toggleAutoRefresh()" [class.active]="isAutoRefreshEnabled()">
            {{ isAutoRefreshEnabled() ? 'On' : 'Off' }}
          </button>
          <button (click)="refreshMessages()">Refresh Now</button>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .container {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    
    th {
      background-color: #f2f2f2;
      font-weight: bold;
    }
    
    tr:hover {
      background-color: #f5f5f5;
    }
    
    .loading {
      padding: 20px;
      text-align: center;
      font-style: italic;
      color: #666;
    }
    
    .error {
      padding: 20px;
      text-align: center;
      color: #d9534f;
      background-color: #f9eaea;
      border-radius: 4px;
      margin: 20px 0;
    }
    
    .footer {
      margin-top: 20px;
      font-size: 0.8em;
      color: #777;
      text-align: right;
    }
    
    button {
      margin-left: 8px;
      padding: 6px 12px;
      background-color: #f0f0f0;
      color: #333;
      border: 1px solid #ccc;
      border-radius: 4px;
      cursor: pointer;
    }
    
    button:hover {
      background-color: #e0e0e0;
    }
    
    button.active {
      background-color: #4CAF50;
      color: white;
      border-color: #4CAF50;
    }
  `]
})
export class NiordMessagesComponent {
  @Input() apiUrl = '/api/messages';
  @Input() refreshInterval = 60000; // 1 minute

  private refreshTimer: number | null = null;
  private destroyRef = inject(DestroyRef);
  
  // Create a signal for tracking last update time
  lastUpdated = signal<Date>(new Date());
  isAutoRefreshEnabled = signal<boolean>(true);
  
  // Create the httpResource for fetching messages
  messagesResource = httpResource<NiordResponse>(
    this.apiUrl,
    {
      parse: (response: unknown) => {
        // The API might return the array directly or wrapped in a data property
        if (Array.isArray(response)) {
          return { data: response as NiordMessage[] };
        } else if (response && typeof response === 'object' && 'data' in response) {
          return response as NiordResponse;
        }
        // Default fallback
        return { data: [] };
      },
      defaultValue: { data: [] }
    }
  );
  
  // Derived computed signal for the messages array
  messages = computed(() => this.messagesResource.value()?.data || []);
  
  constructor() {
    // Set up effect to update lastUpdated when the resource value changes
    effect(() => {
      // Access the value to create a dependency
      const _ = this.messagesResource.value();
      // Update the last updated timestamp
      this.lastUpdated.set(new Date());
    });

    // Set up the auto-refresh if enabled
    if (this.isAutoRefreshEnabled()) {
      this.startAutoRefresh();
    }
    
    // Ensure cleanup when component is destroyed
    this.destroyRef.onDestroy(() => {
      this.stopAutoRefresh();
    });
  }
  
  // Toggle auto-refresh on/off
  toggleAutoRefresh() {
    const newState = !this.isAutoRefreshEnabled();
    this.isAutoRefreshEnabled.set(newState);
    
    if (newState) {
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
    }
  }
  
  // Start auto-refresh timer
  private startAutoRefresh() {
    // Clear any existing timer first
    this.stopAutoRefresh();
    
    // Set a new timer for refresh
    this.refreshTimer = window.setTimeout(() => {
      this.refreshMessages();
      // Schedule next refresh only if auto-refresh is still enabled
      if (this.isAutoRefreshEnabled()) {
        this.startAutoRefresh();
      }
    }, this.refreshInterval);
  }
  
  // Stop auto-refresh timer
  private stopAutoRefresh() {
    if (this.refreshTimer !== null) {
      window.clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
  
  // Refresh messages data
  refreshMessages() {
    this.messagesResource.reload();
  }
}