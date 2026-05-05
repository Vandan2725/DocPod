import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { documentsAPI, videosAPI } from '../api'
import { useToast } from '../hooks/useToast'
import { Button, ProgressBar, ToastContainer } from '../components/UI'
import styles from './Upload.module.css'

const VOICES = [
  { id: 'nova',    name: 'Nova',    desc: 'Warm & friendly' },
  { id: 'onyx',    name: 'Onyx',    desc: 'Deep & authoritative' },
  { id: 'shimmer', name: 'Shimmer', desc: 'Clear & articulate' },
  { id: 'echo',    name: 'Echo',    desc: 'Neutral & calm' },
]

const STAGES = [
  'Validating file format',
  'Extracting text content',
  'Generating TTS narration',
  'Rendering video with visuals',
  'Finalizing & packaging',
]

export default function UploadPage() {
  const [step, setStep] = useState(1)
  const [file, setFile] = useState(null)
  const [uploadPct, setUploadPct] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [docId, setDocId] = useState(null)
  const [voice, setVoice] = useState('nova')
  const [speed, setSpeed] = useState(1.0)
  const [stageIdx, setStageIdx] = useState(-1)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef()
  const navigate = useNavigate()
  const { toasts, toast } = useToast()

  // Load preferences from Settings
  useEffect(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('docpod_preferences') || '{}')
      if (prefs.voice) setVoice(prefs.voice)
      if (prefs.speed) setSpeed(prefs.speed)
    } catch {}
  }, [])

  const ALLOWED = ['pdf','doc','docx','ppt','pptx']

  const handleFile = useCallback(async (f) => {
    if (!f) return
    const ext = f.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED.includes(ext)) { toast('Unsupported file type', 'error'); return }
    if (f.size > 50 * 1024 * 1024) { toast('File too large (max 50MB)', 'error'); return }

    setFile(f); setUploading(true); setUploadPct(0)
    try {
      const r = await documentsAPI.upload(f, pct => setUploadPct(pct))
      setDocId(r.data.document_id)
      toast('File uploaded successfully!', 'success')
      setTimeout(() => { setUploading(false); setStep(2) }, 600)
    } catch (err) {
      toast(err.response?.data?.detail || 'Upload failed', 'error')
      setUploading(false); setFile(null)
    }
  }, [toast])

  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const startGenerate = async () => {
    if (!docId) return
    setStep(3); setStageIdx(0)
    try {
      const r = await videosAPI.generate(docId, voice, speed)
      const videoId = r.data.video_id

      let stage = 0
      const stageTimer = setInterval(() => {
        stage = Math.min(stage + 1, STAGES.length - 1)
        setStageIdx(stage)
      }, 2500)

      let done = false, attempts = 0
      while (!done && attempts < 90) {
        await new Promise(res => setTimeout(res, 3000))
        try {
          const vr = await videosAPI.get(videoId)
          if (vr.data.status === 'ready') {
            done = true; clearInterval(stageTimer); setStageIdx(STAGES.length)
            toast('Video ready!', 'success')
            setTimeout(() => navigate('/videos'), 1500)
          } else if (vr.data.status === 'failed') {
            done = true; clearInterval(stageTimer)
            toast(vr.data.error_message || 'Video generation failed', 'error')
            setStep(2)
          }
        } catch {}
        attempts++
      }
      if (!done) {
        clearInterval(stageTimer)
        toast('Generation taking longer than expected. Check My Videos.', 'info')
        setTimeout(() => navigate('/videos'), 2000)
      }
    } catch (err) {
      toast(err.response?.data?.detail || 'Generation failed', 'error')
      setStep(2)
    }
  }

  const reset = () => {
    setStep(1); setFile(null); setUploadPct(0); setUploading(false); setDocId(null); setStageIdx(-1)
  }

  return (
    <div className={styles.page}>
      <div className={styles.topbar}><div className={styles.title}>New video</div></div>
      <div className={styles.content}>
        <div className={styles.steps}>
          {['Upload','Configure','Generate'].map((s, i) => (
            <div key={s} className={styles.stepRow}>
              <div className={`${styles.step} ${step > i+1 ? styles.done : step === i+1 ? styles.active : ''}`}>
                <div className={styles.stepNum}>{step > i+1 ? '✓' : i+1}</div>
                <span>{s}</span>
              </div>
              {i < 2 && <div className={`${styles.stepLine} ${step > i+1 ? styles.lineDone : ''}`} />}
            </div>
          ))}
        </div>

        <div className={styles.card}>
          {step === 1 && (
            <div>
              <h2 className={styles.cardTitle}>Upload your document</h2>
              <p className={styles.cardSub}>Supported: PDF, DOC, DOCX, PPT, PPTX — up to 50MB</p>
              <div className={`${styles.dropzone} ${dragOver ? styles.dzOver : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => !uploading && inputRef.current?.click()}>
                <input ref={inputRef} type="file" style={{ display:'none' }} accept=".pdf,.doc,.docx,.ppt,.pptx"
                  onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
                {uploading ? (
                  <div className={styles.uploadProgress}>
                    <div className={styles.uploadFileName}>{file?.name}</div>
                    <ProgressBar value={uploadPct} color="brand" />
                    <div className={styles.uploadPct}>{uploadPct}%</div>
                  </div>
                ) : (
                  <div>
                    <div className={styles.dzIcon}>↑</div>
                    <div className={styles.dzTitle}>Drop your file here or click to browse</div>
                    <div className={styles.dzSub}>PDF, DOC, DOCX, PPT, PPTX</div>
                    <div className={styles.dzFormats}>{['PDF','DOC','DOCX','PPT','PPTX'].map(f => <span key={f} className={styles.fmt}>{f}</span>)}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className={styles.cardTitle}>Configure narration</h2>
              <p className={styles.cardSub}><strong>{file?.name}</strong> — choose voice and playback speed.</p>
              <div className={styles.sectionLabel}>Narration voice</div>
              <div className={styles.voiceGrid}>
                {VOICES.map(v => (
                  <div key={v.id} className={`${styles.voiceOpt} ${voice === v.id ? styles.voiceSel : ''}`} onClick={() => setVoice(v.id)}>
                    <div className={styles.voiceName}>{v.name}</div>
                    <div className={styles.voiceDesc}>{v.desc}</div>
                  </div>
                ))}
              </div>
              <div className={styles.sectionLabel} style={{ marginTop: 20 }}>Playback speed</div>
              <div className={styles.speedRow}>
                <input type="range" min={0.75} max={2} step={0.25} value={speed} onChange={e => setSpeed(+e.target.value)} className={styles.speedSlider} />
                <span className={styles.speedVal}>{speed.toFixed(2)}×</span>
              </div>
              <div className={styles.speedLabels}><span>0.75×</span><span>1.0×</span><span>1.5×</span><span>2.0×</span></div>
              <div className={styles.configActions}>
                <Button variant="default" onClick={reset}>← Back</Button>
                <Button variant="primary" onClick={startGenerate}>Generate video →</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className={styles.cardTitle}>Generating your video</h2>
              <p className={styles.cardSub}>This usually takes 1–3 minutes depending on document length.</p>
              <div className={styles.stages}>
                {STAGES.map((label, i) => {
                  const isDone = stageIdx > i, isActive = stageIdx === i
                  return (
                    <div key={label} className={`${styles.stage} ${isDone ? styles.stageDone : isActive ? styles.stageActive : styles.stageWait}`}>
                      <div className={`${styles.stageIcon} ${isActive ? 'animate-spin' : ''}`}>
                        {isDone ? '✓' : isActive ? '◌' : '○'}
                      </div>
                      <span>{label}</span>
                      {isDone && <span className={styles.stageTick}>done</span>}
                    </div>
                  )
                })}
              </div>
              <div className={styles.genNote}>You can close this page — the video will be ready in My Videos.</div>
              <Button variant="ghost" onClick={() => navigate('/videos')} style={{ marginTop: 12 }}>Go to My Videos →</Button>
            </div>
          )}
        </div>
      </div>
      <ToastContainer toasts={toasts} />
    </div>
  )
}
