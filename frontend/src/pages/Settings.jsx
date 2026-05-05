import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { Button, Input, ToastContainer } from '../components/UI'
import styles from './Settings.module.css'

const VOICES = [
  { id: 'nova',    name: 'Nova',    desc: 'Warm & friendly' },
  { id: 'onyx',    name: 'Onyx',    desc: 'Deep & authoritative' },
  { id: 'shimmer', name: 'Shimmer', desc: 'Clear & articulate' },
  { id: 'echo',    name: 'Echo',    desc: 'Neutral & calm' },
]
const STORAGE_KEY = 'docpod_preferences'

export default function SettingsPage() {
  const { user, update, logout } = useAuth()
  const { toasts, toast } = useToast()

  // Account form
  const [name, setName]   = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [password, setPassword] = useState('')
  const [savingAccount, setSavingAccount] = useState(false)

  // Preferences
  const [voice, setVoice] = useState('nova')
  const [speed, setSpeed] = useState(1.0)

  useEffect(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      if (prefs.voice) setVoice(prefs.voice)
      if (prefs.speed) setSpeed(prefs.speed)
    } catch {}
  }, [])

  const saveAccount = async () => {
    setSavingAccount(true)
    try {
      const payload = { name, email }
      if (password) payload.password = password
      await update(payload)
      toast('Account updated!', 'success')
      setPassword('')
    } catch (err) {
      toast(err.response?.data?.detail || 'Update failed', 'error')
    } finally {
      setSavingAccount(false)
    }
  }

  const savePrefs = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ voice, speed }))
      toast('Preferences saved!', 'success')
    } catch { toast('Save failed', 'error') }
  }

  return (
    <div className={styles.page}>
      <div className={styles.topbar}><div className={styles.title}>Settings</div></div>

      <div className={styles.content}>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Account</div>
          <div className={styles.card}>
            <div className={styles.fields}>
              <Input label="Full name" value={name} onChange={e => setName(e.target.value)} />
              <Input label="Email address" type="email" value={email} onChange={e => setEmail(e.target.value)} />
              <Input label="New password" type="password" value={password}
                     onChange={e => setPassword(e.target.value)}
                     placeholder="Leave blank to keep current" />
            </div>
            <Button variant="primary" loading={savingAccount} onClick={saveAccount} style={{ marginTop: 16 }}>
              Save account changes
            </Button>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Default narration voice</div>
          <div className={styles.card}>
            <div className={styles.voiceGrid}>
              {VOICES.map(v => (
                <div key={v.id} className={`${styles.voiceOpt} ${voice === v.id ? styles.voiceSel : ''}`} onClick={() => setVoice(v.id)}>
                  <div className={styles.voiceName}>{v.name}</div>
                  <div className={styles.voiceDesc}>{v.desc}</div>
                </div>
              ))}
            </div>
            <div className={styles.note}>
              Voice names are cosmetic — gTTS uses one voice per language. Upgrade to OpenAI TTS for true voice variety.
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Default playback speed</div>
          <div className={styles.card}>
            <div className={styles.speedRow}>
              <input type="range" min={0.75} max={2} step={0.25} value={speed}
                     onChange={e => setSpeed(+e.target.value)} className={styles.speedSlider} />
              <span className={styles.speedVal}>{speed.toFixed(2)}×</span>
            </div>
            <div className={styles.speedLabels}>
              <span>0.75×</span><span>1.0×</span><span>1.5×</span><span>2.0×</span>
            </div>
          </div>
        </div>

        <Button variant="primary" onClick={savePrefs}>Save preferences</Button>

        <div className={styles.section} style={{ marginTop: 24 }}>
          <div className={styles.sectionTitle}>Session</div>
          <div className={styles.card}>
            <div className={styles.aboutRow}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Sign out</div>
                <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>End your current session.</div>
              </div>
              <Button variant="default" onClick={logout}>Sign out</Button>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer toasts={toasts} />
    </div>
  )
}
