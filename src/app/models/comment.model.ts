export interface Comment {
  id?: number;
  postId: number;
  name: string;
  email: string;
  body: string;
  createdAt?: string;
  updatedAt?: string;
  syncStatus?: 'pending' | 'synced' | 'failed';
  syncError?: string;
}
