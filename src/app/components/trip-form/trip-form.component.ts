import { Component, ElementRef, ViewChild } from "@angular/core";
import { MatSelect } from "@angular/material/select";
import { FormBuilder, FormGroup, FormArray, Validators } from "@angular/forms";

import { Stop } from "../globe/globe.component";
import { PdfExportService } from "../../services/pdf-export.service";
import { AppInjector } from "../../services/injector.service";
import { ConfirmationService } from "../../services/confirmation.service";
import { NotificationService } from "../../services/notification.service";
import { CITIES_DATA } from "../../constants/cities.constant";

@Component({
	selector: "app-trip-form",
	templateUrl: "./trip-form.component.html",
	styleUrls: ["./trip-form.component.scss"],
})
export class TripFormComponent {
	@ViewChild("fileInput") fileInput!: ElementRef;
	@ViewChild(MatSelect) planetSelect!: MatSelect;

	itineraryForm: FormGroup;
	liveStopsData: Stop[] = [];

	predefinedCities: any = CITIES_DATA;

	planets: any[] = [
		{
			name: "Earth",
			file: "earth.jpg"
		},
		{
			name: "Moon",
			file: "moon.jpg"
		},
		{
			name: "Mars",
			file: "mars.jpg"
		},
		{
			name: "Jupiter",
			file: "jupiter.jpg"
		},
  ];
	selectedPlanet: string = "earth.jpg";
	previousPlanet: string = "earth.jpg";

  get stops(): FormArray {
		return this.itineraryForm.get("stops") as FormArray;
	}

	constructor(
		private fb: FormBuilder,
		private pdfExportService: PdfExportService,
		private notificationService: NotificationService
	) {
		this.itineraryForm = this.fb.group({
			stops: this.fb.array([]),
		});
	}

	ngOnInit(): void {
		this.addStop();

		this.itineraryForm.valueChanges.subscribe((formValue) => {
			this.liveStopsData = formValue.stops
				.filter((stop: any) => stop.lat && stop.lng)
				.map((stop: any) => ({
					name: stop.name,
					lat: parseFloat(stop.lat),
					lng: parseFloat(stop.lng),
				}));
		});
	}

	createStopGroupFromItem(payload ? : any): FormGroup {
		return this.fb.group({
			city: [payload?.city || ""],
			name: [payload?.name || "", Validators.required],
			lat: [payload?.lat || "", Validators.required],
			lng: [payload?.lng || "", Validators.required],
			date: [payload?.date || "", Validators.required],
		});
	}

	addStop(index ? : number): void {
		const insertIndex = index || 0;

		const stopsArray = this.stops;
		stopsArray.insert(insertIndex + 1, this.createStopGroupFromItem());
	}

	removeStop(index: number): void {
		if (this.stops.length > 1) {
			this.stops.removeAt(index);
		} else {
			this.stops
				.at(index)
				.patchValue({
					city: "",
					name: "",
					lat: "",
					lng: "",
					date: ""
				});
		}
	}

	handleMoveUp(index: number) {
		if (index && this.stops.at(index) && this.stops.length > 1) {
			const item = this.stops.at(index).value;
			this.stops.removeAt(index);
			this.stops.insert(index - 1, this.createStopGroupFromItem(item));
		}
	}

	handleMoveDown(index: number) {
		if (
			this.stops.at(index) &&
			this.stops.length > 1 &&
			this.stops.length - 1 !== index
		) {
			const item = this.stops.at(index).value;
			this.stops.removeAt(index);
			this.stops.insert(index + 1, this.createStopGroupFromItem(item));
		}
	}

	onCityChange(index: number): void {
		const cityControl = this.stops.at(index).get("city");
		const selectedCityName = cityControl?.value;
		const selectedCity = this.predefinedCities.find(
			(c: any) => c.name === selectedCityName
		);

		if (selectedCity) {
			this.stops.at(index).patchValue({
				name: selectedCity.name,
				lat: selectedCity.lat,
				lng: selectedCity.lng,
			});
		} else {
			this.stops.at(index).patchValue({
				name: "",
				lat: "",
				lng: ""
			});
		}
	}

	saveItinerary(saveAsCSV = false): void {
		if (this.itineraryForm.valid) {
			this.notificationService.showSuccess("Plan Saved!");

			if (saveAsCSV) {
				this.exportDataToCsv();
			} else {
				this.exportDataToPdf();
			}
		} else {
			this.notificationService.showError(
				"Please fill out all fields before saving."
			);
		}
	}

	exportDataToPdf(): void {
		if (
			this.itineraryForm.value?.stops &&
			this.itineraryForm.value.stops.length > 0
		) {
			this.pdfExportService.exportStopsToPdf(
				this.itineraryForm.value.stops,
				"MyPlan.pdf"
			);
		}
	}

