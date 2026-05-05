import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import styles from './Layout.module.css'

const NAV = [
  { to:'/',        label:'Dashboard', icon:'⊞' },
  { to:'/upload',  label:'Upload',    icon:'↑' },
  { to:'/videos',  label:'My Videos', icon:'▶' },
  { to:'/settings',label:'Settings',  icon:'⚙' },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const initials = user?.name
    ? user.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)
    : 'U'

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className={styles.shell}>
      <nav className={styles.sidebar}>
        <div className={styles.logo}>
          <div className={styles.logoText}>DocPod</div>
          <div className={styles.logoSub}>Video from docs</div>
        </div>
        <div className={styles.nav}>
          {NAV.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} end={to==='/'} className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.active : ''}`}>
              <span className={styles.navIcon}>{icon}</span>{label}
            </NavLink>
          ))}
        </div>
        <div className={styles.footer}>
          <div className={styles.userRow}>
            <div className={styles.avatar}>{initials}</div>
            <div className={styles.userInfo}>
              <div className={styles.userName}>{user?.name}</div>
              <div className={styles.userEmail}>{user?.email}</div>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>Sign out</button>
        </div>
      </nav>
      <main className={styles.main}>{children}</main>
    </div>
  )
}
