import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { Observable } from 'rxjs';

import { ConfirmationDialogComponent } from '../components/confirmation-dialog/confirmation-dialog.component';


@Injectable({
	providedIn: 'root'
})
export class ConfirmationService {
	constructor(private dialog: MatDialog) { }

	public open(message: string): Observable<boolean> {
		const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
			data: { message }
		});

		return dialogRef.afterClosed();
	}
}
