export interface Post {
  id: number;
  userId: number;
  title: string;
  body: string;
  status?: string;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  syncStatus?: string;
  syncError?: string;
  tags?: string[];
}

export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  address?: {
    street: string;
    suite: string;
    city: string;
    zipcode: string;
    geo: {
      lat: string;
      lng: string;
    };
  };
  phone?: string;
  website?: string;
  company?: {
    name: string;
    catchPhrase: string;
    bs: string;
  };
}

export interface EnhancedPost extends Post {
  commentCount: number;
  likeCount: number;
  author: User;
  status?: string;
  syncStatus?: string;
  syncError?: string;
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: any;
}
