import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { videosAPI } from '../api'
import { useToast } from '../hooks/useToast'
import { ToastContainer, Spinner, Button } from '../components/UI'
import VideoCard from '../components/VideoCard'
import VideoPlayer from '../components/VideoPlayer'
import styles from './Videos.module.css'

export default function VideosPage() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeVideo, setActiveVideo] = useState(null)
  const [sort, setSort] = useState('newest')
  const { toasts, toast } = useToast()
  const navigate = useNavigate()

  const load = useCallback(async () => {
    try { setVideos((await videosAPI.list()).data) }
    catch { toast('Failed to load videos', 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    const iv = setInterval(() => {
      setVideos(prev => {
        if (prev.some(v => ['queued','extracting','tts','rendering'].includes(v.status))) load()
        return prev
      })
    }, 3000)
    return () => clearInterval(iv)
  }, [load])

  const sorted = [...videos].sort((a, b) => {
    if (sort === 'newest') return new Date(b.created_at) - new Date(a.created_at)
    if (sort === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
    if (sort === 'longest') return (b.duration_seconds || 0) - (a.duration_seconds || 0)
    return 0
  })

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
    try { await videosAPI.retry(id); toast('Retrying...', 'info'); load() }
    catch (err) { toast(err.response?.data?.detail || 'Retry failed', 'error') }
  }

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div className={styles.title}>My Videos</div>
        <div className={styles.actions}>
          <select className={styles.sortSelect} value={sort} onChange={e => setSort(e.target.value)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="longest">Longest first</option>
          </select>
          <Button variant="primary" onClick={() => navigate('/upload')}>+ New video</Button>
        </div>
      </div>

      <div className={styles.content}>
        {loading ? <div className={styles.center}><Spinner size={28} /></div>
         : videos.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🎬</div>
            <div className={styles.emptyTitle}>No videos yet</div>
            <div className={styles.emptySub}>Upload a document to create your first narrated video podcast.</div>
            <Button variant="primary" onClick={() => navigate('/upload')} style={{ marginTop: 16 }}>Upload a document</Button>
          </div>
        ) : (
          <>
            <div className={styles.count}>{videos.length} video{videos.length !== 1 ? 's' : ''}</div>
            <div className={styles.grid}>
              {sorted.map(v => (
                <VideoCard key={v.id} video={v} onPlay={setActiveVideo} onDelete={handleDelete} onShare={handleShare} onRetry={handleRetry} />
              ))}
            </div>
          </>
        )}
      </div>

      <VideoPlayer video={activeVideo} onClose={() => setActiveVideo(null)} />
      <ToastContainer toasts={toasts} />
    </div>
  )
}
