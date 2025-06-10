import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute, NavigationEnd } from '@angular/router';
import { TabsModule } from 'primeng/tabs';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-features',
  standalone: true,
  imports: [CommonModule, RouterModule, TabsModule],
  template: `
    <div class="card">
      <p-tabs [(value)]="activeTab" (onChange)="onTabChange($event)" styleClass="features-tabs">
        <p-tablist>
          <p-tab value="0">
            <i class="pi pi-map"></i>
            <span class="ml-2">KML Datasets</span>
          </p-tab>
          <p-tab value="1">
            <i class="pi pi-chart-line"></i>
            <span class="ml-2">Volta Depths</span>
          </p-tab>
        </p-tablist>
      </p-tabs>
      <div class="tab-content mt-3">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  host: { class: 'features-host' }
})
export class FeaturesComponent implements OnInit, OnDestroy {
  activeTab: string = '0';
  private routerSubscription?: Subscription;

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Initialize based on current route
    this.updateActiveTab();

    // Listen for route changes
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateActiveTab();
      });
  }

  ngOnDestroy() {
    this.routerSubscription?.unsubscribe();
  }

  private updateActiveTab() {
    const currentUrl = this.router.url;
    if (currentUrl.includes('/features/volta-depth')) {
      this.activeTab = '1';
    } else {
      this.activeTab = '0';
    }
  }

  onTabChange(event: any) {
    const tabValue = event.value;
    let route: string;
    
    switch(tabValue) {
      case '0':
        route = 'kml';
        break;
      case '1':
        route = 'volta-depth';
        break;
      default:
        route = 'kml';
    }
    
    this.router.navigate(['/features', route]);
  }
}