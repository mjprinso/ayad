import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NetworkStatusService {
  private readonly statusSubject = new BehaviorSubject<boolean>(navigator.onLine);
  public status$ = this.statusSubject.asObservable();

  constructor() {
    window.addEventListener('online', () => this.updateStatus(true));
    window.addEventListener('offline', () => this.updateStatus(false));
  }

  private updateStatus(status: boolean): void {
    this.statusSubject.next(status);
  }

  get isOnline(): boolean {
    return this.statusSubject.value;
  }
}
