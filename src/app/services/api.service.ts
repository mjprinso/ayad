import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, of, throwError, from, forkJoin } from 'rxjs';
import { map, catchError, mergeMap, tap } from 'rxjs/operators';
import { Post } from '../models/post';
import { Comment } from '../models/comment.model';
import { User } from '../models/user.model';
import { EnhancedPost } from '../models/enhanced-post.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly apiUrl = 'https://jsonplaceholder.typicode.com';

  constructor(
    private readonly http: HttpClient
  ) {}

  getPosts(page: number = 1, limit: number = 10): Observable<EnhancedPost[]> {
    const params = new HttpParams()
      .set('_page', page.toString())
      .set('_limit', limit.toString());

    return forkJoin({
      posts: this.http.get<Post[]>(`${this.apiUrl}/posts`, { params }),
      users: this.http.get<User[]>(`${this.apiUrl}/users`)
    }).pipe(
      map(({ posts, users }) => {
        return posts.map(post => ({
          id: post.id || 0,
          userId: post.userId,
          title: post.title,
          body: post.body,
          status: post.status,
          createdAt: post.createdAt ? new Date(post.createdAt) : new Date(),
          updatedAt: new Date(post.updatedAt ?? new Date()),
          syncStatus: post.syncStatus,
          syncError: post.syncError,
          tags: post.tags,
          commentCount: 0,
          likeCount: 0,
          author: users.find(user => user.id === post.userId) ?? {
            id: post.userId,
            name: 'Unknown Author',
            username: '',
            email: '',
            address: undefined,
            phone: undefined,
            website: undefined,
            company: undefined
          }
        }));
      }),
      catchError(this.handleError)
    );
  }

  getPost(id: number): Observable<Post | null> {
    return this.http.get<Post>(`${this.apiUrl}/posts/${id}`).pipe(
      map((post: Post) => post || null),
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching post:', error);
        return throwError(() => new Error('Failed to fetch post'));
      })
    );
  }

  getComments(postId: number): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.apiUrl}/posts/${postId}/comments`).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching comments:', error);
        return throwError(() => new Error('Failed to fetch comments'));
      })
    );
  }

  getAllComments(): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.apiUrl}/comments`).pipe(
      catchError(this.handleError)
    );
  }

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`).pipe(
      catchError(this.handleError)
    );
  }

  getUser(id: number): Observable<User | null> {
    return this.http.get<User>(`${this.apiUrl}/users/${id}`).pipe(
      map((user: User) => user || null),
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching user:', error);
        return throwError(() => new Error('Failed to fetch user'));
      })
    );
  }

  createPost(post: Post): Observable<Post> {
    return this.http.post<Post>(`${this.apiUrl}/posts`, post).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error creating post:', error);
        return throwError(() => new Error('Failed to create post'));
      })
    );
  }

  createComment(comment: Comment): Observable<Comment> {
    return this.http.post<Comment>(`${this.apiUrl}/comments`, comment).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    if (error.error instanceof ErrorEvent) {
      console.error('An error occurred:', error.error.message);
    } else {
      console.error(
        `Backend returned code ${error.status}, ` +
        `body was: ${error.error}`
      );
    }
    return throwError(() => new Error('Something bad happened; please try again later.'));
  }




  deletePost(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/posts/${id}`).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error deleting post:', error);
        return throwError(() => new Error('Failed to delete post'));
      })
    );
  }

  updatePost(post: Post): Observable<Post | null> {
    return this.http.put<Post>(`${this.apiUrl}/posts/${post.id}`, post).pipe(
      map((post: Post) => post || null),
      catchError((error: HttpErrorResponse) => {
        console.error('Error updating post:', error);
        return throwError(() => new Error('Failed to update post'));
      })
    );
  }

  addComment(postId: number, comment: Comment): Observable<Comment> {
    return this.http.post<Comment>(`${this.apiUrl}/posts/${postId}/comments`, comment).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error adding comment:', error);
        return throwError(() => new Error('Failed to add comment'));
      })
    );
  }
}
