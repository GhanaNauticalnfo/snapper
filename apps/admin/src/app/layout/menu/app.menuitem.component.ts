import { CommonModule } from '@angular/common';
import { booleanAttribute, Component, Input } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MenuItem } from './app.menu.component';
import { Tag } from 'primeng/tag';
import { HasRolesDirective } from 'keycloak-angular';

@Component({
    // Using attribute selector since it's being used on li elements
// eslint-disable-next-line @angular-eslint/component-selector
    selector: '[app-menuitem]',
    template: `
        <ng-container *ngIf="!item.roles || item.roles.length === 0">
            <ng-container *ngTemplateOutlet="menuContent"></ng-container>
        </ng-container>
        <ng-container *ngIf="item.roles && item.roles.length > 0">
            <ng-container *kaHasRoles="item.roles">
                <ng-container *ngTemplateOutlet="menuContent"></ng-container>
            </ng-container>
        </ng-container>
        
        <ng-template #menuContent>
            <button *ngIf="root && item.children" type="button" class="px-link" (click)="toggleSubmenu()">
                <div class="menu-icon">
                    <i [ngClass]="item.icon"></i>
                </div>
                <span>{{ item.name }}</span>
                <i class="menu-toggle-icon pi" [ngClass]="{'pi-angle-down': !isExpanded, 'pi-angle-up': isExpanded}"></i>
            </button>
            <a *ngIf="item.href" [href]="item.href" target="_blank" rel="noopener noreferrer">
                <div *ngIf="item.icon && root" class="menu-icon">
                    <i [ngClass]="item.icon"></i>
                </div>
                <span>{{ item.name }}</span>
                <p-tag *ngIf="item.badge" [value]="item.badge" />
            </a>
            <a *ngIf="item.routerLink" [routerLink]="item.routerLink" routerLinkActive="router-link-active" [routerLinkActiveOptions]="{ paths: 'exact', queryParams: 'ignored', matrixParams: 'ignored', fragment: 'ignored' }">
                <div *ngIf="item.icon && root" class="menu-icon">
                    <i [ngClass]="item.icon"></i>
                </div>
                <span>{{ item.name }}</span>
                <p-tag *ngIf="item.badge" [value]="item.badge" />
            </a>
            <span *ngIf="!root && item.children" class="menu-child-category">{{ item.name }}</span>
            <div *ngIf="item.children" class="overflow-y-hidden transition-all duration-[400ms] ease-in-out" [ngClass]="{'hidden': root && !isExpanded}">
                <ol>
                    <li *ngFor="let child of item.children" app-menuitem [root]="false" [item]="child"></li>
                </ol>
            </div>
        </ng-template>
    `,
    standalone: true,
    imports: [CommonModule, RouterModule, Tag, HasRolesDirective]
})
export class AppMenuItemComponent {
    @Input() item!: MenuItem;

    @Input({ transform: booleanAttribute }) root = true;
    
    isExpanded = false;

    constructor(private router: Router) {}
    
    toggleSubmenu() {
        this.isExpanded = !this.isExpanded;
    }

    isActiveRootMenuItem(menuitem: MenuItem): boolean {
        const url = this.router.url.split('#')[0];
        return menuitem.children ? !menuitem.children.some((item) => item.routerLink === `${url}` || (item.children && item.children.some((it) => it.routerLink === `${url}`))) : false;
    }
}