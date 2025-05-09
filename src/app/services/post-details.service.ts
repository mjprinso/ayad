import { Injectable } from '@angular/core';
import { Observable, forkJoin, catchError, throwError } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { PostDetails } from '../models/post-details.model';
import { Comment } from '../models/comment.model';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class PostDetailsService {
  constructor(
    private readonly apiService: ApiService
  ) {}

  getPostDetails(postId: number): Observable<PostDetails> {
    return this.apiService.getPost(postId).pipe(
      switchMap(post => {
        if (!post) {
          return throwError(() => new Error('Post not found'));
        }
        return forkJoin({
          comments: this.apiService.getComments(postId),
          users: this.apiService.getUsers()
        }).pipe(
          map(({ comments, users }) => {
            const author = users.find(user => user.id === post.userId) || null;
            return {
              post,
              author,
              comments
            } as PostDetails;
          }),
          catchError(apiError => {
            console.error('Error fetching from API:', apiError);
            return throwError(() => new Error('Failed to fetch post details'));
          })
        );
      })
    );
  }

  addComment(postId: number, comment: Comment): Observable<Comment> {
    if (!postId) {
      throw new Error('Post ID is required');
    }
    if (!comment) {
      throw new Error('Comment data is required');
    }
    return this.apiService.addComment(postId, comment);
  }
}
