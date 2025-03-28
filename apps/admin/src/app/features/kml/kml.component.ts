// features/kml/kml.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { KmlDatasetService } from './services/kml-dataset.service';
import { KmlDataset } from './models/kml-dataset.model';

@Component({
  selector: 'app-kml',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  template: `
    <div class="kml-container">
      <h1>KML Management</h1>
      
      <div *ngIf="loading" class="loading-message">Loading KML datasets...</div>
      <div *ngIf="error" class="error-message">Error: {{ error }}</div>
      
      <table *ngIf="datasets.length > 0 && !loading" class="kml-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Enabled</th>
            <th>Last Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let dataset of datasets">
            <td>{{ dataset.id }}</td>
            <td>{{ dataset.name }}</td>
            <td>{{ dataset.enabled ? 'Yes' : 'No' }}</td>
            <td>{{ dataset.last_updated | date:'medium' }}</td>
            <td class="action-buttons">
              <button class="btn btn-view" (click)="viewKml(dataset)">View</button>
              <button class="btn btn-edit" (click)="editKml(dataset)">Edit</button>
              <button class="btn btn-delete" (click)="deleteKml(dataset.id)">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div *ngIf="datasets.length === 0 && !loading && !error" class="empty-state">
        No KML datasets found. Add one to get started.
      </div>
    </div>
  `,
  styles: [`
    .kml-container {
      padding: 20px;
      background-color: #f8f9fa;
      min-height: calc(100vh - 40px);
      color: #333;
    }
    
    h1 {
      margin-bottom: 20px;
      color: #333;
      font-weight: 500;
    }
    
    .kml-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      background: white;
      color: #333;
    }
    
    .kml-table th, .kml-table td {
      border: 1px solid #e9ecef;
      padding: 12px 15px;
      text-align: left;
      color: #333;
    }
    
    .kml-table th {
      background-color: #f1f3f5;
      color: #333;
      font-weight: 500;
      position: sticky;
      top: 0;
    }
    
    .kml-table tr:nth-child(even) {
      background-color: #f8f9fa;
    }
    
    .kml-table tr:hover {
      background-color: #e9ecef;
    }
    
    .action-buttons {
      white-space: nowrap;
    }
    
    .btn {
      margin-right: 8px;
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      transition: background-color 0.2s;
    }
    
    .btn-view {
      background-color: #6c757d;
      color: white;
    }
    
    .btn-view:hover {
      background-color: #5a6268;
    }
    
    .btn-edit {
      background-color: #007bff;
      color: white;
    }
    
    .btn-edit:hover {
      background-color: #0069d9;
    }
    
    .btn-delete {
      background-color: #dc3545;
      color: white;
    }
    
    .btn-delete:hover {
      background-color: #c82333;
    }
    
    .loading-message {
      padding: 20px;
      background-color: #e9ecef;
      border-radius: 4px;
      text-align: center;
      color: #333;
    }
    
    .error-message {
      padding: 20px;
      background-color: #f8d7da;
      color: #721c24;
      border-radius: 4px;
      text-align: center;
    }
    
    .empty-state {
      padding: 40px;
      background-color: #e9ecef;
      border-radius: 4px;
      text-align: center;
      color: #6c757d;
    }
  `],
  providers: [KmlDatasetService]
})
export class KmlComponent implements OnInit {
  datasets: KmlDataset[] = [];
  loading = false;
  error: string | null = null;

  constructor(private kmlDatasetService: KmlDatasetService) {}

  ngOnInit(): void {
    this.loadDatasets();
  }

  loadDatasets(): void {
    this.loading = true;
    this.error = null;
    
    this.kmlDatasetService.getAll().subscribe({
      next: (data) => {
        this.datasets = data;
        this.loading = false;
        console.log('KML Datasets loaded:', this.datasets);
      },
      error: (err) => {
        this.error = 'Failed to load KML datasets. Please try again later.';
        this.loading = false;
        console.error('Error loading KML datasets:', err);
      }
    });
  }

  viewKml(dataset: KmlDataset): void {
    console.log('View KML:', dataset);
    // Implement view functionality
  }

  editKml(dataset: KmlDataset): void {
    console.log('Edit KML:', dataset);
    // Implement edit functionality
  }

  deleteKml(id: number): void {
    if (confirm('Are you sure you want to delete this KML dataset?')) {
      this.kmlDatasetService.delete(id).subscribe({
        next: () => {
          this.datasets = this.datasets.filter(dataset => dataset.id !== id);
          console.log('KML Dataset deleted:', id);
        },
        error: (err) => {
          console.error('Error deleting KML dataset:', err);
          alert('Failed to delete KML dataset. Please try again later.');
        }
      });
    }
  }
}