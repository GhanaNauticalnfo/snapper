import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SkeletonModule } from 'primeng/skeleton';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TreeStubService } from './services/tree-stub.service';
import { TreeStubGroupResponseDto, TreeStubGroupInputDto } from '@ghanawaters/shared-models';

@Component({
  selector: 'app-tree-stubs',
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
    CheckboxModule
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="tree-stubs-container">
      <div class="page-header">
        <h2>Tree Stubs</h2>
      </div>
      
      <div class="flex justify-between items-center mb-4">
        <h3>Groups</h3>
        <button 
          pButton 
          type="button" 
          label="New Group" 
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
            placeholder="Search groups..." 
            class="w-full">
        </span>
      </div>

      <p-table 
        [value]="filteredGroups()" 
        [loading]="loading()"
        [paginator]="true" 
        [rows]="10"
        [showCurrentPageReport]="true"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} groups"
        styleClass="p-datatable-gridlines">
        
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="name">
              Name <p-sortIcon field="name"></p-sortIcon>
            </th>
            <th pSortableColumn="tree_stub_count">
              Tree Stubs <p-sortIcon field="tree_stub_count"></p-sortIcon>
            </th>
            <th pSortableColumn="enabled">
              Status <p-sortIcon field="enabled"></p-sortIcon>
            </th>
            <th pSortableColumn="updated_at">
              Last Updated <p-sortIcon field="updated_at"></p-sortIcon>
            </th>
            <th>Actions</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-group>
          <tr>
            <td>{{ group.name }}</td>
            <td>
              <p-tag 
                [value]="group.tree_stub_count + ' stubs'" 
                severity="info">
              </p-tag>
            </td>
            <td>
              <p-tag 
                [value]="group.enabled ? 'Active' : 'Inactive'" 
                [severity]="group.enabled ? 'success' : 'danger'">
              </p-tag>
            </td>
            <td>{{ group.updated_at | date:'short' }}</td>
            <td>
              <button 
                pButton 
                type="button" 
                icon="pi pi-map" 
                class="p-button-text p-button-info mr-1"
                (click)="openEditor(group)"
                pTooltip="Edit Stubs">
              </button>
              <button 
                pButton 
                type="button" 
                icon="pi pi-pencil" 
                class="p-button-text p-button-warning mr-1"
                (click)="editGroup(group)"
                pTooltip="Edit Group">
              </button>
              <button 
                pButton 
                type="button" 
                icon="pi pi-trash" 
                class="p-button-text p-button-danger"
                (click)="confirmDelete(group)"
                pTooltip="Delete">
              </button>
            </td>
          </tr>
        </ng-template>

        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="5" class="text-center">
              @if (loading()) {
                <div class="flex flex-col items-center gap-3">
                  @for (i of [1,2,3]; track i) {
                    <p-skeleton width="100%" height="2rem"></p-skeleton>
                  }
                </div>
              } @else {
                No tree stub groups found
              }
            </td>
          </tr>
        </ng-template>
      </p-table>

      <!-- Group Form Dialog -->
      <p-dialog 
        [(visible)]="showDialog" 
        [header]="dialogMode() === 'edit' ? 'Edit Group' : 'Create Group'"
        [modal]="true"
        [style]="{width: '450px'}"
        [draggable]="false"
        [resizable]="false">
        
        <div class="flex flex-column gap-3">
          <div class="field">
            <label for="name">Name</label>
            <input 
              pInputText 
              id="name" 
              [(ngModel)]="selectedGroup.name" 
              class="w-full" 
              placeholder="Enter group name">
          </div>
          
          <div class="field">
            <p-checkbox 
              [(ngModel)]="selectedGroup.enabled" 
              binary="true" 
              label="Enabled"
              inputId="enabled">
            </p-checkbox>
          </div>
        </div>

        <ng-template pTemplate="footer">
          <button 
            pButton 
            type="button" 
            label="Cancel" 
            icon="pi pi-times" 
            class="p-button-text"
            (click)="showDialog = false">
          </button>
          <button 
            pButton 
            type="button" 
            label="Save" 
            icon="pi pi-check" 
            (click)="saveGroup()"
            [disabled]="!selectedGroup.name">
          </button>
        </ng-template>
      </p-dialog>

      <p-confirmDialog></p-confirmDialog>
      <p-toast></p-toast>
    </div>
  `,
  styles: [`
    .tree-stubs-container {
      padding: 0 20px 20px 20px;
    }
  `]
})
export class TreeStubsComponent implements OnInit {
  groups = signal<TreeStubGroupResponseDto[]>([]);
  loading = signal(false);
  searchQuery = '';
  showDialog = false;
  dialogMode = signal<'create' | 'edit'>('create');
  selectedGroup: TreeStubGroupInputDto & { id?: number } = { name: '', enabled: true };

  filteredGroups = signal<TreeStubGroupResponseDto[]>([]);

  constructor(
    private treeStubService: TreeStubService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadGroups();
    // Update filtered groups when search query changes
    this.updateFilteredGroups();
  }

  updateFilteredGroups() {
    // Use effect to automatically update when searchQuery or groups change
    const query = this.searchQuery.toLowerCase();
    const groupList = this.groups();
    
    if (!query) {
      this.filteredGroups.set(groupList);
    } else {
      this.filteredGroups.set(
        groupList.filter(group => 
          group.name.toLowerCase().includes(query)
        )
      );
    }
  }

  loadGroups() {
    this.loading.set(true);
    this.treeStubService.getGroups().subscribe({
      next: (groups) => {
        this.groups.set(groups);
        this.updateFilteredGroups();
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load tree stub groups'
        });
      }
    });
  }

  showCreateDialog() {
    this.selectedGroup = { name: '', enabled: true };
    this.dialogMode.set('create');
    this.showDialog = true;
  }

  editGroup(group: TreeStubGroupResponseDto) {
    this.selectedGroup = { 
      id: group.id,
      name: group.name, 
      enabled: group.enabled 
    };
    this.dialogMode.set('edit');
    this.showDialog = true;
  }

  saveGroup() {
    if (this.dialogMode() === 'create') {
      this.treeStubService.createGroup(this.selectedGroup).subscribe({
        next: (newGroup) => {
          this.groups.update(groups => [...groups, newGroup]);
          this.updateFilteredGroups();
          this.showDialog = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Group created successfully'
          });
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to create group'
          });
        }
      });
    } else if (this.dialogMode() === 'edit' && this.selectedGroup.id) {
      this.treeStubService.updateGroup(this.selectedGroup.id, this.selectedGroup).subscribe({
        next: (updatedGroup) => {
          this.groups.update(groups => 
            groups.map(g => g.id === updatedGroup.id ? updatedGroup : g)
          );
          this.updateFilteredGroups();
          this.showDialog = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Group updated successfully'
          });
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update group'
          });
        }
      });
    }
  }

  confirmDelete(group: TreeStubGroupResponseDto) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete the group "${group.name}"? This will also delete all tree stubs in this group.`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.treeStubService.deleteGroup(group.id).subscribe({
          next: () => {
            this.groups.update(groups => groups.filter(g => g.id !== group.id));
            this.updateFilteredGroups();
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Group deleted successfully'
            });
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to delete group'
            });
          }
        });
      }
    });
  }

  openEditor(group: TreeStubGroupResponseDto) {
    // TODO: Navigate to the tree stub editor for this group
    this.router.navigate(['/tree-stubs', group.id]);
  }
}