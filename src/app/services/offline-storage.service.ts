import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { take, filter, map, switchMap } from 'rxjs/operators';
import { Post } from '../models/post';
import { Comment } from '../models/comment.model';
import { User } from '../models/user.model';

interface SyncOperation {
  operation: string;
  data: any;
  timestamp: number;
  entityType: string;
  type: string;
}

export interface StoreNames {
  syncQueue: 'syncQueue';
  users: 'users';
  comments: 'comments';
  posts: 'posts';
}

@Injectable({
  providedIn: 'root'
})
export class OfflineStorageService {
  private db: IDBDatabase | null = null;
  private readonly dbReadySubject = new BehaviorSubject<boolean>(false);
  public readonly dbReady$ = this.dbReadySubject.asObservable();

  public readonly stores: StoreNames = {
    syncQueue: 'syncQueue',
    users: 'users',
    comments: 'comments',
    posts: 'posts'
  };

  constructor() {
    this.initializeDatabase().catch(error => {
      console.error('Failed to initialize database:', error);
      this.dbReadySubject.next(false);
    });
  }

  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Try to close any existing connection first
        if (this.db) {
          this.db.close();
          this.db = null;
        }

        console.log('Attempting to open IndexedDB database...');
        const request = indexedDB.open('blogDB', 1);

        request.onerror = (event) => {
          const error = (event.target as IDBOpenDBRequest).error;
          console.error('Database error:', {
            message: error?.message,
            code: error?.code,
            name: error?.name,
            stack: error?.stack
          });
          this.dbReadySubject.next(false);
          reject(new Error(`Failed to open database: ${error?.message ?? 'Unknown error'}`));
        };

        request.onblocked = (event) => {
          console.warn('Database is blocked by another connection');
          // Try to close the blocking connection
          if (this.db) {
            this.db.close();
            this.db = null;
          }
          // Wait and try again
          setTimeout(() => {
            this.initializeDatabase().then(resolve).catch(reject);
          }, 1000);
        };

        request.onupgradeneeded = (event) => {
          console.log('Database upgrade needed');
          const db = (event.target as IDBOpenDBRequest).result;
          const version = event.oldVersion;

          // Clear all existing object stores
          if (db.objectStoreNames.contains(this.stores.syncQueue)) {
            db.deleteObjectStore(this.stores.syncQueue);
          }
          if (db.objectStoreNames.contains(this.stores.users)) {
            db.deleteObjectStore(this.stores.users);
          }
          if (db.objectStoreNames.contains(this.stores.comments)) {
            db.deleteObjectStore(this.stores.comments);
          }
          if (db.objectStoreNames.contains(this.stores.posts)) {
            db.deleteObjectStore(this.stores.posts);
          }

          // Create fresh object stores
          db.createObjectStore(this.stores.syncQueue, { autoIncrement: true });
          db.createObjectStore(this.stores.users, { keyPath: 'id' });
          db.createObjectStore(this.stores.comments, { keyPath: 'id' });
          db.createObjectStore(this.stores.posts, { keyPath: 'id' });

          if (version > 0) {
            console.log('Migrating database from version', version, 'to version 1');
          }
        };

        request.onsuccess = (event) => {
          console.log('Database opened successfully');
          this.db = (event.target as IDBOpenDBRequest).result;
          
          // Wait for the next animation frame to ensure all async operations are complete
          requestAnimationFrame(() => {
            this.dbReadySubject.next(true);
            resolve();
          });
        };
      } catch (error) {
        console.error('Database initialization failed:', error);
        this.dbReadySubject.next(false);
        reject(error);
      }
    });
  }

  public isDatabaseReady(): boolean {
    return this.dbReadySubject.value;
  }

  private executeRequest<T>(
    storeName: StoreNames[keyof StoreNames],
    mode: 'readonly' | 'readwrite',
    operation: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>
  ): Observable<T> {
    if (!this.db) {
      return throwError(() => new Error('Database not initialized'));
    }

    return new Observable<T>((observer) => {
      if (!this.db) {
        observer.error(new Error('Database not initialized'));
        return;
      }

      try {
        const transaction = this.db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        const request = operation(store);

        if (request instanceof IDBRequest) {
          request.onsuccess = () => {
            observer.next(request.result);
            observer.complete();
          };
          request.onerror = () => observer.error(request.error);
        } else {
          request.then(result => {
            observer.next(result);
            observer.complete();
          }).catch(error => observer.error(error));
        }
      } catch (error) {
        observer.error(error);
      }
    });
  }

  public update<T extends object>(storeName: StoreNames[keyof StoreNames], data: T): Observable<void> {
    return this.executeRequest(storeName, 'readwrite', store => store.put(data)).pipe(map(() => undefined));
  }

  public add<T>(storeName: StoreNames[keyof StoreNames], data: T): Observable<void> {
    return this.executeRequest(storeName, 'readwrite', (store) => {
      store.add(data);
      return Promise.resolve();
    });
  }

  public delete(storeName: StoreNames[keyof StoreNames], id: number): Observable<void> {
    return this.executeRequest(storeName, 'readwrite', store => store.delete(id)).pipe(map(() => undefined));
  }

  public getAll<T>(storeName: StoreNames[keyof StoreNames]): Observable<T[]> {
    return this.executeRequest(storeName, 'readonly', store => store.getAll());
  }

  public getById<T>(storeName: StoreNames[keyof StoreNames], id: number): Observable<T> {
    return this.executeRequest(storeName, 'readonly', store => store.get(id));
  }

  public bulkAdd<T>(storeName: StoreNames[keyof StoreNames], data: T[]): Observable<void> {
    return new Observable(observer => {
      if (!this.db) {
        observer.error(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      data.forEach(item => store.add(item));

      transaction.oncomplete = () => {
        observer.next();
        observer.complete();
      };

      transaction.onerror = () => {
        observer.error(transaction.error);
      };
    });
  }

  public addToSyncQueue(operation: SyncOperation): Observable<void> {
    return this.add(this.stores.syncQueue, {
      ...operation,
      timestamp: Date.now()
    }).pipe(map(() => undefined));
  }

  public getSyncQueue(): Observable<SyncOperation[]> {
    return this.getAll(this.stores.syncQueue);
  }

  public clearSyncQueue(): Observable<void> {
    return this.executeRequest(this.stores.syncQueue, 'readwrite', store => {
      store.clear();
      return Promise.resolve(undefined);
    });
  }

  public deletePost(id: number): Observable<void> {
    return this.dbReady$.pipe(
      take(1),
      filter(ready => ready),
      switchMap(() => this.executeRequest(this.stores.posts, 'readwrite', store => store.delete(id)))
    );
  }

  // Convenience methods for common operations
  public addPosts(posts: Post[]): Observable<void> {
    return this.bulkAdd(this.stores.posts, posts);
  }

  public addComments(comments: Comment[]): Observable<void> {
    return this.bulkAdd(this.stores.comments, comments);
  }

  public addUsers(users: User[]): Observable<void> {
    return this.bulkAdd(this.stores.users, users);
  }

  public getPosts(): Observable<Post[]> {
    return this.getAll(this.stores.posts);
  }

  public getComments(): Observable<Comment[]> {
    return this.getAll(this.stores.comments);
  }

  public getUsers(): Observable<User[]> {
    return this.getAll(this.stores.users);
  }
}
