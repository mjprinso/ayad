import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { PostDeleteConfirmationComponent } from '../post-delete-confirmation/post-delete-confirmation.component';
import { OfflineStorageService } from '../../services/offline-storage.service';
import { User } from '../../models/user.model';
import { Post, EnhancedPost } from '../../models/post';
import { Comment } from '../../models/comment.model';
import { ApiService } from '../../services/api.service';
import { SyncService } from '../../services/sync.service';
import { SnackbarService } from '../../services/snackbar.service';
import { Observable, Subscription, forkJoin, of, throwError } from 'rxjs';
import { map, catchError, take, switchMap, tap } from 'rxjs/operators';
import { FormGroup, FormBuilder } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';

@Component({
  selector: 'app-post-list',
  templateUrl: './post-list.component.html',
  styleUrls: ['./post-list.component.scss'],
  standalone: true,
  imports: [
    SharedModule
  ]
})
export class PostListComponent implements OnInit, OnDestroy {
  posts: EnhancedPost[] = [];
  posts$: Observable<EnhancedPost[]> = of([]);
  allPosts: EnhancedPost[] = [];
  currentPage = 1;
  pageSize = 10;
  loading = false;
  error: string | null = null;
  hasMorePosts = true;
  private postsSubscription: Subscription | null = null;
  searchForm: FormGroup;
  private users: User[] = [];
  private comments: Comment[] = [];

  constructor(
    private readonly apiService: ApiService,
    private readonly syncService: SyncService,
    private readonly router: Router,
    private readonly dialog: MatDialog,
    private readonly snackbarService: SnackbarService,
    private readonly formBuilder: FormBuilder,
    private readonly offlineStorage: OfflineStorageService
  ) {
    this.searchForm = this.formBuilder.group({ query: [''] });
  }

  ngOnInit(): void {
    this.postsSubscription = this.searchForm.valueChanges.subscribe(() => {
      this.currentPage = 1;
      this.loadPosts();
    });
    
    // Load users and comments once at startup
    this.offlineStorage.dbReady$.pipe(
      take(1),
      switchMap((ready: boolean) => {
        if (!ready) {
          return forkJoin({
            users: this.apiService.getUsers().pipe(
              tap((apiUsers: User[]) => {
                if (apiUsers && apiUsers.length > 0) {
                  this.offlineStorage.addUsers(apiUsers).subscribe();
                }
              }),
              catchError(error => {
                console.error('Error loading users from API:', error);
                return of([]);
              })
            ),
            comments: this.apiService.getAllComments().pipe(
              tap((apiComments: Comment[]) => {
                if (apiComments && apiComments.length > 0) {
                  this.offlineStorage.addComments(apiComments).subscribe();
                }
              }),
              catchError(error => {
                console.error('Error loading comments from API:', error);
                return of([]);
              })
            )
          }).pipe(map(({ users, comments }) => ({ users, comments } as const)));
        }
        return forkJoin({
          users: this.offlineStorage.getAll(this.offlineStorage.stores.users),
          comments: this.offlineStorage.getAll(this.offlineStorage.stores.comments)
        }).pipe(
          switchMap(({ users: dbUsers, comments: dbComments }) => {
            if (!dbUsers || dbUsers.length === 0) {
              return this.apiService.getUsers().pipe(
                tap((apiUsers: User[]) => {
                  if (apiUsers && apiUsers.length > 0) {
                    this.offlineStorage.addUsers(apiUsers).subscribe();
                  }
                }),
                catchError(error => {
                  console.error('Error loading users from API:', error);
                  return of([]);
                })
              ).pipe(map(users => ({ users, comments: dbComments } as const)));
            }
            if (!dbComments || dbComments.length === 0) {
              return this.apiService.getAllComments().pipe(
                tap((apiComments: Comment[]) => {
                  if (apiComments && apiComments.length > 0) {
                    this.offlineStorage.addComments(apiComments).subscribe();
                  }
                }),
                catchError(error => {
                  console.error('Error loading comments from API:', error);
                  return of([]);
                })
              ).pipe(map(comments => ({ users: dbUsers, comments } as const)));
            }
            return of({ users: dbUsers, comments: dbComments } as const);
          })
        );
      })
    ).subscribe(({ users, comments }) => {
      this.users = users as User[];
      this.comments = comments as Comment[];
      this.loadPosts();
    }, (err) => {
      console.error('Error loading users and comments:', err);
    });
  }

