import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Comment } from '../models/comment.model';
import { Post } from '../models/post';

@Injectable({
  providedIn: 'root'
})
export class PostService {
  private readonly apiUrl = 'https://api.example.com'; // Replace with your actual API URL

  constructor(
    private readonly http: HttpClient
  ) { }

  getPosts(skip: number = 0, take: number = 10, query: string = '', field: string = 'title'): Observable<Post[]> {
    const params = new HttpParams()
      .set('skip', skip.toString())
      .set('take', take.toString())
      .set('query', query)
      .set('field', field);

    return this.http.get<Post[]>(`${this.apiUrl}/posts`, { params }).pipe(
      catchError(error => {
        console.error('Error fetching posts:', error);
        return of([]);
      })
    );
  }

  getPost(id: number): Observable<Post> {
    return this.http.get<Post>(`${this.apiUrl}/posts/${id}`).pipe(
      catchError(error => {
        console.error('Error fetching post:', error);
        return throwError(() => new Error('Failed to fetch post'));
      })
    );
  }

  getComments(postId: number): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.apiUrl}/posts/${postId}/comments`).pipe(
      catchError(error => {
        console.error('Error fetching comments:', error);
        return of([]);
      })
    );
  }

  addComment(postId: number, comment: Comment): Observable<Comment> {
    return this.http.post<Comment>(`${this.apiUrl}/posts/${postId}/comments`, comment).pipe(
      map(response => ({
        ...comment,
        id: response.id,
        postId
      })),
      catchError(error => {
        console.error('Error adding comment:', error);
        return throwError(() => new Error('Failed to add comment'));
      })
    );
  }

  createComment(comment: Comment): Observable<Comment> {
    return this.http.post<Comment>(`${this.apiUrl}/comments`, comment).pipe(
      map(response => ({
        ...comment,
        id: response.id
      })),
      catchError(error => {
        console.error('Error creating comment:', error);
        throw error;
      })
    );
  }

  createPost(post: Post): Observable<Post> {
    return this.http.post<Post>(`${this.apiUrl}/posts`, post).pipe(
      catchError(error => {
        console.error('Error creating post:', error);
        throw error;
      })
    );
  }

  deleteComment(commentId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/comments/${commentId}`).pipe(
      catchError(error => {
        console.error('Error deleting comment:', error);
        throw error;
      })
    );
  }

  updatePost(post: Post): Observable<Post> {
    return this.http.put<Post>(`${this.apiUrl}/posts/${post.id}`, post).pipe(
      catchError(error => {
        console.error('Error updating post:', error);
        throw error;
      })
    );
  }

  deletePost(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/posts/${id}`).pipe(
      catchError(error => {
        console.error('Error deleting post:', error);
        throw error;
      })
    );
  }

  searchPosts(query: string): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.apiUrl}/posts?q=${query}`).pipe(
      catchError(error => {
        console.error('Error searching posts:', error);
        return of([]);
      })
    );
  }

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(error);
      console.log(`${operation} failed: ${error.message}`);
      return of(result as T);
    };
  }
}
