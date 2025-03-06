// apps/admin/src/app/auth/auth.guard.ts
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { AuthGuardData, createAuthGuard } from 'keycloak-angular';

const isAccessAllowed = async (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
  authData: AuthGuardData
): Promise<boolean | UrlTree> => {
  const { authenticated, keycloak, grantedRoles } = authData;

  // If not authenticated, redirect to Keycloak login
  if (!authenticated) {
    await keycloak.login({
      redirectUri: window.location.origin + state.url
    });
    return false;
  }

  // Get the roles required from the route data
  const requiredRoles = route.data['roles'] as string[];
  
  // Allow the user to proceed if no additional roles are required 
  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }

  // Check if the user has the required roles
  const hasRequiredRoles = requiredRoles.every(role => 
    grantedRoles.realmRoles.includes(role) || 
    Object.values(grantedRoles.resourceRoles).some(roles => roles.includes(role))
  );

  if (hasRequiredRoles) {
    return true;
  }

  // If user doesn't have the required roles, redirect to a forbidden page
  const router = inject(Router);
  return router.parseUrl('/forbidden');
};

export const authGuard: CanActivateFn = createAuthGuard(isAccessAllowed);