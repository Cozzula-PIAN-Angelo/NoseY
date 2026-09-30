import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import App from './App.tsx'
import { store } from './store'
import './index.css'

// Dati finti (MSW) solo in sviluppo, attivi finche' VITE_DATI_FINTI non vale "false".
// L'import dinamico tiene MSW fuori dalla build di produzione.
async function datiFinti() {
  if (import.meta.env.DEV && import.meta.env.VITE_DATI_FINTI !== 'false') {
    const { avviaDatiFinti } = await import('./mocks/browser')
    await avviaDatiFinti()
  }
}

datiFinti().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Provider store={store}>
        <App />
      </Provider>
    </StrictMode>,
  )
})
