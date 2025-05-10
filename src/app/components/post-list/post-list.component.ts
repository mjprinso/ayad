import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PostDeleteConfirmationComponent } from '../post-delete-confirmation/post-delete-confirmation.component';
import { User } from '../../models/user.model';
import { Post, EnhancedPost } from '../../models/post.model';
import { Comment } from '../../models/comment.model';
import { SnackbarService } from '../../services/snackbar.service';
import { Observable, Subscription, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FormGroup, FormBuilder } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { PostService } from '../../services/post.service';
import { CommentService } from '../../services/comment.service';
import { UserService } from '../../services/user.service';

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
  posts: Post[] = [];
  posts$: Observable<Post[]> = of([]);
  allPosts: EnhancedPost[] = [];
  currentPage = 1;
  pageSize = 10;
  loading = false;
  hasMorePosts = true;
  private readonly postsSubscription: Subscription | null = null;
  searchForm: FormGroup;
  users: User[] = [];
  comments: Comment[] = [];
  loadingMorePosts = false;

  constructor(
    private readonly dialog: MatDialog,
    private readonly snackbarService: SnackbarService,
    private readonly formBuilder: FormBuilder,
    private readonly postsService: PostService,
    private readonly commentsService: CommentService,
    private readonly usersService: UserService
  ) {
    this.searchForm = this.formBuilder.group({ query: [''] });
  }

  ngOnInit(): void {
    this.loadPosts();
    this.commentsService.fetchAndStoreAllComments().subscribe();
    this.usersService.fetchAndStoreAllUsers().subscribe();
  }

  ngOnDestroy(): void {
    this.postsSubscription?.unsubscribe();
  }

  loadPosts(isLoadMore: boolean = false): void {
    if (isLoadMore) {
      this.loadingMorePosts = true;
    } else {
      this.loading = true;
    }

    const loadOperation = isLoadMore
      ? this.postsService.loadMorePosts()
      : this.postsService.loadPosts();

    loadOperation.subscribe({
      next: (posts) => {
        if (isLoadMore) {
          this.posts = [...this.posts, ...posts];
          this.loadingMorePosts = false;
        } else {
          this.posts = posts;
          this.loading = false;
        }
        this.posts$ = of(this.posts);
      },
      error: (error) => {
        console.error(`Error ${isLoadMore ? 'loading more posts' : 'loading posts'}:`, error);
        if (isLoadMore) {
          this.loadingMorePosts = false;
        } else {
          this.loading = false;
        }
      }
    });
  }

  checkHasMore(): void {
    this.postsService.hasMorePosts(this.posts.length).subscribe(result => {
      this.hasMorePosts = result;
    });
  }

  deletePost(post: Post): void {
    this.dialog.open(PostDeleteConfirmationComponent, {
      width: '400px',
      data: { title: post.title }
    }).afterClosed().subscribe(result => {
      if (!result) return;

      this.postsService.deletePost(post.id).pipe(
        catchError(error => {
          console.error('Error deleting post:', error);
          this.snackbarService.showError('Failed to delete post');
          return throwError(() => error);
        })
      ).subscribe({
        next: () => {
          this.allPosts = this.allPosts.filter(p => p.id !== post.id);
          this.posts = this.posts.filter(p => p.id !== post.id);
          this.snackbarService.showSuccess('Post deleted successfully');
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
