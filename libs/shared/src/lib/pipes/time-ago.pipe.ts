import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeAgo',
  standalone: true,
  pure: false // Make it impure so it updates automatically
})
export class TimeAgoPipe implements PipeTransform {
  transform(value: Date | string | null | undefined): string {
    if (!value) return 'Never';
    
    const date = value instanceof Date ? value : new Date(value);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 0) return 'Just now'; // Handle future dates
    
    const intervals = [
      { label: 'year', seconds: 31536000 },
      { label: 'month', seconds: 2592000 },
      { label: 'day', seconds: 86400 },
      { label: 'hour', seconds: 3600 },
      { label: 'minute', seconds: 60 },
      { label: 'second', seconds: 1 }
    ];
    
    for (const interval of intervals) {
      const count = Math.floor(seconds / interval.seconds);
      if (count > 0) {
        return count === 1 
          ? `${count} ${interval.label} ago`
          : `${count} ${interval.label}s ago`;
      }
    }
    
    return 'Just now';
  }
}