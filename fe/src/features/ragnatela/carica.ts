// Import della pagina /ragnatela, condiviso da router.tsx (React.lazy) e da useCodiceSegreto, che
// la precarica durante la transizione: la pagina e' un file a parte e non pesa sul bundle principale.
export const caricaRagnatela = () => import('@/pages/Ragnatela')
