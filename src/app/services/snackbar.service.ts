import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class SnackbarService {

  constructor(private readonly snackBar: MatSnackBar) {}

  showSuccess(message: string, duration: number = 3000): void {
    this.snackBar.open(message, 'Dismiss', {
      duration: duration,
      panelClass: ['mat-success'],
      horizontalPosition: 'center',
      verticalPosition: 'top'
    });
  }

  showError(message: string, duration: number = 3000): void {
    this.snackBar.open(message, 'Dismiss', {
      duration: duration,
      panelClass: ['mat-error'],
      horizontalPosition: 'center',
      verticalPosition: 'top'
    });
  }
}
