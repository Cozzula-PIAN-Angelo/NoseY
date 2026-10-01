import { Link } from 'react-router'
import { urlImmagine } from '@/lib/api'
import type { ArtistaResponse } from '@/types/api'

// Line-up dell'evento (FE1-05): gli artisti arrivano gia' in ordine alfabetico. Ognuno porta alla sua
// scheda (/artists/:artistaId, FE1-19), anche se e' fuori catalogo.
export function ArtistiEvento({ artisti }: { artisti: ArtistaResponse[] }) {
  if (artisti.length === 0) {
    return <p className="font-body-md text-body-md text-outline">La line-up non è ancora stata annunciata.</p>
  }

  return (
    <ul className="grid gap-space-sm sm:grid-cols-2">
      {artisti.map((a) => {
        const immagine = urlImmagine(a.immagineUrl)
        return (
          <li key={a.id}>
            <Link
              to={`/artists/${a.id}`}
              className="flex items-center gap-space-sm rounded-xl bg-surface-card p-space-sm transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
            >
              {immagine ? (
                <img src={immagine} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-surface-container-high font-headline-sm text-headline-sm text-primary"
                >
                  {a.nome.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-label-btn text-label-btn text-on-surface">{a.nome}</span>
                {!a.attivo && (
                  // Disattivato dagli admin: resta negli eventi dove c'era gia'
                  <span className="font-body-sm text-body-sm text-outline">Non più nel catalogo</span>
                )}
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
