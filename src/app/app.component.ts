import { Component, Injector } from '@angular/core';

import { setAppInjector } from './services/injector.service';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss']
})
export class AppComponent {
	constructor(injector: Injector) {
		setAppInjector(injector);
	}
}
