import { useState, useEffect, useRef } from 'react'
import { Modal, Button } from './UI'
import styles from './VideoPlayer.module.css'

export default function VideoPlayer({ video, onClose }) {
  const [playing, setPlaying]   = useState(false)
  const [current, setCurrent]   = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume]     = useState(0.8)
  const [error, setError]       = useState('')
  const [loaded, setLoaded]     = useState(false)
  const ref = useRef(null)
  const hasVideo = !!video?.video_url

  useEffect(() => { setPlaying(false); setCurrent(0); setDuration(0); setError(''); setLoaded(false) }, [video?.id])
  useEffect(() => { if (ref.current) ref.current.volume = volume }, [volume])

  const togglePlay = async () => {
    const el = ref.current; if (!el) return
    try {
      if (playing) { el.pause(); setPlaying(false) }
      else { await el.play(); setPlaying(true) }
    } catch (e) { setError('Playback error: ' + e.message) }
  }

  const fmt = s => { if (!s||isNaN(s)) return '0:00'; return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}` }

  const seek = e => {
    const r = e.currentTarget.getBoundingClientRect()
    const t = Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)) * (duration||0)
    setCurrent(t); if (ref.current) ref.current.currentTime = t
  }
  const skip = s => { const el = ref.current; if (!el) return; const t = Math.max(0,Math.min(duration,el.currentTime+s)); el.currentTime=t; setCurrent(t) }
  const pct = duration>0 ? (current/duration)*100 : 0

  return (
    <Modal open={!!video} onClose={() => { ref.current?.pause(); setPlaying(false); onClose() }} title={video?.title||'Player'}>
      <div className={styles.player}>
        <div className={styles.screen}>
          {hasVideo ? (
            <>
              <video ref={ref} src={video.video_url} className={styles.vid}
                onTimeUpdate={e=>setCurrent(e.target.currentTime)}
                onLoadedMetadata={e=>{setDuration(e.target.duration);setLoaded(true)}}
                onEnded={()=>setPlaying(false)}
                onError={()=>setError('Cannot load video. Ensure backend is running on port 8000.')}
                onCanPlay={()=>setError('')}
                preload="metadata" playsInline />
              {!loaded && !error && <div className={styles.overlay2}><div className={styles.spin}/><span>Loading…</span></div>}
              {error && <div className={styles.errOverlay}><div>⚠</div><div className={styles.errTxt}>{error}</div><a href={video.video_url} target="_blank" rel="noreferrer" className={styles.openLink}>Open directly ↗</a></div>}
            </>
          ) : (
            <div className={styles.noVideo}>
              <div className={styles.wave}>{Array.from({length:22}).map((_,i)=><div key={i} className={styles.wbar} style={{height:`${Math.sin(i*.7)*18+22}px`}}/>)}</div>
              <div className={styles.noVideoLabel}>{video?.title}</div>
            </div>
          )}
        </div>

        <div className={styles.progressBar} onClick={seek}>
          <div className={styles.fill} style={{width:`${pct}%`}}/>
          <div className={styles.handle} style={{left:`${pct}%`}}/>
        </div>

        <div className={styles.controls}>
          <button className={styles.ctrl} onClick={()=>skip(-10)}>⏮ 10s</button>
          <button className={`${styles.ctrl} ${styles.playBtn}`} onClick={togglePlay} disabled={!hasVideo||!!error}>{playing?'⏸':'▶'}</button>
          <button className={styles.ctrl} onClick={()=>skip(10)}>10s ⏭</button>
          <span className={styles.time}>{fmt(current)} / {fmt(duration||video?.duration_seconds)}</span>
          <div className={styles.vol}><span>{volume===0?'🔇':'🔊'}</span><input type="range" min={0} max={1} step={0.05} value={volume} className={styles.volSlider} onChange={e=>setVolume(+e.target.value)}/></div>
        </div>

        <div className={styles.info}>
          {[['Voice',video?.voice],['Speed',video?.speed?`${video.speed}×`:'—'],['Duration',video?.duration||'—']].map(([l,v])=>(
            <div key={l} className={styles.infoItem}><span className={styles.infoLbl}>{l}</span><span className={styles.infoVal} style={{textTransform:'capitalize'}}>{v||'—'}</span></div>
          ))}
        </div>

        <div className={styles.actions}>
          <Button variant="default" size="md" onClick={()=>navigator.clipboard.writeText(video?.video_url||'').catch(()=>{})}>🔗 Copy link</Button>
          {hasVideo && <Button variant="primary" size="md" onClick={()=>{const a=document.createElement('a');a.href=video.video_url;a.download=(video.title||'video')+'.mp4';a.target='_blank';a.click()}}>↓ Download MP4</Button>}
        </div>
      </div>
    </Modal>
  )
}
