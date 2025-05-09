import { Post } from './post.model';
import { Comment } from './comment.model';
import { User } from './user.model';

export interface PostDetails {
  post: Post;
  comments: Comment[];
  author: User | null;
}
