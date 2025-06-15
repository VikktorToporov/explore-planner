import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface ImageModalData {
	src: string;
	alt: string;
	caption?: string;
}

@Component({
	selector: 'app-image-modal',
	templateUrl: './image-modal.component.html',
	styleUrls: ['./image-modal.component.scss']
})
export class ImageModalComponent {
	constructor(
		public dialogRef: MatDialogRef<ImageModalComponent>,
		@Inject(MAT_DIALOG_DATA) public data: ImageModalData
	) { }

	close(): void {
		this.dialogRef.close();
	}
}