// apps/admin/src/app/app.component.ts
import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common'; // Add this import
import { AppFooterComponent } from './footer/app.footer.component';
import { AppNewsComponent } from './news/app.news.component';
import { AppTopBarComponent } from './topbar/app.topbar.component';
import { AppMenuComponent } from './menu/app.menu.component';
import { DomHandler } from 'primeng/dom';
import { PrimeNG } from 'primeng/config';
import { AppConfigService } from '../service/appconfigservice';
import { DebugPanelComponent } from '@ghanawaters/map';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [
    RouterOutlet,
    CommonModule, // Add CommonModule to the imports
    AppFooterComponent,
    AppNewsComponent,
    AppTopBarComponent,
    AppMenuComponent,
    DebugPanelComponent
  ],
  template: `
        <div class="layout-wrapper" [ngClass]="containerClass()">
            <app-news />
            <app-topbar />
            <div class="layout-mask" 
                 [ngClass]="{ 'layout-mask-active': isMenuActive() }" 
                 (click)="hideMenu()"
                 (keydown.enter)="hideMenu()"
                 tabindex="0"
                 role="button"
                 aria-label="Hide menu">
            </div>
            <div class="layout-content">
                <app-menu />
                <div class="layout-content-slot">
                    <router-outlet></router-outlet>
                </div>
            </div>
            <app-footer />
            <lib-debug-panel></lib-debug-panel>
        </div>
  `
})
export class AppMainComponent {
    configService: AppConfigService = inject(AppConfigService);

    primeng: PrimeNG = inject(PrimeNG);

    isNewsActive = computed(() => this.configService.newsActive());

    isMenuActive = computed(() => this.configService.appState().menuActive);

    isRippleDisabled = computed(() => this.primeng.ripple());

    containerClass = computed(() => {
        return {
            'layout-news-active': this.isNewsActive(),
            'p-ripple-disabled': this.isRippleDisabled()
        };
    });

    hideMenu() {
        this.configService.hideMenu();
        DomHandler.unblockBodyScroll('blocked-scroll');
    }
}