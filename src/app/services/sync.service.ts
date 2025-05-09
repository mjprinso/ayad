import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { OfflineStorageService } from './offline-storage.service';
import { Observable, of, forkJoin, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';

interface SyncOperation {
  operation: string;
  data: any;
  timestamp: number;
  entityType: string;
  type: string;
}
import { Comment } from '../models/comment.model';
import { User } from '../models/user.model';
import { Post } from '../models/post';

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private syncInProgress = false;
  private readonly syncInProgressSubject = new BehaviorSubject<boolean>(false);
  readonly syncInProgress$ = this.syncInProgressSubject.asObservable();

  constructor(
    private readonly apiService: ApiService,
    private readonly offlineStorage: OfflineStorageService
  ) {
    // Update sync status when sync queue changes
    this.offlineStorage.dbReady$.subscribe(isReady => {
      if (isReady) {
        this.offlineStorage.getSyncQueue().subscribe(queue => {
          this.syncInProgress = queue && queue.length > 0;
          this.syncInProgressSubject.next(this.syncInProgress);
        });
      }
    });
  }

  syncData(): Observable<void> {
    return forkJoin({
      posts: this.syncPosts(),
      comments: this.syncComments(),
      users: this.syncUsers()
    }).pipe(
      switchMap(() => {
        // Clear sync queue after successful sync
        return this.offlineStorage.clearSyncQueue();
      }),
      catchError(error => {
        console.error('Sync failed:', error);
        return of(void 0);
      })
    );
  }

  private syncPosts(): Observable<void> {
    return this.apiService.getPosts().pipe(
      switchMap(posts => {
        return this.offlineStorage.getAll<Post>('posts').pipe(
          map(localPosts => {
            // Handle conflicts and updates
            const updates = posts.map(post => {
              const localPost = localPosts.find(lp => lp.id === post.id);
              if (!localPost || (localPost.updatedAt && post.updatedAt && localPost.updatedAt < post.updatedAt)) {
                return this.offlineStorage.update('posts', { ...post });
              }
              return of(null);
            });
            return forkJoin(updates);
          }),
          switchMap(() => of(void 0)),
          catchError((error: any) => {
            console.error('Error syncing posts:', error);
            return throwError(() => new Error('Failed to sync posts'));
          })
        );
      })
    );
  }

  private syncComments(): Observable<void> {
    return this.apiService.getAllComments().pipe(
      switchMap((comments: Comment[]) => {
        return this.offlineStorage.update('comments', comments);
      }),
      catchError((error: any) => {
        console.error('Error syncing comments:', error);
        return throwError(() => new Error('Failed to sync comments'));
      })
    );
  }

  private syncUsers(): Observable<void> {
    return this.apiService.getUsers().pipe(
      switchMap((users: User[]) => {
        return this.offlineStorage.update('users', users);
      }),
      catchError((error: any) => {
        console.error('Error syncing users:', error);
        return throwError(() => new Error('Failed to sync users'));
      })
    );
  }

  queueSyncOperation(operation: SyncOperation): Observable<void> {
    return this.offlineStorage.getAll<SyncOperation>('syncQueue').pipe(
      switchMap((operations: SyncOperation[]) => {
        const updatedOperations = [...operations, operation];
        return this.offlineStorage.update('syncQueue', updatedOperations);
      }),
      catchError((error: any) => {
        console.error('Error queuing sync operation:', error);
        return throwError(() => new Error('Failed to queue sync operation'));
      })
    );
  }

  processSyncQueue(): Observable<void> {
    return this.offlineStorage.getSyncQueue().pipe(
      switchMap(operations => {
        const syncPromises = operations.map(operation => {
          const entityType = operation.entityType;
          const data = operation.data;
          
          switch (operation.type) {
            case 'create':
              if (entityType === 'post') {
                return this.apiService.createPost(data).pipe(
                  switchMap(post => this.offlineStorage.update('posts', { ...post }))
                );
              } else if (entityType === 'comment') {
                return this.apiService.createComment(data).pipe(
                  switchMap(comment => this.offlineStorage.update('comments', { ...comment }))
                );
              }
              break;
            case 'update':
              if (entityType === 'post') {
                return this.apiService.updatePost(data).pipe(
                  switchMap(post => this.offlineStorage.update('posts', { ...post }))
                );
              }
              break;
            case 'delete':
              if (entityType === 'post') {
                return this.apiService.deletePost(data.id).pipe(
                  switchMap(() => this.offlineStorage.delete('posts', data.id))
                );
              }
              break;
          }
          return of(null);
        });
        return forkJoin(syncPromises);
      }),
      switchMap(() => this.offlineStorage.clearSyncQueue())
    );
  }
}
