// apps/admin/src/app/shared/components/sidebar/sidebar.component.ts
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgFor, NgIf, NgClass } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgFor, NgIf, NgClass, TooltipModule],
  template: `
    <div class="sidebar">
      <div class="logo-container">
        <div class="logo">
          <i class="pi pi-shield"></i>
        </div>
      </div>
      
      <div class="nav-items">
        <ng-container *ngFor="let item of navigationItems">
          <!-- Regular nav item -->
          <a *ngIf="!item.children" 
             [routerLink]="item.route" 
             routerLinkActive="active-link" 
             [pTooltip]="item.label"
             tooltipPosition="right"
             class="nav-item"
          >
            <i [class]="item.icon"></i>
          </a>
          
          <!-- Dropdown nav item -->
          <div *ngIf="item.children" class="nav-dropdown">
            <a (click)="toggleDropdown(item)"
               [pTooltip]="item.label"
               tooltipPosition="right"
               class="nav-item"
               [ngClass]="{'active': isDropdownOpen(item) || hasActiveChild(item)}"
            >
              <i [class]="item.icon"></i>
            </a>
            
            <!-- Dropdown menu -->
            <div class="dropdown-menu" [ngClass]="{'show': isDropdownOpen(item)}">
              <div class="dropdown-header">{{ item.label }}</div>
              <a *ngFor="let child of item.children"
                 [routerLink]="child.route"
                 routerLinkActive="active-link"
                 class="dropdown-item"
                 (click)="closeDropdown()"
              >
                <i [class]="child.icon"></i>
                <span>{{ child.label }}</span>
              </a>
            </div>
          </div>
        </ng-container>
      </div>
      
      <div class="user-profile">
        <i class="pi pi-user"></i>
      </div>
    </div>
  `,
  styles: [`
    .sidebar {
      display: flex;
      flex-direction: column;
      width: 80px;
      height: 100vh;
      background-color: #1e1e1e;
      color: white;
      overflow: hidden;
    }
    
    .logo-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 80px;
      
      .logo {
        background: #333;
        border-radius: 50%;
        width: 45px;
        height: 45px;
        display: flex;
        justify-content: center;
        align-items: center;
        
        i {
          font-size: 1.5rem;
        }
      }
    }
    
    .nav-items {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding-top: 20px;
      
      .nav-item {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 15px 0;
        color: #ccc;
        text-decoration: none;
        transition: background-color 0.3s, color 0.3s;
        cursor: pointer;
        
        i {
          font-size: 1.2rem;
        }
        
        &:hover {
          background-color: rgba(255,255,255,0.1);
          color: white;
        }
        
        &.active-link, &.active {
          color: #fff;
          background-color: #3B82F6;
        }
      }
      
      .nav-dropdown {
        position: relative;
        
        .dropdown-menu {
          position: absolute;
          left: 100%;
          top: 0;
          background-color: #2a2a2a;
          min-width: 200px;
          box-shadow: 2px 0 8px rgba(0,0,0,0.2);
          border-radius: 4px;
          overflow: hidden;
          opacity: 0;
          transform: translateX(-10px);
          pointer-events: none;
          transition: opacity 0.3s, transform 0.3s;
          z-index: 1000;
          
          &.show {
            opacity: 1;
            transform: translateX(0);
            pointer-events: auto;
          }
          
          .dropdown-header {
            padding: 12px 20px;
            font-weight: 600;
            color: #fff;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            font-size: 0.9rem;
          }
          
          .dropdown-item {
            display: flex;
            align-items: center;
            padding: 12px 20px;
            color: #ccc;
            text-decoration: none;
            transition: background-color 0.2s, color 0.2s;
            
            i {
              font-size: 1rem;
              margin-right: 12px;
              width: 20px;
              text-align: center;
            }
            
            span {
              font-size: 0.85rem;
            }
            
            &:hover {
              background-color: rgba(255,255,255,0.1);
              color: white;
            }
            
            &.active-link {
              background-color: #3B82F6;
              color: white;
            }
          }
        }
      }
    }
    
    .user-profile {
      display: flex;
      justify-content: center;
      padding: 20px 0;
      
      i {
        font-size: 1.5rem;
      }
    }
  `]
})
export class SidebarComponent {
  navigationItems = [
    { icon: 'pi pi-home', route: '/home', label: 'Home' },
    { icon: 'pi pi-home', route: '/home2', label: 'Home2' },
    { 
      icon: 'pi pi-folder', 
      label: 'Features',
      children: [
        { icon: 'pi pi-directions', route: '/features/routes', label: 'Routes' },
        { icon: 'pi pi-sitemap', route: '/features/tree-stubs', label: 'Tree Stubs' },
        { icon: 'pi pi-map', route: '/features/kml', label: 'KML DataSets' },
        { icon: 'pi pi-chart-line', route: '/features/volta-depth', label: 'Volta Depths' }
      ]
    },
    { icon: 'pi pi-ship', route: '/vessels', label: 'Vessels' },
    { icon: 'pi pi-chart-bar', route: '/telemetry', label: 'Telemetry' },
    { icon: 'pi pi-eye', route: '/live', label: 'Live' },
    { icon: 'pi pi-cog', route: '/settings', label: 'Settings' }
  ];
  
  openDropdown: any = null;
  
  toggleDropdown(item: any) {
    if (this.openDropdown === item) {
      this.openDropdown = null;
    } else {
      this.openDropdown = item;
    }
  }
  
  closeDropdown() {
    setTimeout(() => {
      this.openDropdown = null;
    }, 100);
  }
  
  isDropdownOpen(item: any): boolean {
    return this.openDropdown === item;
  }
  
  hasActiveChild(item: any): boolean {
    if (!item.children) return false;
    const currentUrl = window.location.pathname;
    return item.children.some((child: any) => currentUrl.startsWith(child.route));
  }
}