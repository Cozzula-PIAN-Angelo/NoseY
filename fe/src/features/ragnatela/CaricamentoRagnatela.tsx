// Attesa mentre si scarica la pagina /ragnatela (Suspense in router.tsx): schermo scuro a tutta
// pagina come la modalita', cosi' tra la tela della transizione e la pagina non ricompare NoseY.
// Sta nel bundle principale: niente ragnatela.css, colori scritti qui (--rg-sfondo, --rg-rosso).
export function CaricamentoRagnatela() {
  return (
    <div role="status" className="fixed inset-0 z-50 flex items-center justify-center gap-3 bg-[#0B0D11] text-[#E3E2E6]">
      <span aria-hidden="true" className="size-5 animate-spin rounded-full border-2 border-[#E22328] border-t-transparent" />
      <span className="font-label-btn text-label-btn uppercase tracking-widest">Tendo la ragnatela…</span>
    </div>
  )
}
