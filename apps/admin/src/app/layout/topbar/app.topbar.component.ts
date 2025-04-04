import { AppConfigService } from '../../service/appconfigservice';
import { CommonModule, DOCUMENT } from '@angular/common';
import { afterNextRender, booleanAttribute, Component, computed, ElementRef, Inject, Input, OnDestroy, Renderer2 } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DomHandler } from 'primeng/dom';
import { StyleClass } from 'primeng/styleclass';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [CommonModule, FormsModule, StyleClass, RouterModule],
    template: `<div class="layout-topbar">
        <div class="layout-topbar-inner">

        <div class="layout-topbar-logo-container">
    <a [routerLink]="['/']" class="layout-topbar-logo" aria-label="GMA Logo">
        <svg width="120" height="33" viewBox="0 0 120 33" fill="none" xmlns="http://www.w3.org/2000/svg">
            <text x="40" y="22" font-size="16" font-family="Arial, sans-serif" font-weight="bold" fill="var(--high-contrast-text-color)">GMA</text>
            <path d="M15.1934 0L0.0391 5.38288L2.35052 25.3417L15.1934 32.427L28.0364 25.3417L30.3478 5.38288L15.1934 0Z" fill="var(--p-primary-color)"/>
            <path d="M15 5C18 5 21 7 23 9C25 11 26 14 26 16C26 18 25 21 23 23C21 25 18 27 15 27C12 27 9 25 7 23C5 21 4 18 4 16C4 14 5 11 7 9C9 7 12 5 15 5Z" fill="var(--high-contrast-text-color)"/>
            <path d="M15 8C16.5 8 18 9 19 10C20 11 21 13 21 14C21 15 20 17 19 18C18 19 16.5 20 15 20C13.5 20 12 19 11 18C10 17 9 15 9 14C9 13 10 11 11 10C12 9 13.5 8 15 8Z" fill="var(--p-primary-color)"/>
        </svg>
    </a>
</div>

<!--
<div class="layout-topbar-logo-container">
    <a [routerLink]="['/']" class="layout-topbar-logo" aria-label="Snapper Icon">
        <svg width="33" height="33" viewBox="0 0 33 33" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 5C18 5 21 7 23 9C25 11 26 14 26 16C26 18 25 21 23 23C21 25 18 27 15 27C12 27 9 25 7 23C5 21 4 18 4 16C4 14 5 11 7 9C9 7 12 5 15 5Z" fill="var(--p-primary-color)"/>
            <path d="M15 8C16.5 8 18 9 19 10C20 11 21 13 21 14C21 15 20 17 19 18C18 19 16.5 20 15 20C13.5 20 12 19 11 18C10 17 9 15 9 14C9 13 10 11 11 10C12 9 13.5 8 15 8Z" fill="var(--high-contrast-text-color)"/>
        </svg>
    </a>
</div>
-->

            <ul class="topbar-items">
                <li>
                    <div id="docsearch"></div>
                </li>
                <li>
                    <a href="https://github.com/primefaces/primeng" target="_blank" rel="noopener noreferrer" class="topbar-item">
                        <i class="pi pi-github text-surface-700 dark:text-surface-100"></i>
                    </a>
                </li>
                <li>
                    <a href="https://discord.gg/gzKFYnpmCY" target="_blank" rel="noopener noreferrer" class="topbar-item">
                        <i class="pi pi-discord text-surface-700 dark:text-surface-100"></i>
                    </a>
                </li>
                <li>
                    <a href="https://github.com/orgs/primefaces/discussions" target="_blank" rel="noopener noreferrer" class="topbar-item">
                        <i class="pi pi-comments text-surface-700 dark:text-surface-100"></i>
                    </a>
                </li>
                <li>
                    <button type="button" class="topbar-item" (click)="toggleDarkMode()">
                        <i class="pi" [ngClass]="{ 'pi-moon': isDarkMode(), 'pi-sun': !isDarkMode() }"></i>
                    </button>
                </li>
                <li>
                    <button type="button" class="topbar-item relative group overflow-hidden !border-transparent" (click)="toggleDesigner()">
                        <span
                            style="animation-duration: 2s; background: conic-gradient(from 90deg, #f97316, #f59e0b, #eab308, #84cc16, #22c55e, #10b981, #14b8a6, #06b6d4, #0ea5e9, #3b82f6, #6366f1, #8b5cf6, #a855f7, #d946ef, #ec4899, #f43f5e)"
                            class="absolute -top-5 -left-5 w-20 h-20 animate-spin"
                        ></span>
                        <span style="inset: 1px; border-radius: 4px" class="absolute z-2 bg-surface-0 dark:bg-surface-900 transition-all"></span>
                        <i class="pi pi-cog z-10"></i>
                    </button>
                </li>
                <li *ngIf="showMenuButton" class="menu-button">
                    <button type="button" class="topbar-item menu-button" (click)="toggleMenu()" aria-label="Menu">
                        <i class="pi pi-bars"></i>
                    </button>
                </li>
            </ul>
        </div>
    </div>`
})
export class AppTopBarComponent implements OnDestroy {
    @Input({ transform: booleanAttribute }) showConfigurator = true;

    @Input({ transform: booleanAttribute }) showMenuButton = true;

    scrollListener: VoidFunction | null = null;

    private window: Window;

    constructor(
        @Inject(DOCUMENT) private document: Document,
        private el: ElementRef,
        private renderer: Renderer2,
        private configService: AppConfigService
    ) {
        this.window = this.document.defaultView as Window;

        afterNextRender(() => {
            this.bindScrollListener();
        });
    }

    isDarkMode = computed(() => this.configService.appState().darkTheme);

    isMenuActive = computed(() => this.configService.appState().menuActive);

    isDesignerActive = computed(() => this.configService.designerActive());

    toggleMenu() {
        if (this.isMenuActive()) {
            this.configService.hideMenu();
            DomHandler.unblockBodyScroll('blocked-scroll');
        } else {
            this.configService.showMenu();
            DomHandler.blockBodyScroll('blocked-scroll');
        }
    }

    toggleDesigner() {
        if (this.isDesignerActive()) {
            this.configService.hideDesigner();
        } else {
            this.configService.showDesigner();
        }
    }

    toggleDarkMode() {
        this.configService.appState.update((state) => ({ ...state, darkTheme: !state.darkTheme }));
    }

    bindScrollListener() {
        if (!this.scrollListener) {
            this.scrollListener = this.renderer.listen(this.window, 'scroll', () => {
                if (this.window.scrollY > 0) {
                    this.el.nativeElement.children[0].classList.add('layout-topbar-sticky');
                } else {
                    this.el.nativeElement.children[0].classList.remove('layout-topbar-sticky');
                }
            });
        }
    }

    unbindScrollListener() {
        if (this.scrollListener) {
            this.scrollListener();
            this.scrollListener = null;
        }
    }

    ngOnDestroy() {
        this.unbindScrollListener();
    }
}
