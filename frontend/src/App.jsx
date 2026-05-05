import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Layout     from './components/Layout'
import AuthPage   from './pages/Auth'
import Dashboard  from './pages/Dashboard'
import UploadPage from './pages/Upload'
import VideosPage from './pages/Videos'
import SettingsPage from './pages/Settings'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',flexDirection:'column',gap:8 }}>
      <div style={{ fontFamily:'var(--fd)',fontSize:24 }}>DocPod</div>
      <div style={{ fontSize:13,color:'var(--gray-400)' }}>Loading…</div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

function Public({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Public><AuthPage /></Public>} />
          <Route path="/"        element={<Protected><Dashboard   /></Protected>} />
          <Route path="/upload"  element={<Protected><UploadPage  /></Protected>} />
          <Route path="/videos"  element={<Protected><VideosPage  /></Protected>} />
          <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
