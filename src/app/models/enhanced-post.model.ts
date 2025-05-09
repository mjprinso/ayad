import { User } from './user.model';

export interface EnhancedPost {
  id: number;
  userId: number;
  title: string;
  body: string;
  author: User;
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
  status?: string;
  syncStatus?: string;
  syncError?: string;
  tags?: string[];
}
