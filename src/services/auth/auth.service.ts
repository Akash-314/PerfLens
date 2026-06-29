import type { AuthResponse } from './auth.types';

const API_BASE = 'http://localhost:5001/api/v1';

export const authService = {
  /**
   * Registers a new user.
   */
  async register(email: string, pass: string, name?: string): Promise<AuthResponse> {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass })
      });
      
      const data = await res.json();
      if (data.success && name && data.data?.email) {
        localStorage.setItem(`perflens_name_${data.data.email}`, name);
      }
      return data;
    } catch (e) {
      return { success: false, message: 'Server is currently unreachable. Please try again later.' };
    }
  },

  /**
   * Log in user with credentials.
   */
  async login(email: string, pass: string): Promise<AuthResponse> {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass })
      });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Server is currently unreachable. Please try again later.' };
    }
  },

  /**
   * Verifies existing session token.
   */
  async getMe(token: string): Promise<{ success: boolean; data?: { _id: string; email: string; role: 'user' | 'admin' }; message?: string }> {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'API connection failure.' };
    }
  }
};
export default authService;
