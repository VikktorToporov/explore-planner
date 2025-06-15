import { Injector } from '@angular/core';

export let AppInjector: Injector;

export function setAppInjector(injector: Injector) {
	if (AppInjector) {
		return;
	}
	AppInjector = injector;
}
