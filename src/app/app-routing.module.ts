import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { TripFormComponent } from './components/trip-form/trip-form.component';
import { HeroComponent } from './components/hero/hero.component';
import { HowToComponent } from './components/how-to/how-to.component';

const routes: Routes = [
	{ path: '', component: HeroComponent },
	{ path: 'Plan', component: TripFormComponent },
	{ path: 'HowTo', component: HowToComponent },
	{ path: '**', redirectTo: '', pathMatch: 'full' }
];

@NgModule({
	imports: [RouterModule.forRoot(routes)],
	exports: [RouterModule]
})
export class AppRoutingModule { }