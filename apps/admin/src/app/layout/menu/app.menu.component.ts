import { default as MenuData } from '../../../assets/data/menu.json';
import { AppConfigService } from '../../service/appconfigservice';
import { CommonModule } from '@angular/common';
import { afterNextRender, Component, computed, ElementRef, OnDestroy } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { DomHandler } from 'primeng/dom';
import { Subscription } from 'rxjs';
import { AppMenuItemComponent } from './app.menuitem.component';

export interface MenuItem {
    name?: string;
    icon?: string;
    children?: MenuItem[];
    routerLink?: string;
    href?: string;
    badge?: string; // Added badge property directly to the interface
}

@Component({
    selector: 'app-menu',
    template: ` <aside>
        <nav>
            <ol class="layout-menu">
                <li *ngFor="let item of menu; let i = index" app-menuitem [item]="item" [root]="true"></li>
            </ol>
        </nav>
    </aside>`,
    host: {
        class: 'layout-sidebar',
        '[class.active]': 'isActive()'
    },
    standalone: true,
    imports: [CommonModule, RouterModule, AppMenuItemComponent]
})
export class AppMenuComponent implements OnDestroy {
    menu!: MenuItem[];

    private routerSubscription: Subscription | null = null;

    isActive = computed(() => this.configService.appState().menuActive);

    constructor(
        private configService: AppConfigService,
        private el: ElementRef,
        private router: Router
    ) {
        this.menu = MenuData.data;

        afterNextRender(() => {
            setTimeout(() => {
                this.scrollToActiveItem();
            }, 1);

            this.routerSubscription = this.router.events.subscribe((event) => {
                if (event instanceof NavigationEnd && this.isActive()) {
                    this.configService.hideMenu();
                    DomHandler.unblockBodyScroll('blocked-scroll');
                }
            });
        });
    }

    scrollToActiveItem() {
        const activeItem = DomHandler.findSingle(this.el.nativeElement, '.router-link-active');
        if (activeItem && !this.isInViewport(activeItem)) {
            activeItem.scrollIntoView({ block: 'center' });
        }
    }

    isInViewport(element: Element): boolean {
        const rect = element.getBoundingClientRect();
        const windowHeight = window.innerHeight || document.documentElement.clientHeight;
        const windowWidth = window.innerWidth || document.documentElement.clientWidth;
        return rect.top >= 0 && rect.left >= 0 && rect.bottom <= windowHeight && rect.right <= windowWidth;
    }

    ngOnDestroy() {
        if (this.routerSubscription) {
            this.routerSubscription.unsubscribe();
            this.routerSubscription = null;
        }
    }
}