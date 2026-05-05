import styles from './UI.module.css'

export function Button({ children, variant='default', size='md', loading, disabled, onClick, type='button', style }) {
  return (
    <button type={type}
      className={[styles.btn, styles[`btn-${variant}`], styles[`btn-${size}`]].join(' ')}
      disabled={disabled||loading} onClick={onClick} style={style}>
      {loading && <span className={`animate-spin ${styles.spinner}`}>⟳</span>}
      {children}
    </button>
  )
}

export function Input({ label, error, ...props }) {
  return (
    <div className={styles.field}>
      {label && <label className={styles.label}>{label}</label>}
      <input className={`${styles.input} ${error?styles.inputError:''}`} {...props} />
      {error && <span className={styles.fieldError}>{error}</span>}
    </div>
  )
}

export function Card({ children, style, onClick, hover }) {
  return <div className={`${styles.card} ${hover?styles.cardHover:''}`} style={style} onClick={onClick}>{children}</div>
}

export function StatusBadge({ status }) {
  const map = {
    ready:      { label:'Ready',           color:'green' },
    rendering:  { label:'Rendering',       color:'amber', pulse:true },
    tts:        { label:'Generating audio',color:'amber', pulse:true },
    extracting: { label:'Extracting',      color:'blue',  pulse:true },
    queued:     { label:'Queued',          color:'gray' },
    failed:     { label:'Failed',          color:'red' },
    uploaded:   { label:'Uploaded',        color:'gray' },
    extracted:  { label:'Extracted',       color:'green' },
  }
  const s = map[status] || { label:status, color:'gray' }
  return (
    <span className={`${styles.statusBadge} ${styles[`status-${s.color}`]}`}>
      <span className={`${styles.statusDot} ${s.pulse?'animate-pulse':''}`} />
      {s.label}
    </span>
  )
}

export function ProgressBar({ value, color='brand' }) {
  return (
    <div className={styles.progressWrap}>
      <div className={`${styles.progressFill} ${styles[`fill-${color}`]}`}
        style={{ width:`${Math.min(100,Math.max(0,value))}%` }} />
    </div>
  )
}

export function Spinner({ size=20 }) {
  return <div className={`animate-spin ${styles.spinnerIcon}`}
    style={{ width:size, height:size, borderWidth:size>16?2:1.5 }} />
}

export function ToastContainer({ toasts }) {
  return (
    <div className={styles.toastContainer}>
      {toasts.map(t => (
        <div key={t.id} className={`${styles.toast} ${styles[`toast-${t.type}`]} animate-fade`}>
          {t.message}
        </div>
      ))}
    </div>
  )
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e=>e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>{title}</span>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  )
}
