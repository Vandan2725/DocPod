import { StatusBadge, ProgressBar, Button } from './UI'
import styles from './VideoCard.module.css'

const THUMBS = ['t1','t2','t3','t4','t5','t6']
const COLORS  = { t1:'linear-gradient(135deg,#9FE1CB,#0F6E56)', t2:'linear-gradient(135deg,#B5D4F4,#185FA5)', t3:'linear-gradient(135deg,#FAC775,#854F0B)', t4:'linear-gradient(135deg,#F4C0D1,#72243E)', t5:'linear-gradient(135deg,#CECBF6,#3C3489)', t6:'linear-gradient(135deg,#C0DD97,#27500A)' }

export default function VideoCard({ video, onPlay, onDelete, onShare, onRetry }) {
  const thumb = THUMBS[video.id % THUMBS.length]
  const isReady = video.status === 'ready'
  const isFailed = video.status === 'failed'
  const isProcessing = ['queued','extracting','tts','rendering'].includes(video.status)

  const fmtDate = iso => {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff/60000)
    if (m < 2) return 'Just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m/60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h/24)}d ago`
  }

  const stageLabel = { queued:'Queued', extracting:'Extracting text', tts:'Generating audio', rendering:'Rendering video' }[video.status] || ''

  return (
    <div className={styles.card}>
      <div className={styles.thumb} style={{ background: COLORS[thumb] }}>
        <button className={`${styles.playBtn} ${!isReady?styles.disabled:''}`}
          onClick={() => isReady && onPlay(video)} disabled={!isReady}>
          {isProcessing ? '⟳' : isFailed ? '!' : '▶'}
        </button>
        <div className={styles.badge}><StatusBadge status={video.status} /></div>
        {(isProcessing || isReady) && (
          <div className={styles.progress}>
            <ProgressBar value={isReady?100:video.progress||0}
              color={isReady?'brand':video.status==='tts'||video.status==='rendering'?'amber':'blue'} />
          </div>
        )}
      </div>

      <div className={styles.body}>
        <div className={styles.title} title={video.title}>{video.title}</div>
        <div className={styles.meta}>
          {video.duration && <><span>{video.duration}</span><span>·</span></>}
          <span style={{ textTransform:'capitalize' }}>{video.voice}</span>
          <span>·</span><span>{fmtDate(video.created_at)}</span>
        </div>
        {isProcessing && (
          <div className={styles.processingLabel}>
            {stageLabel}{video.progress > 0 ? ` — ${video.progress}%` : '…'}
          </div>
        )}
        {isFailed && (
          <div className={styles.errorBox}>
            <span className={styles.errorText}>{video.error_message || 'Processing failed'}</span>
            {onRetry && <button className={styles.retryBtn} onClick={() => onRetry(video.id)}>↺ Retry</button>}
          </div>
        )}
        <div className={styles.actions}>
          <Button variant={isReady?'primary':'default'} size="sm" disabled={!isReady} onClick={() => isReady && onPlay(video)}>▶ Preview</Button>
          <Button size="sm" disabled={!isReady} onClick={() => {
            if (!isReady||!video.video_url) return
            const a = document.createElement('a'); a.href=video.video_url; a.download=(video.title||'video')+'.mp4'; a.target='_blank'; a.click()
          }}>↓ Download</Button>
          <Button size="sm" onClick={() => onShare(video)}>Share</Button>
          <Button size="sm" variant="ghost" style={{ marginLeft:'auto',color:'var(--danger)' }} onClick={() => onDelete(video.id)}>🗑</Button>
        </div>
      </div>
    </div>
  )
}
