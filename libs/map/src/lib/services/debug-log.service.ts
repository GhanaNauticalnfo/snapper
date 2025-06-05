import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface DebugLogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'success';
  category: string;
  message: string;
  details?: any;
}

@Injectable({
  providedIn: 'root'
})
export class DebugLogService {
  private maxLogs = 100;
  private logsSubject = new BehaviorSubject<DebugLogEntry[]>([]);
  public logs$: Observable<DebugLogEntry[]> = this.logsSubject.asObservable();

  log(level: DebugLogEntry['level'], category: string, message: string, details?: any) {
    const entry: DebugLogEntry = {
      timestamp: new Date(),
      level,
      category,
      message,
      details
    };

    const currentLogs = this.logsSubject.value;
    const newLogs = [entry, ...currentLogs].slice(0, this.maxLogs);
    this.logsSubject.next(newLogs);

    // Also log to console for debugging
    const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
    console[consoleMethod](`[${category}] ${message}`, details || '');
  }

  info(category: string, message: string, details?: any) {
    this.log('info', category, message, details);
  }

  warn(category: string, message: string, details?: any) {
    this.log('warn', category, message, details);
  }

  error(category: string, message: string, details?: any) {
    this.log('error', category, message, details);
  }

  success(category: string, message: string, details?: any) {
    this.log('success', category, message, details);
  }

  clear() {
    this.logsSubject.next([]);
  }
}