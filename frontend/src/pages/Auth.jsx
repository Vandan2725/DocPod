import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import styles from './Auth.module.css'

export default function AuthPage() {
  const [mode, setMode]       = useState('login')
  const [form, setForm]       = useState({ name:'', email:'', password:'' })
  const [errors, setErrors]   = useState({})
  const [serverErr, setServerErr] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register }   = useAuth()
  const navigate              = useNavigate()

  const set = (k, v) => { setForm(f => ({...f,[k]:v})); setErrors(e => ({...e,[k]:''})); setServerErr('') }

  const validate = () => {
    const e = {}
    if (mode === 'register' && !form.name.trim()) e.name = 'Name is required'
    if (!form.email.trim())           e.email    = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.password)               e.password = 'Password is required'
    else if (form.password.length<6)  e.password = 'At least 6 characters'
    return e
  }

  const submit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setLoading(true)
    try {
      if (mode === 'login') await login(form.email, form.password)
      else await register(form.name, form.email, form.password)
      navigate('/')
    } catch (err) {
      setServerErr(err.response?.data?.detail || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (m) => { setMode(m); setErrors({}); setServerErr(''); setForm({ name:'', email:'', password:'' }) }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>DocPod</div>
        <div className={styles.tagline}>Turn documents into narrated video podcasts</div>

        <div className={styles.tabs}>
          <button className={`${styles.tab} ${mode==='login'?styles.tabActive:''}`} onClick={() => switchMode('login')}>Sign in</button>
          <button className={`${styles.tab} ${mode==='register'?styles.tabActive:''}`} onClick={() => switchMode('register')}>Register</button>
        </div>

        {serverErr && <div className={styles.serverErr}>{serverErr}</div>}

        <div className={styles.form}>
          {mode === 'register' && (
            <div className={styles.field}>
              <label className={styles.label}>Full name</label>
              <input className={`${styles.input} ${errors.name?styles.inputErr:''}`}
                placeholder="Jamie Davis" value={form.name} onChange={e=>set('name',e.target.value)} />
              {errors.name && <span className={styles.err}>{errors.name}</span>}
            </div>
          )}
          <div className={styles.field}>
            <label className={styles.label}>Email address</label>
            <input type="email" className={`${styles.input} ${errors.email?styles.inputErr:''}`}
              placeholder="you@example.com" value={form.email} onChange={e=>set('email',e.target.value)} />
            {errors.email && <span className={styles.err}>{errors.email}</span>}
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input type="password" className={`${styles.input} ${errors.password?styles.inputErr:''}`}
              placeholder="••••••••" value={form.password} onChange={e=>set('password',e.target.value)}
              onKeyDown={e => e.key==='Enter' && submit()} />
            {errors.password && <span className={styles.err}>{errors.password}</span>}
          </div>
          <button className={styles.submitBtn} onClick={submit} disabled={loading}>
            {loading ? 'Please wait…' : mode==='login' ? 'Sign in' : 'Create account'}
          </button>
        </div>

        <div className={styles.switchRow}>
          {mode==='login'
            ? <>No account? <span className={styles.link} onClick={() => switchMode('register')}>Register free</span></>
            : <>Have an account? <span className={styles.link} onClick={() => switchMode('login')}>Sign in</span></>}
        </div>
      </div>
    </div>
  )
}
