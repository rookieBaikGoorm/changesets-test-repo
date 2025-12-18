import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { Button } from '@repo/ui'
import { useCounter, useToggle } from '@repo/hooks'
import { About } from './pages/About'
import { Settings } from './pages/Settings'
import { Footer } from './components/Footer'

function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'about' | 'settings'>('home')
  const { count, increment, decrement, reset } = useCounter(0)
  const { value: showDetails, toggle } = useToggle(false)

  if (currentPage === 'about') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1 }}>
          <Button onClick={() => setCurrentPage('home')} style={{ margin: '20px' }}>
            Back to Home
          </Button>
          <About />
        </div>
        <Footer />
      </div>
    )
  }

  if (currentPage === 'settings') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1 }}>
          <Button onClick={() => setCurrentPage('home')} style={{ margin: '20px' }}>
            Back to Home
          </Button>
          <Settings />
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1 }}>
        <div>
          <a href="https://vite.dev" target="_blank">
            <img src={viteLogo} className="logo" alt="Vite logo" />
          </a>
          <a href="https://react.dev" target="_blank">
            <img src={reactLogo} className="logo react" alt="React logo" />
          </a>
        </div>
        <h1>Vite + React Monorepo</h1>
        <p>another experience</p>
        <div className="card">
          <p>Count: {count}</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <Button onClick={increment} variant="primary">
              Increment
            </Button>
            <Button onClick={decrement} variant="secondary">
              Decrement
            </Button>
            <Button onClick={reset}>
              Reset
            </Button>
          </div>
          <p style={{ marginTop: '20px' }}>
            <Button onClick={toggle}>
              {showDetails ? 'Hide' : 'Show'} Details
            </Button>
          </p>
          {showDetails && (
            <div style={{ marginTop: '10px', padding: '10px', border: '1px solid #646cff', borderRadius: '8px' }}>
              <p>Using @repo/ui Button component</p>
              <p>Using @repo/hooks useCounter and useToggle hooks</p>
            </div>
          )}
        </div>
        <p className="read-the-docs">
          Testing monorepo with changesets
        </p>
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <Button onClick={() => setCurrentPage('about')} variant="secondary">
            Go to About
          </Button>
          <Button onClick={() => setCurrentPage('settings')} variant="secondary">
            Go to Settings
          </Button>
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default App
