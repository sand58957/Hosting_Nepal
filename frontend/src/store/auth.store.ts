import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface User {
  id: string
  email: string
  name: string
  phone?: string
  role: string
  status: string
  emailVerified: boolean
  twoFactorEnabled: boolean
  createdAt: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  login: (user: User, accessToken: string, refreshToken?: string) => void
  logout: () => void
  setUser: (user: User) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      login: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken: refreshToken || null, isAuthenticated: true }),
      logout: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
      setUser: (user) => set({ user }),
    }),
    {
      name: 'hosting-nepal-auth',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') return localStorage
        return { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      }),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
