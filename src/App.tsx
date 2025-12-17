import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'

function App() {
  const [count, setCount] = useState(0)

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white flex flex-col items-center justify-center p-6">
      <div className="flex gap-6 items-center mb-6">
        <a href="https://vite.dev" target="_blank" rel="noreferrer">
          <img src={viteLogo} className="h-24" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src={reactLogo} className="h-24" alt="React logo" />
        </a>
      </div>
      <h1 className="text-4xl font-extrabold mb-4">Vite + React + TypeScript + Tailwind</h1>

      <div className="bg-white/60 dark:bg-black/40 rounded-lg p-6 shadow-md mb-4">
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-md" onClick={() => setCount((c) => c + 1)}>
          count is {count}
        </button>
      </div>

      <p className="text-sm text-gray-500">Edit <code className="bg-gray-100 px-1 rounded">src/App.tsx</code> and save to test HMR</p>
    </main>
  )
}

export default App
