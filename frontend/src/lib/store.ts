import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from './api'

interface User {
  id: string
  email: string
  full_name: string
  kennel_name?: string
  breeds?: string[]
  subscription_plan: string
  subscription_active: boolean
  stripe_onboarded: boolean
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: any) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  setUser: (user: User) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const res = await authApi.login({ email, password })
          const { access_token, user } = res.data
          localStorage.setItem('ld_token', access_token)
          set({ token: access_token, user, isLoading: false })
        } catch (err) {
          set({ isLoading: false })
          throw err
        }
      },

      register: async (data) => {
        set({ isLoading: true })
        try {
          const res = await authApi.register(data)
          const { access_token, user } = res.data
          localStorage.setItem('ld_token', access_token)
          set({ token: access_token, user, isLoading: false })
        } catch (err) {
          set({ isLoading: false })
          throw err
        }
      },

      logout: () => {
        localStorage.removeItem('ld_token')
        localStorage.removeItem('ld_user')
        set({ user: null, token: null })
        window.location.href = '/login'
      },

      refreshUser: async () => {
        try {
          const res = await authApi.me()
          set({ user: res.data })
        } catch {
          get().logout()
        }
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'ld-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
)

export const isPro = (user: User | null) =>
  user?.subscription_active && ['pro', 'kennel'].includes(user.subscription_plan || '')
