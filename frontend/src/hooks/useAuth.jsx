import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../api'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(() => { try { return JSON.parse(localStorage.getItem('user')) } catch { return null } })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      authAPI.me()
        .then(r => { setUser(r.data); localStorage.setItem('user', JSON.stringify(r.data)) })
        .catch(() => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null) })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const _store = (data) => {
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('user',  JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  const login    = async (email, pw)        => _store((await authAPI.login(email, pw)).data)
  const register = async (name, email, pw)  => _store((await authAPI.register(name, email, pw)).data)
  const logout   = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null) }
  const update   = async (data) => {
    const r = await authAPI.update(data)
    setUser(r.data)
    localStorage.setItem('user', JSON.stringify(r.data))
    return r.data
  }

  return <Ctx.Provider value={{ user, loading, login, register, logout, update }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
