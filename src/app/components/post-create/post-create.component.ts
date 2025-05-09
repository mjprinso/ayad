import { Component, OnInit } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { Post } from '../../models/post';
import { ApiService } from '../../services/api.service';
import { OfflineStorageService } from '../../services/offline-storage.service';
import { SyncService } from '../../services/sync.service';
import { SnackbarService } from '../../services/snackbar.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';

@Component({
  selector: 'app-post-create',
  templateUrl: './post-create.component.html',
  styleUrls: ['./post-create.component.scss'],
  standalone: true,
  imports: [
    SharedModule,
    FlexLayoutModule
  ]
})
export class PostCreateComponent implements OnInit {
  postForm: FormGroup;
  loading = false;
  error: string | null = null;
  isEditMode = false;
  postId: number | null = null;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly apiService: ApiService,
    private readonly offlineStorage: OfflineStorageService,
    private readonly syncService: SyncService,
    private readonly router: Router,
    private readonly snackbarService: SnackbarService,
    private readonly route: ActivatedRoute
  ) {
    this.postForm = this.formBuilder.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      body: ['', [Validators.required, Validators.minLength(10)]],
      status: ['draft']
    });

    // Get postId from route state
    this.route.queryParams.subscribe(params => {
      const postId = params['postId'];
      if (postId) {
        this.postId = parseInt(postId);
        this.isEditMode = true;
        this.loadPostData();
      }
    });
  }

  ngOnInit(): void {
    // Form is already initialized in constructor
  }

  loadPostData(): void {
    if (this.postId) {
      this.loading = true;
      this.apiService.getPost(this.postId).subscribe({
        next: (post: Post | null) => {
          this.loading = false;
          if (post) {
            this.postForm.patchValue({
              title: post.title,
              body: post.body,
              status: post.status
            });
          }
        },
        error: (err: any) => {
          this.loading = false;
          this.error = err.message ?? 'Failed to load post';
        }
      });
    }
  }

  onSubmit(): void {
    if (this.postForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = null;

    const post: Post = {
      title: this.postForm.get('title')?.value || '',
      body: this.postForm.get('body')?.value || '',
      userId: 1, // TODO: Get actual user ID
      id: this.isEditMode ? this.postId : null
    };

    if (this.isEditMode) {
      this.apiService.updatePost(post).subscribe({
        next: (updatedPost: Post | null) => {
          if (updatedPost) {
            this.snackbarService.showSuccess('Post updated successfully', 3000);
            this.router.navigate(['/posts']);
          }
        },
        error: (err: any) => {
          this.error = err.message ?? 'Failed to update post';
          this.loading = false;
        }
      });
    } else {
      this.apiService.createPost(post).subscribe({
        next: (newPost: Post | null) => {
          if (newPost) {
            this.snackbarService.showSuccess('Post created successfully', 3000);
            this.router.navigate(['/posts']);
          }
        },
        error: (err: any) => {
          this.error = err.message ?? 'Failed to create post';
          this.loading = false;
        }
      });
    }
  }
}
