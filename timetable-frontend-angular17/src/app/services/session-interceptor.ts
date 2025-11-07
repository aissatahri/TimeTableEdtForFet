import { HttpInterceptorFn } from '@angular/common/http';

export const sessionInterceptor: HttpInterceptorFn = (req, next) => {
  // Get session ID from localStorage
  const sessionId = localStorage.getItem('TIMETABLE_SESSION_ID');
  
  // If session ID exists, add it to the request headers
  if (sessionId) {
    req = req.clone({
      setHeaders: {
        'X-Session-ID': sessionId
      }
    });
  }
  
  return next(req);
};
