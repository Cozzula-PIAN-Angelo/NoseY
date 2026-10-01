import { StatoVuoto } from '@/components/ui'

type PaginaProvvisoriaProps = {
  titolo: string
  /** Card di Trello che realizza la pagina, es. "FE2-05" */
  card: string
}

// Segnaposto delle rotte non ancora realizzate: ogni card sostituisce il proprio
// elemento in src/router.tsx con la pagina vera.
export default function PaginaProvvisoria({ titolo, card }: PaginaProvvisoriaProps) {
  return (
    <div className="mx-auto max-w-[1440px] px-margin-mobile py-space-xl md:px-margin">
      <StatoVuoto icona="construction" titolo={titolo} messaggio={`Pagina in arrivo con la card ${card}.`} />
    </div>
  )
}
