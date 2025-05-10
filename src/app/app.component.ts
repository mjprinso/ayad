import { Component, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { SnackbarService } from './services/snackbar.service';
import { NetworkStatusService } from './services/network-status.service';
import { SharedModule } from './shared/shared.module';
import { PostService } from './services/post.service';
import { CommentService } from './services/comment.service';

@Component({
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  standalone: true,
  imports: [
    SharedModule,
    RouterOutlet
  ],
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Blog Dashboard';
  isOnline = true;
  private readonly subscriptions: Subscription[] = [];
  private initialStatusSet = false;

  constructor(
    private readonly snackbarService: SnackbarService,
    private readonly networkStatusService: NetworkStatusService,
    private readonly postsService: PostService,
    private readonly commentService: CommentService
  ) {
    this.isOnline = this.networkStatusService.isOnline;
  }

  ngOnInit(): void {
    // Subscribe to network status changes
    const networkSubscription = this.networkStatusService.status$.subscribe(status => {
      this.isOnline = status;

      // Only show toast if this is not the initial status
      if (this.initialStatusSet) {
        if (status) {
          this.snackbarService.showSuccess('Back online', 3000);
          this.syncData();
        } else {
          this.snackbarService.showError('Offline mode', 3000);
        }
      } else {
        this.initialStatusSet = true;
      }
    });
    this.subscriptions.push(networkSubscription);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  syncData(): void {
    this.postsService.syncPendingPosts();
    this.commentService.syncPendingComments();
  }
}
