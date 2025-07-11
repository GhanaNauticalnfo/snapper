import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';

export const apiBaseUrlInterceptor: HttpInterceptorFn = (req, next) => {
  // Only intercept requests that start with /api
  if (req.url.startsWith('/api')) {
    // Replace /api with the full API URL from environment
    const apiReq = req.clone({
      url: req.url.replace('/api', environment.apiUrl)
    });
    return next(apiReq);
  }
  
  return next(req);
};