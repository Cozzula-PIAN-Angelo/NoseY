import { Marchio } from './Marchio'

// Footer di tutte le pagine, dalle schermate Stitch (stesse classi). Tolte le scritte tecniche di Stitch
// («WebSocket STOMP Attivo» sempre verde, «AES-256 Passcode Pass» inventata) e «Radar Sicurezza»,
// che non esiste (FE1-17): solo dati veri. Privacy e termini non hanno ancora una pagina: restano testo.
export function PiePagina() {
  return (
    <footer className="mt-space-xl w-full bg-surface-container-lowest">
      <div className="mx-auto max-w-[1440px] px-margin-mobile py-space-xl md:px-margin">
        <div className="mb-space-lg flex flex-col items-start justify-between gap-space-lg md:flex-row md:items-center">
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center gap-space-sm">
              <img src="/logo-nosey.png" alt="" className="h-8 w-auto object-contain" />
              <Marchio className="text-[22px] text-on-surface" />
            </div>
            <p className="max-w-sm font-body-sm text-body-sm text-on-surface-variant">
              Piattaforma notturna d'élite per la scoperta di eventi dal vivo, ticketing sicuro e community
              radar-powered.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-between gap-space-md pt-space-lg sm:flex-row">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            © {new Date().getFullYear()} NoseY Live Experience System. Tutti i diritti riservati.
          </p>
          <div className="flex items-center gap-space-md font-body-sm text-body-sm text-on-surface-variant">
            <span>Privacy Policy</span>
            <span>Termini</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
