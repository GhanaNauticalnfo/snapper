// apps/admin/src/app/shared/components/sidebar/sidebar.component.ts
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgFor} from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgFor, TooltipModule],
  template: `
    <div class="sidebar">
      <div class="logo-container">
        <div class="logo">
          <i class="pi pi-shield"></i>
        </div>
      </div>
      
      <div class="nav-items">
        <a *ngFor="let item of navigationItems" 
           [routerLink]="item.route" 
           routerLinkActive="active-link" 
           [pTooltip]="item.label"
           tooltipPosition="right"
           class="nav-item"
        >
          <i [class]="item.icon"></i>
        </a>
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
        
        &.active-link {
          color: #fff;
          background-color: #3B82F6;
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
    { icon: 'pi pi-map', route: '/kml', label: 'KML' },
    { icon: 'pi pi-map', route: '/volta-depth', label: 'Depths' },
    // Add more navigation items as needed
  ];
}