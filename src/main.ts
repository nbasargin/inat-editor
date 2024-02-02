import { bootstrapApplication } from '@angular/platform-browser';
import { importProvidersFrom } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, { providers: [importProvidersFrom([BrowserAnimationsModule])] }).catch((err) =>
  console.error(err),
);
