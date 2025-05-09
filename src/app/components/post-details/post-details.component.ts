import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription, Subject, takeUntil, map, filter, distinctUntilChanged } from 'rxjs';
import { PostDetailsService } from '../../services/post-details.service';
import { Comment } from '../../models/comment.model';
import { PostDetails } from '../../models/post-details.model';
import { SnackbarService } from '../../services/snackbar.service';
import { SharedModule } from '../../shared/shared.module';

interface NewComment {
  name: string;
  email: string;
  body: string;
}

@Component({
  selector: 'app-post-details',
  templateUrl: './post-details.component.html',
  styleUrls: ['./post-details.component.scss'],
  standalone: true,
  imports: [SharedModule]
})
export class PostDetailsComponent implements OnInit, OnDestroy {
  postDetails: PostDetails | null = null;
  loading = true;
  private subscription: Subscription | null = null;
  private readonly destroy$ = new Subject<void>();
  newComment: NewComment = {
    name: '',
    email: '',
    body: ''
  };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly postDetailsService: PostDetailsService,
    private readonly snackbarService: SnackbarService
  ) {}

  ngOnInit(): void {
    this.setupRouteSubscription();
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupRouteSubscription(): void {
    this.subscription = this.route.paramMap
      .pipe(
        map(params => params.get('id')),
        filter(id => !!id),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(postId => {
        if (postId) {
          this.fetchPostDetails(postId);
        }
      });
  }

  private fetchPostDetails(postId: string): void {
    this.loading = true;
    this.postDetailsService.getPostDetails(parseInt(postId))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.postDetails = data;
          this.loading = false;
        },
        error: (error) => {
          this.snackbarService.showError('Failed to fetch post details', 3000);
          this.loading = false;
        }
      });
  }

  addComment(): void {
    if (!this.postDetails) {
      this.snackbarService.showError('Post details not available', 3000);
      return;
    }

    if (!this.newComment.body.trim()) {
      this.snackbarService.showError('Comment cannot be empty', 3000);
      return;
    }

    const comment: Comment = {
      name: this.newComment.name,
      email: this.newComment.email,
      body: this.newComment.body,
      postId: this.postDetails.post.id,
      id: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending'
    };

    this.loading = true;
    this.postDetailsService.addComment(this.postDetails.post.id, comment)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (addedComment: Comment) => {
          if (this.postDetails) {
            if (!this.postDetails.comments) {
              this.postDetails.comments = [];
            }
            this.postDetails.comments.push(addedComment);
          }
          
          this.newComment = {
            name: '',
            email: '',
            body: ''
          };
          
          this.snackbarService.showSuccess('Comment added successfully', 3000);
          this.loading = false;
        },
        error: (error) => {
          console.error('Error adding comment:', error);
          this.snackbarService.showError('Failed to add comment', 3000);
          this.loading = false;
        }
      });
  }
}
