import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { videosAPI } from '../api'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { ToastContainer, Spinner, Button } from '../components/UI'
import VideoCard from '../components/VideoCard'
import VideoPlayer from '../components/VideoPlayer'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toasts, toast } = useToast()
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeVideo, setActiveVideo] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  const loadVideos = useCallback(async () => {
    try { setVideos((await videosAPI.list()).data) }
    catch { toast('Failed to load videos', 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    loadVideos()
    const iv = setInterval(() => {
      setVideos(prev => {
        if (prev.some(v => ['queued','extracting','tts','rendering'].includes(v.status))) loadVideos()
        return prev
      })
    }, 3000)
    return () => clearInterval(iv)
  }, [loadVideos])

  const handleDelete = async (id) => {
    if (!confirm('Delete this video?')) return
    try { await videosAPI.delete(id); setVideos(v => v.filter(x => x.id !== id)); toast('Deleted', 'success') }
    catch { toast('Delete failed', 'error') }
  }
  const handleShare = (v) => {
    if (!v.video_url) { toast('Video not ready', 'error'); return }
    navigator.clipboard.writeText(v.video_url)
      .then(() => toast('Direct video link copied!', 'success'))
      .catch(() => toast('Copy failed', 'error'))
  }
  const handleRetry = async (id) => {
    try { await videosAPI.retry(id); toast('Retrying...', 'info'); loadVideos() }
    catch (err) { toast(err.response?.data?.detail || 'Retry failed', 'error') }
  }

  const ready = videos.filter(v => v.status === 'ready').length
  const processing = videos.filter(v => ['queued','extracting','tts','rendering'].includes(v.status)).length
  const totalSec = videos.reduce((a, v) => a + (v.duration_seconds || 0), 0)
  const fmt = s => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div className={styles.greeting}>{greet}, {user?.name?.split(' ')[0] || ''} 👋</div>
        <Button variant="primary" onClick={() => navigate('/upload')}>+ New video</Button>
      </div>

      <div className={styles.content}>
        <div className={styles.stats}>
          <div className={styles.stat}><div className={styles.statLabel}>Videos ready</div><div className={styles.statVal}>{ready}</div></div>
          <div className={styles.stat}><div className={styles.statLabel}>Processing</div><div className={styles.statVal}>{processing}</div></div>
          <div className={styles.stat}><div className={styles.statLabel}>Total videos</div><div className={styles.statVal}>{videos.length}</div></div>
          <div className={styles.stat}><div className={styles.statLabel}>Total runtime</div><div className={styles.statVal}>{totalSec ? fmt(totalSec) : '—'}</div></div>
        </div>

        <div className={`${styles.dropzone} ${dragOver ? styles.dzOver : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); navigate('/upload') }}
          onClick={() => navigate('/upload')}>
          <div className={styles.dzIcon}>↑</div>
          <div className={styles.dzTitle}>Drop a document to create a video podcast</div>
          <div className={styles.dzSub}>PDF, DOC, DOCX, PPT — up to 50MB</div>
          <div className={styles.dzFormats}>{['PDF','DOC','DOCX','PPT','PPTX'].map(f => <span key={f} className={styles.fmt}>{f}</span>)}</div>
        </div>

        <div className={styles.sectionHeader}>
          <div className={styles.sectionLabel}>Recent videos</div>
          {videos.length > 4 && <button className={styles.viewAll} onClick={() => navigate('/videos')}>View all →</button>}
        </div>

        {loading ? <div className={styles.center}><Spinner size={28} /></div>
         : videos.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🎬</div>
            <div>No videos yet. Upload a document to get started.</div>
            <Button variant="primary" onClick={() => navigate('/upload')} style={{ marginTop: 12 }}>Upload your first document</Button>
          </div>
        ) : (
          <div className={styles.grid}>
            {videos.slice(0, 4).map(v => (
              <VideoCard key={v.id} video={v} onPlay={setActiveVideo} onDelete={handleDelete} onShare={handleShare} onRetry={handleRetry} />
            ))}
          </div>
        )}
      </div>

      <VideoPlayer video={activeVideo} onClose={() => setActiveVideo(null)} />
      <ToastContainer toasts={toasts} />
    </div>
  )
}
