import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Landing from './Landing.jsx'

function Root() {
  const [view, setView] = useState('landing') // 'landing' | 'app'
  const [tab, setTab] = useState('gis')
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('auth_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  if (view === 'landing') {
    return (
      <Landing
        onEnter={(t) => { setTab(t); setView('app') }}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
      />
    )
  }
  return (
    <App
      key={tab}
      initialTab={tab}
      currentUser={currentUser}
      setCurrentUser={setCurrentUser}
      onHome={() => setView('landing')}
    />
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
