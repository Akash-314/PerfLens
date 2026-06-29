export interface User {
  id?: string;
  email: string;
  role: 'user' | 'admin';
  name?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: {
    _id: string;
    email: string;
    role: 'user' | 'admin';
    token: string;
  };
}
