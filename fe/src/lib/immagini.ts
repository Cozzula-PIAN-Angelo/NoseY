// Controllo delle immagini PRIMA dell'invio, con le stesse regole del backend
// (progettazione v4, sezione 0 "Upload"): dimensione massima e tipo letto sui primi byte del file,
// non sull'estensione ne' sul tipo dichiarato. Cosi' un file sbagliato non viaggia nemmeno.

const UN_MB = 1024 * 1024

/** Firme dei formati ammessi: JPEG, PNG, WEBP */
function tipoDaiPrimiByte(b: Uint8Array): 'jpeg' | 'png' | 'webp' | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg'
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (png.every((v, i) => b[i] === v)) return 'png'
  const testo = (da: number, a: number) => String.fromCharCode(...b.slice(da, a))
  if (testo(0, 4) === 'RIFF' && testo(8, 12) === 'WEBP') return 'webp'
  return null
}

/**
 * null se l'immagine va bene, altrimenti il messaggio da mostrare.
 * Esempio: const errore = await controllaImmagine(file, 5)
 */
export async function controllaImmagine(file: File, maxMb: number): Promise<string | null> {
  if (file.size === 0) return 'Il file è vuoto.'
  if (file.size > maxMb * UN_MB) {
    const mb = (file.size / UN_MB).toLocaleString('it-IT', { maximumFractionDigits: 1 })
    return `Il file pesa ${mb} MB: il massimo è ${maxMb} MB.`
  }
  const primi = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  if (!tipoDaiPrimiByte(primi)) return 'Formato non ammesso: usa un’immagine JPEG, PNG o WEBP.'
  return null
}
