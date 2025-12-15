import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { Button } from '@repo/ui'
import { useCounter, useToggle } from '@repo/hooks'

function App() {
  const { count, increment, decrement, reset } = useCounter(0)
  const { value: showDetails, toggle } = useToggle(false)

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React Monorepo</h1>
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
    </>
  )
}

export default App