  ngOnDestroy(): void {
    this.postsSubscription?.unsubscribe();
  }

  private enhancePosts(posts: Post[]): Observable<EnhancedPost[]> {
    return forkJoin({
      comments: this.apiService.getAllComments().pipe(catchError(() => of([])))
    }).pipe(
      map(({ comments }) =>
        posts.map(post => ({
          ...post,
          author: this.users.find(user => user.id === post.userId)?.name ?? 'Unknown Author',
          commentCount: comments.filter(comment => comment.postId === post.id).length,
          createdAt: new Date(post.createdAt ?? new Date()),
          updatedAt: new Date(post.updatedAt ?? new Date())
        } as EnhancedPost))
      )
    );
  }



  loadPosts(): void {
    this.loading = true;
    this.error = null;

    this.apiService.getPosts(this.currentPage, this.pageSize).pipe(
      catchError(error => {
        console.error('Error loading posts:', error);
        this.error = 'Failed to load posts. Please check your internet connection.';
        this.loading = false;
        return throwError(() => error);
      })
    ).subscribe(posts => {
      if (!posts.length) {
        this.hasMorePosts = false;
        this.loading = false;
        return;
      }

      this.enhancePosts(posts).subscribe(enhancedPosts => {
        this.posts = [...this.posts, ...enhancedPosts];
        this.posts$ = of(this.posts);
        this.hasMorePosts = posts.length === this.pageSize;
        this.loading = false;
      });
    });
  }

  loadMorePosts(): void {
    if (this.loading || !this.hasMorePosts) return;

    this.currentPage++;

    this.loading = true;
    this.apiService.getPosts(this.currentPage, this.pageSize).subscribe({
      next: posts => {
        if (!posts.length) {
          this.hasMorePosts = false;
          this.loading = false;
          return;
        }

        this.enhancePosts(posts).subscribe(enhancedPosts => {
          this.posts = [...this.posts, ...enhancedPosts];
          this.posts$ = of(this.posts);
          this.hasMorePosts = posts.length === this.pageSize;
          this.loading = false;
        });
      },
      error: err => {
        this.error = err.message ?? 'Failed to load more posts';
        this.loading = false;
      }
    });
  }

  deletePost(post: EnhancedPost): void {
    this.dialog.open(PostDeleteConfirmationComponent, {
      width: '400px',
      data: { title: post.title }
    }).afterClosed().subscribe(result => {
      if (!result) return;

      this.apiService.deletePost(Number(post.id)).pipe(
        catchError(error => {
          console.error('Error deleting post:', error);
          this.snackbarService.showError('Failed to delete post');
          return throwError(() => error);
        })
      ).subscribe({
        next: () => {
          this.allPosts = this.allPosts.filter(p => p.id !== post.id);
          this.posts = this.posts.filter(p => p.id !== post.id);
          this.posts$ = of(this.allPosts);
          this.snackbarService.showSuccess('Post deleted successfully');

          this.offlineStorage.delete(this.offlineStorage.stores.posts, Number(post.id)).pipe(
            catchError(err => {
              console.error('Error deleting from local storage:', err);
              return of(null);
            })
          ).subscribe();
        },
        error: err => {
          console.error('Final error deleting post:', err);
        }
      });
    });
  }

  truncateText(text: string): string {
    if (!text) return '';
    const allWords = text.split(' ');
    return allWords.length > 15 ? allWords.slice(0, 15).join(' ') + '...' : text;
  }
}
