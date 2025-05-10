import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Observable, from, of, throwError, forkJoin } from 'rxjs';
import { map, switchMap, tap, catchError } from 'rxjs/operators';
import { NetworkStatusService } from './network-status.service';
import { CommentService } from './comment.service';
import { UserService } from './user.service';
import { PostDetails } from '../models/post-details.model';
import { Post } from '../models/post.model';
@Injectable({ providedIn: 'root' })
export class PostService {
    private readonly API = 'https://jsonplaceholder.typicode.com/posts';
    private readonly pageSize = 20;
    private currentPage = 0;

    constructor(
        private readonly http: HttpClient,
        private readonly db: NgxIndexedDBService,
        private readonly networkStatus: NetworkStatusService,
        private readonly commentsService: CommentService,
        private readonly usersService: UserService
    ) { }

    loadPosts(): Observable<any[]> {
        if (!this.networkStatus.isOnline) {
            return this.getOfflinePosts(0);
        }

        return from(this.db.count('posts')).pipe(
            switchMap(count => {
                const freshPosts$ = this.fetchPaginatedPosts(0);

                if (count === 0) {
                    this.fetchAndStoreAllPosts().subscribe();
                }

                return freshPosts$;
            })
        );
    }

    loadMorePosts(): Observable<any[]> {
        this.currentPage++;
        const start = this.currentPage * this.pageSize;

        if (!this.networkStatus.isOnline) {
            return this.getOfflinePosts(start);
        }

        return from(this.db.count('posts')).pipe(
            switchMap(count => {
                if (count === 0) {
                    return this.fetchAndStoreAllPosts().pipe(
                        switchMap(() => this.fetchPaginatedPosts(start))
                    );
                } else {
                    return this.fetchPaginatedPosts(start);
                }
            })
        );
    }

    getPostById(postId: number): Observable<Post> {
        if (!this.networkStatus.isOnline) {
            return from(this.db.getByKey<Post>('posts', postId)).pipe(
                switchMap(post => post ? of(post) : throwError(() => new Error('Post not found in offline DB')))
            );
        }

        return this.http.get<Post>(`${this.API}/${postId}`).pipe(
            switchMap(post =>
                from(this.db.update('posts', post)).pipe(map(() => post))
            ),
            catchError(() =>
                from(this.db.getByKey<Post>('posts', postId)).pipe(
                    switchMap(post => post ? of(post) : throwError(() => new Error('Post not found in offline DB')))
                )
            )
        );
    }

    getPostDetails(postId: number): Observable<PostDetails> {
        return this.getPostById(postId).pipe(
            switchMap(post => {
                return forkJoin({
                    post: of(post),
                    comments: this.commentsService.getCommentsByPostId(Number(post.id)),
                    user: this.usersService.getUserById(Number(post.userId))
                }).pipe(
                    map(result => ({
                        post: result.post,
                        comments: result.comments,
                        author: result.user || null
                    }))
                );
            }),
            catchError(error => {
                console.error('Failed to get post details', error);
                return throwError(() => error);
            })
        );
    }

    private fetchPaginatedPosts(start: number): Observable<any[]> {
        const url = `${this.API}?_start=${start}&_limit=${this.pageSize}`;
        return this.http.get<any[]>(url);
    }

    private getOfflinePosts(start: number): Observable<any[]> {
        return from(this.db.getAll('posts')).pipe(
            map(posts => posts.slice(start, start + this.pageSize)),
            switchMap(paged => {
                if (paged.length === 0) {
                    return throwError(() => new Error('No offline data available.'));
                }
                return of(paged);
            })
        );
    }


    fetchAndStoreAllPosts(): Observable<any[]> {
        return this.http.get<any[]>(this.API).pipe(
            switchMap(posts => from(this.db.bulkPut('posts', posts)).pipe(map(() => posts)))
        );
    }


    deletePost(postId: number): Observable<void> {
        if (this.networkStatus.isOnline) {
            return this.http.delete(`${this.API}/${postId}`).pipe(
                switchMap(() => from(this.db.delete('posts', postId)).pipe(map(() => void 0)))
            );
        } else {
            return from(this.db.getByKey<Post>('posts', postId)).pipe(
                switchMap(post => {
                    if (!post) return throwError(() => new Error('Post not found in IndexedDB'));
                    post.syncStatus = 'delete-pending';
                    return from(this.db.update('posts', post)).pipe(map(() => void 0));
                })
            );
        }
    }


    resetPagination(): void {
        this.currentPage = 0;
    }

    hasMorePosts(totalLoaded: number): Observable<boolean> {
        if (!this.networkStatus.isOnline) {
            return from(this.db.count('posts')).pipe(
                map(total => totalLoaded < total)
            );
        }

        const TOTAL_POSTS_AVAILABLE = 100;
        return of(totalLoaded < TOTAL_POSTS_AVAILABLE);
    }

    createPost(post: Post): Observable<Post> {
        if (this.networkStatus.isOnline) {
            return this.http.post<Post>(this.API, post).pipe(
                switchMap(savedPost => {
                    savedPost.syncStatus = 'synced';
                    if (savedPost.id && savedPost.id !== 0) {
                        return from(this.db.update('posts', savedPost)).pipe(
                            map(() => savedPost)
                        );
                    } else {
                        return throwError(() => new Error('Failed to receive valid ID from API.'));
                    }
                }),
                catchError(() => {
                    post.syncStatus = 'pending';
                    return from(this.db.add('posts', post)).pipe(map(() => post));
                })
            );
        } else {
            post.syncStatus = 'pending';
            return from(this.db.add('posts', post)).pipe(map(() => post));
        }
    }

    updatePost(post: Post): Observable<Post> {
        if (this.networkStatus.isOnline) {
            return this.http.put<Post>(`${this.API}/${post.id}`, post).pipe(
                switchMap(updatedPost => {
                    updatedPost.syncStatus = 'synced';
                    return from(this.db.update('posts', updatedPost)).pipe(
                        map(() => updatedPost)
                    );
                }),
                catchError(() => {
                    post.syncStatus = 'failed';
                    return from(this.db.update('posts', post)).pipe(map(() => post));
                })
            );
        } else {
            post.syncStatus = 'pending';
            return from(this.db.update('posts', post)).pipe(map(() => post));
        }
    }

    syncPendingPosts(): Observable<void> {
        return from(this.db.getAll<Post>('posts')).pipe(
            tap((posts: Post[]) => {
                const pending = posts.filter((p: Post) => p.syncStatus === 'pending');
                const toDelete = posts.filter((p: Post) => p.syncStatus === 'delete-pending');

                pending.forEach((post: Post) => {
                    this.http.post(this.API, post).subscribe({
                        next: (res) => {
                            post.syncStatus = 'synced';
                            this.db.update('posts', post);
                        },
                        error: () => {
                            post.syncStatus = 'failed';
                            this.db.update('posts', post);
                        }
                    });
                });

                toDelete.forEach((post: Post) => {
                    this.http.delete(`${this.API}/${post.id}`).subscribe({
                        next: () => {
                            this.db.delete('posts', post.id);
                        },
                        error: () => {
                            post.syncStatus = 'delete-failed';
                            this.db.update('posts', post);
                        }
                    });
                });
            }),
            map(() => undefined)
        );
    }


}
