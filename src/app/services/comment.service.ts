import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { from, Observable } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { NetworkStatusService } from './network-status.service';
import { Comment } from '../models/comment.model';

@Injectable({ providedIn: 'root' })
export class CommentService {
    private readonly API = 'https://jsonplaceholder.typicode.com/comments';

    constructor(
        private readonly http: HttpClient,
        private readonly db: NgxIndexedDBService,
        private readonly networkStatus: NetworkStatusService
    ) { }

    fetchAndStoreAllComments(): Observable<any[]> {
        return this.http.get<any[]>(this.API).pipe(
            switchMap(comments =>
                from(this.db.bulkPut('comments', comments)).pipe(map(() => comments))
            )
        );
    }

    getCommentsByPostId(postId: number): Observable<any[]> {
        if (!this.networkStatus.isOnline) {
            return this.getOfflineCommentsByPostId(postId);
        }

        return this.http.get<any[]>(`${this.API}?postId=${postId}`).pipe(
            switchMap(comments =>
                from(this.db.bulkPut('comments', comments)).pipe(map(() => comments))
            ),
            // fallback if API fails
            switchMap(() => this.getOfflineCommentsByPostId(postId))
        );
    }

    private getOfflineCommentsByPostId(postId: number): Observable<Comment[]> {
        return from(this.db.getAll<Comment>('comments')).pipe(
            map(all => all.filter(comment => comment.postId === postId))
        );
    }


    addComment(comment: Comment): Observable<Comment> {
        if (this.networkStatus.isOnline) {
            return this.http.post<Comment>(this.API, comment).pipe(
                switchMap((savedComment: Comment) => {
                    savedComment.syncStatus = 'synced';
                    return from(this.db.add('comments', savedComment)).pipe(
                        map(() => savedComment)
                    );
                }),
                catchError(error => {
                    const offlineComment = { ...comment, syncStatus: 'pending' };
                    return from(this.db.add('comments', offlineComment)).pipe(
                        map(() => offlineComment as Comment)
                    );
                })
            );
        } else {
            const offlineComment = { ...comment, syncStatus: 'pending' };
            return from(this.db.add('comments', offlineComment)).pipe(
                map(() => offlineComment as Comment)
            );
        }
    }

    syncPendingComments(): void {
        this.db.getAll<Comment>('comments').subscribe(comments => {
            const pending = comments.filter(c => c.syncStatus === 'pending');
            pending.forEach(comment => {
                this.http.post(this.API, comment).subscribe({
                    next: res => {
                        comment.syncStatus = 'synced';
                        this.db.update('comments', comment);
                    },
                    error: () => {
                        comment.syncStatus = 'failed';
                        this.db.update('comments', comment);
                    }
                });
            });
        });
    }
}
