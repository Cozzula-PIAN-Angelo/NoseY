import { useNavigate } from 'react-router'
import { Button } from '@/components/ui'

// Rotta sconosciuta (*) e risorsa inesistente (API 404 NON_TROVATO): docs/interfacce.md.
export default function PaginaNonTrovata() {
  const naviga = useNavigate()

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col items-center px-margin-mobile py-24 text-center md:px-margin">
      <span className="flex items-center gap-1 rounded-full bg-surface-container px-space-sm py-0.5 font-label-code-status text-label-code-status uppercase tracking-wider text-tertiary">
        <span className="h-1.5 w-1.5 rounded-full bg-accent-gold-piercing" />
        Errore 404
      </span>
      <h1 className="mt-space-md font-display-hero-mobile text-display-hero-mobile text-on-surface md:font-display-hero md:text-display-hero">
        Fuori dal <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">radar</span>
      </h1>
      <p className="mt-space-sm max-w-md font-body-lg text-body-lg text-on-surface-variant">
        La pagina che cerchi non esiste o non e' piu' disponibile.
      </p>
      <div className="mt-space-lg flex flex-wrap justify-center gap-space-sm">
        <Button variant="secondary" icona="arrow_back" onClick={() => naviga(-1)}>
          Indietro
        </Button>
        <Button icona="explore" onClick={() => naviga('/')}>
          Torna alla home
        </Button>
      </div>
    </div>
  )
}
