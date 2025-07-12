import { inject } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, CanActivateFn, UrlTree } from '@angular/router';
import { createAuthGuard, AuthGuardData } from 'keycloak-angular';

const isAccessAllowed = async (
  route: ActivatedRouteSnapshot,
  __: RouterStateSnapshot,
  authData: AuthGuardData
): Promise<boolean | UrlTree> => {
  const { authenticated, grantedRoles } = authData;

  // If not authenticated, keycloak-angular will handle login redirect
  if (!authenticated) {
    return false;
  }

  // Get the roles required from the route
  const requiredRoles = route.data['roles'] as string[];

  // Allow access if no roles are required
  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }

  // Check realm roles (we only use realm roles in Ghana Waters)
  const hasRequiredRole = requiredRoles.some(role => 
    grantedRoles.realmRoles?.includes(role)
  );

  if (!hasRequiredRole) {
    const router = inject(Router);
    return router.parseUrl('/forbidden');
  }

  return true;
};

export const authGuard = createAuthGuard<CanActivateFn>(isAccessAllowed);