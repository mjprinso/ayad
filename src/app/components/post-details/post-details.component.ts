import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription, Subject, takeUntil, map, filter, distinctUntilChanged } from 'rxjs';
import { Comment } from '../../models/comment.model';
import { PostDetails } from '../../models/post-details.model';
import { SnackbarService } from '../../services/snackbar.service';
import { SharedModule } from '../../shared/shared.module';
import { PostService } from '../../services/post.service';
import { CommentService } from '../../services/comment.service';

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
    private readonly snackbarService: SnackbarService,
    private readonly postService: PostService,
    private readonly commentsService: CommentService
  ) { }

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
          this.postService.getPostDetails(parseInt(postId)).subscribe(data => {
            this.postDetails = data;
            this.loading = false;
          });
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
      id: Number(`${new Date().getTime()}${Math.floor(Math.random() * 1000)}`),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending'
    };

    this.loading = true;
    this.commentsService.addComment(comment)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (addedComment: Comment) => {
          if (this.postDetails) {
            if (!this.postDetails.comments?.length) {
              this.postDetails.comments = [];
            }
            this.postDetails.comments.push(addedComment);
          }

          // Reset the newComment form
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
