import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  loadSession,
  saveSession,
  uid,
  type LocalSession,
} from '@/lib/localStore'

interface AuthContextValue {
  session: LocalSession | null
  loading: boolean
  displayName: string | null
  deviceKey: string | null
  memberId: string | null
  setSession: (session: LocalSession) => Promise<void>
  updateDisplayName: (name: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  user: { id: string } | null
  profile: { id: string; display_name: string | null } | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function createDeviceKey() {
  return uid()
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<LocalSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSession().then((s) => {
      setSessionState(s)
      setLoading(false)
    })
  }, [])

  const setSession = async (next: LocalSession) => {
    await saveSession(next)
    setSessionState(next)
  }

  const updateDisplayName = async (name: string) => {
    if (!session) return { error: 'Ikke innlogget' }
    const next = { ...session, displayName: name.trim() }
    await setSession(next)
    return { error: null }
  }

  const signOut = async () => {
    await saveSession(null)
    setSessionState(null)
  }

  const user = session ? { id: session.memberId } : null
  const profile = session
    ? { id: session.memberId, display_name: session.displayName }
    : null

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        displayName: session?.displayName ?? null,
        deviceKey: session?.deviceKey ?? null,
        memberId: session?.memberId ?? null,
        setSession,
        updateDisplayName,
        signOut,
        user,
        profile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
