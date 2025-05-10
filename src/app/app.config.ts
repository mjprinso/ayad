import { ApplicationConfig } from '@angular/core';
import { PreloadAllModules, provideRouter, withPreloading } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { MatCommonModule } from '@angular/material/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DBConfig, provideIndexedDb } from 'ngx-indexed-db';

const dbConfig: DBConfig = {
  name: 'blog-DB',
  version: 1,
  objectStoresMeta: [
    {
      store: 'posts',
      storeConfig: {
        keyPath: 'id',
        autoIncrement: false
      },
      storeSchema: [
        { name: 'id', keypath: 'id', options: { unique: false } },
        { name: 'userId', keypath: 'userId', options: { unique: false } },
        { name: 'title', keypath: 'title', options: { unique: false } },
        { name: 'body', keypath: 'body', options: { unique: false } }
      ]
    },
    {
      store: 'users',
      storeConfig: {
        keyPath: 'id',
        autoIncrement: false
      },
      storeSchema: [
        { name: 'id', keypath: 'id', options: { unique: false } },
        { name: 'name', keypath: 'name', options: { unique: false } },
        { name: 'email', keypath: 'email', options: { unique: false } },
        { name: 'username', keypath: 'username', options: { unique: false } }
      ]
    },
    {
      store: 'comments',
      storeConfig: {
        keyPath: 'id',
        autoIncrement: false
      },
      storeSchema: [
        { name: 'id', keypath: 'id', options: { unique: false } },
        { name: 'postId', keypath: 'postId', options: { unique: false } },
        { name: 'name', keypath: 'name', options: { unique: false } },
        { name: 'email', keypath: 'email', options: { unique: false } },
        { name: 'body', keypath: 'body', options: { unique: false } }
      ]
    },
    {
      store: 'syncQueue',
      storeConfig: {
        keyPath: 'id',
        autoIncrement: true
      },
      storeSchema: [
        { name: 'operation', keypath: 'operation', options: { unique: false } },
        { name: 'data', keypath: 'data', options: { unique: false } },
        { name: 'timestamp', keypath: 'timestamp', options: { unique: false } }
      ]
    }
  ]
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withPreloading(PreloadAllModules)), /* To make routes accessible in offline mode*/
    provideAnimations(),
    provideHttpClient(withInterceptorsFromDi()),
    MatCommonModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatSidenavModule,
    MatListModule,
    MatTooltipModule,
    provideIndexedDb(dbConfig),
    { provide: 'environment', useValue: environment }
  ]
};
