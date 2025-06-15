import { Injectable } from '@angular/core';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface Stop {
	name: string;
	lat: number;
	lng: number;
	city?: string;
	date?: string;
}

@Injectable({
	providedIn: 'root'
})
export class PdfExportService {
	constructor() { }
	
	exportStopsToPdf(stops: Stop[], filename: string = 'MyPlan.pdf'): void {
		const doc = new jsPDF();

		doc.setFontSize(22);
		doc.text('Plan', 14, 20);

		const headers = [['Place Name', 'Latitude', 'Longitude', 'Date']];

		const data = stops.map(stop => [
			stop.name,
			stop.lat.toFixed(4),
			stop.lng.toFixed(4),
			stop.date ? new Date(stop.date).toLocaleDateString() : 'N/A'
		]);

		autoTable(doc, {
			head: headers,
			body: data,
			startY: 30,
			theme: 'grid',
			styles: {
				fontSize: 10,
				cellPadding: 2,
			},
			headStyles: {
				fillColor: [0, 221, 221],
				textColor: 255,
				fontStyle: 'bold'
			},
			alternateRowStyles: {
				fillColor: [240, 240, 240]
			}
		});

		doc.save(filename);
	}
}