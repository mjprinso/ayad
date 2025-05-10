import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Post } from '../../models/post.model';

@Component({
  selector: 'app-post-delete-confirmation',
  templateUrl: './post-delete-confirmation.component.html',
  styleUrls: ['./post-delete-confirmation.component.scss'],
  imports: [MatIconModule, MatButtonModule],
  standalone: true
})
export class PostDeleteConfirmationComponent {
  constructor(
    public dialogRef: MatDialogRef<PostDeleteConfirmationComponent>,
    @Inject(MAT_DIALOG_DATA) public post: Post
  ) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
