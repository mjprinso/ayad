export interface Post {
  id?: number | null;
  title: string;
  body: string;
  userId: number;
  status?: string;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  syncStatus?: string;
  syncError?: string;
  tags?: string[];
}

export interface EnhancedPost extends Post {
  commentCount: number;
}
