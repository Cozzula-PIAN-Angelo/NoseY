// Footer di tutte le pagine, copiato dalle schermate Stitch (stesse classi e testi).
// I link a privacy e termini non hanno ancora una pagina: restano testo finche' non ci sara'.
export function PiePagina() {
  return (
    <footer className="mt-space-xl w-full bg-surface-container-lowest">
      <div className="mx-auto max-w-[1440px] px-margin-mobile py-space-xl md:px-margin">
        <div className="mb-space-lg flex flex-col items-start justify-between gap-space-lg md:flex-row md:items-center">
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center gap-space-sm">
              <img src="/logo-nosey.png" alt="" className="h-6 w-auto object-contain" />
              <span className="font-headline-sm text-headline-sm tracking-tight text-on-surface">NoseY</span>
            </div>
            <p className="max-w-sm font-body-sm text-body-sm text-on-surface-variant">
              Piattaforma notturna d'élite per la scoperta di eventi dal vivo, ticketing sicuro e community
              radar-powered.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-space-lg">
            <div className="flex items-center gap-space-xs font-label-code-status text-label-code-status uppercase text-on-surface-variant">
              <span className="h-2 w-2 rounded-full bg-status-in-corso" />
              WebSocket STOMP Attivo
            </div>
            <div className="flex items-center gap-space-xs font-label-code-status text-label-code-status uppercase text-on-surface-variant">
              <span className="h-2 w-2 rounded-full bg-poi-uscita" />
              Cloudinary Media Sync
            </div>
            <div className="flex items-center gap-space-xs font-label-code-status text-label-code-status uppercase text-on-surface-variant">
              <span className="h-2 w-2 rounded-full bg-status-programmato" />
              AES-256 Passcode Pass
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-between gap-space-md pt-space-lg sm:flex-row">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            © {new Date().getFullYear()} NoseY Live Experience System. Tutti i diritti riservati.
          </p>
          <div className="flex items-center gap-space-md font-body-sm text-body-sm text-on-surface-variant">
            <span>Privacy Policy</span>
            <span>Termini</span>
            <span>Radar Sicurezza</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
