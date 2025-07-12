import { AppConfigService } from '../../service/appconfigservice';
import { CommonModule, DOCUMENT } from '@angular/common';
import { afterNextRender, booleanAttribute, Component, computed, ElementRef, Inject, Input, OnDestroy, Renderer2, signal, inject, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { DomHandler } from 'primeng/dom';
import { KEYCLOAK_EVENT_SIGNAL, KeycloakEventType, typeEventArgs, ReadyArgs } from 'keycloak-angular';
import Keycloak from 'keycloak-js';
import { MenuModule } from 'primeng/menu';
import { MenuItem, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, MenuModule, ConfirmDialogModule],
    template: `<p-confirmDialog></p-confirmDialog>
    <div class="layout-topbar">
        <div class="layout-topbar-inner">

        <div class="layout-topbar-logo-container">
    <a [routerLink]="['/']" class="layout-topbar-logo" aria-label="Ghana Maritime Authority Logo">
        <img src="assets/images/ghana-maritime-authority-logo.png" alt="Ghana Maritime Authority" height="50" />
        <span class="logo-text">Ghana Maritime Authority</span>
    </a>
</div>


            <ul class="topbar-items">

                <li>
                    <div id="docsearch"></div>
                </li>
                <!--
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
-->
                <li>
                    <button type="button" class="topbar-item" (click)="toggleDarkMode()">
                        <i class="pi" [ngClass]="{ 'pi-moon': isDarkMode(), 'pi-sun': !isDarkMode() }"></i>
                    </button>
                </li>
                <li *ngIf="isAuthenticated()">
                    <button type="button" class="topbar-item user-menu-button" (click)="userMenu.toggle($event)" [attr.aria-label]="getUserMenuLabel()">
                        <i class="pi pi-user"></i>
                        <span class="user-menu-indicator"></span>
                    </button>
                    <p-menu #userMenu [model]="userMenuItems" [popup]="true" appendTo="body" styleClass="user-menu-popup"></p-menu>
                </li>
                <!--
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
-->
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
    
    private keycloak = inject(Keycloak);
    private keycloakSignal = inject(KEYCLOAK_EVENT_SIGNAL);
    authenticated = signal(false);
    userProfile = signal<any>(null);
    userRoles = signal<string[]>([]);
    private confirmationService = inject(ConfirmationService);
    private router = inject(Router);
    
    userMenuItems: MenuItem[] = [];

    constructor(
        @Inject(DOCUMENT) private document: Document,
        private el: ElementRef,
        private renderer: Renderer2,
        private configService: AppConfigService
    ) {
        this.window = this.document.defaultView as Window;

        afterNextRender(() => {
            this.bindScrollListener();
            this.initializeAuth();
        });
        
        // Listen to Keycloak events
        effect(() => {
            const keycloakEvent = this.keycloakSignal();
            
            if (keycloakEvent.type === KeycloakEventType.Ready) {
                const isAuthenticated = typeEventArgs<ReadyArgs>(keycloakEvent.args);
                this.authenticated.set(isAuthenticated);
                
                if (isAuthenticated) {
                    this.loadUserProfile();
                }
            }
            
            if (keycloakEvent.type === KeycloakEventType.AuthLogout) {
                this.authenticated.set(false);
                this.userProfile.set(null);
                this.userRoles.set([]);
            }
        }, { allowSignalWrites: true });
    }
    
    async initializeAuth() {
        if (this.keycloak.authenticated) {
            this.authenticated.set(true);
            await this.loadUserProfile();
        }
    }
    
    async loadUserProfile() {
        try {
            // Use token information - only display username
            const tokenParsed = this.keycloak.tokenParsed;
            const roles = this.keycloak.realmAccess?.roles || [];
            
            if (tokenParsed) {
                const username = tokenParsed['preferred_username'] || 'User';
                this.userProfile.set({
                    name: username,
                    email: '',
                    username: username
                });
                this.userRoles.set(roles);
                this.setupUserMenu();
            }
        } catch (error) {
            console.error('Failed to load user profile:', error);
        }
    }
    
    setupUserMenu() {
        const userProfile = this.userProfile();
        const userRoles = this.userRoles();
        
        this.userMenuItems = [
            {
                label: userProfile?.username || 'User',
                disabled: true,
                styleClass: 'font-semibold'
            },
            {
                label: `Role: ${userRoles.join(', ') || 'User'}`,
                disabled: true,
                styleClass: 'text-sm text-color-secondary',
                visible: userRoles.length > 0
            },
            {
                separator: true
            },
            {
                label: 'My Profile',
                icon: 'pi pi-user',
                command: () => {
                    // TODO: Navigate to profile page when implemented
                    console.log('Profile page not yet implemented');
                }
            },
            {
                separator: true
            },
            {
                label: 'Logout',
                icon: 'pi pi-sign-out',
                command: () => this.logout()
            }
        ];
    }
    
    logout() {
        this.confirmationService.confirm({
            message: 'Are you sure you want to logout?',
            header: 'Logout Confirmation',
            icon: 'pi pi-exclamation-triangle',
            acceptIcon: 'pi pi-sign-out',
            rejectIcon: 'pi pi-times',
            acceptLabel: 'Yes, Logout',
            rejectLabel: 'Cancel',
            acceptButtonStyleClass: 'p-button-danger',
            accept: async () => {
                await this.keycloak.logout({ redirectUri: window.location.origin });
            }
        });
    }
    
    getUserMenuLabel(): string {
        const userProfile = this.userProfile();
        return 'User menu for ' + (userProfile?.name || userProfile?.email || 'User');
    }

    isDarkMode = computed(() => this.configService.appState().darkTheme);

    isMenuActive = computed(() => this.configService.appState().menuActive);

    isDesignerActive = computed(() => this.configService.designerActive());
    
    isAuthenticated = computed(() => this.authenticated());

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
