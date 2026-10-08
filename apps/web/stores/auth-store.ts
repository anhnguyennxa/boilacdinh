import type { UserDto } from '@foodhub/shared';
import { create } from 'zustand';

type Status = 'loading' | 'authenticated' | 'guest';

interface AuthState {
  status: Status;
  user: UserDto | null;
  /** Access token chỉ nằm trong bộ nhớ; refresh token nằm trong cookie httpOnly. */
  accessToken: string | null;
  setSession: (s: { user: UserDto; accessToken: string }) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  user: null,
  accessToken: null,
  setSession: ({ user, accessToken }) => set({ status: 'authenticated', user, accessToken }),
  clear: () => set({ status: 'guest', user: null, accessToken: null }),
}));