	exportDataToCsv(): void {
		const stopsData = this.itineraryForm.value.stops;
		if (stopsData?.length) {
			const headers = ["Name", "Latitude", "Longitude", "Date"];
			const rows = stopsData.map((stop: any) => [
        stop.name,
        stop.lat,
        stop.lng,
        stop.date,
      ]);

			const escapeCsvField = (field: any): string => {
				let stringField = String(field);
        
				if (
					stringField.includes(",") ||
					stringField.includes('"') ||
					stringField.includes("\n")
				) {
					stringField = `"${stringField.replace(/"/g, '""')}"`;
				}
				return stringField;
			};

			let csvContent = headers.map(escapeCsvField).join(",") + "\n";
			rows.forEach((row: any[]) => {
				csvContent += row.map(escapeCsvField).join(",") + "\n";
			});

			const blob = new Blob([csvContent], {
				type: "text/csv;charset=utf-8;"
			});
			const link = document.createElement("a");

			if (link.download !== undefined) {
				const url = URL.createObjectURL(blob);

				link.setAttribute("href", url);
				link.setAttribute("download", "MyPlan.csv");
				link.style.visibility = "hidden";
				document.body.appendChild(link);
				link.click();

				document.body.removeChild(link);
				URL.revokeObjectURL(url);
			} else {
				this.notificationService.showError("Your browser does not support downloading files directly. Please copy the content from the console.");
				console.log(csvContent);
			}
		}
	}

	handleCoordinateClick(payload: { lat: number; lng: number; }) {
		this.stops.push(
			this.createStopGroupFromItem({
				name: "New Place from Map",
				city: "custom",
				lat: payload.lat,
				lng: payload.lng,
				date: "",
			})
		);
	}

	import(): void {
		const confirmationService = AppInjector.get(ConfirmationService);
		confirmationService
			.open("If you import from a file the form will be reset. The file must have headers 'Name', 'Latitude', 'Longitude', 'Date'. Are you sure you want to continue?")
			.subscribe((result) => {
				if (result) {
					this.fileInput.nativeElement.click();
				}
			});
	}

	onFileSelected(event: Event): void {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			const file = input.files[0];
			if (file.type === "text/csv") {
				this.readCsvFile(file);
			} else {
				this.notificationService.showError("Please select a valid CSV file.");
			}
		}

		input.value = '';
	}

	planetChange(newValue: string) {
		this.previousPlanet = this.selectedPlanet;

		const confirmationService = AppInjector.get(ConfirmationService);
		confirmationService
			.open("If you change the planet the form will be reset. Are you sure you want to change the planet?")
			.subscribe((result) => {
				if (result) {
					this.selectedPlanet = newValue;
					this.resetForm();
					this.addStop();
				} else {
					this.selectedPlanet = this.previousPlanet;
					this.planetSelect.writeValue(this.previousPlanet);
				}
			});
	}

	private resetForm() {
		if (this.itineraryForm) {
			this.resetFormArray(this.itineraryForm.get("stops") as FormArray);
		}
	}

	private resetFormArray(array: FormArray) {
		if (array?.length > 0) {
			for (let j = array.length - 1; j >= 0; j--) {
				if (array.at(j)) {
					array.removeAt(j);
				}
			}
		}
	}

	private readCsvFile(file: File): void {
		const reader = new FileReader();
		reader.onload = (e: any) => {
			const csv = e.target.result;
			this.parseCsvAndPopulateForm(csv);
		};
		reader.readAsText(file);
	}

	private parseCsvAndPopulateForm(csv: string): void {
		const lines = csv.split("\n").filter((line) => line.trim() !== "");
		if (lines.length === 0) {
			this.notificationService.showError("The CSV file is empty or malformed.");
			return;
		}

		const headers = lines[0]
			.split(",")
			.map((header) => header.trim().toLowerCase());
		const expectedHeaders = ["name", "latitude", "longitude", "date"];

		if (!expectedHeaders.every((header) => headers.includes(header))) {
			this.notificationService.showError("CSV file is missing one or more required headers: Name, Latitude, Longitude, Date.");
			return;
		}

		while (this.stops.length !== 0) {
			this.stops.removeAt(0);
		}

		for (let i = 1; i < lines.length; i++) {
			const data = lines[i].split(",");
			if (data.length === headers.length) {
				const stopData: {
					[key: string]: any
				} = {};
				headers.forEach((header, index) => {
					stopData[header] = data[index].trim();
				});

				const lat = parseFloat(stopData["latitude"]);
				const lng = parseFloat(stopData["longitude"]);
				const dateStringFromCsv = stopData["date"];

				if (isNaN(lat) || isNaN(lng)) {
					continue;
				}

				let formattedDate = "";
				if (dateStringFromCsv) {
					try {
						const dateObj = new Date(dateStringFromCsv);

						if (!isNaN(dateObj.getTime())) {
							const year = dateObj.getFullYear();
							const month = (dateObj.getMonth() + 1)
								.toString()
								.padStart(2, "0");
							const day = dateObj.getDate().toString().padStart(2, "0");
							formattedDate = `${year}-${month}-${day}`;
						}
					} catch (e) {
						//
					}
				}

				this.stops.push(
					this.createStopGroupFromItem({
						name: stopData["name"],
						city: "custom",
						lat: lat,
						lng: lng,
						date: formattedDate,
					})
				);
			}
		}

		if (this.stops.length === 0) {
			this.notificationService.showError("No valid data found in the CSV file after parsing.");
		}
	}
}
