import { Injectable } from '@angular/core';

import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
	providedIn: 'root'
})
export class NotificationService {
	constructor(private snackBar: MatSnackBar) {}

	showSuccess(message: string, duration: number = 3000) {
		this.snackBar.open(message, 'Close', {
			duration,
			panelClass: ['success-snackbar'],
			horizontalPosition: 'right',
			verticalPosition: 'bottom'
		});
	}

	showError(message: string, duration: number = 500000) {
		this.snackBar.open(message, 'Close', {
			duration,
			panelClass: ['error-snackbar'],
			horizontalPosition: 'right',
			verticalPosition: 'bottom'
		});
	}

	showWarning(message: string, duration: number = 4000) {
		this.snackBar.open(message, 'Close', {
			duration,
			panelClass: ['warning-snackbar'],
			horizontalPosition: 'right',
			verticalPosition: 'bottom'
		});
	}

	showInfo(message: string, duration: number = 3000) {
		this.snackBar.open(message, 'Close', {
			duration,
			panelClass: ['info-snackbar'],
			horizontalPosition: 'right',
			verticalPosition: 'bottom'
		});
	}
}