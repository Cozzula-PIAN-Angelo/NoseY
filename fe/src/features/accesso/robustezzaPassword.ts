// Robustezza della password per le 4 barrette sotto il campo (design Stitch). E' solo un aiuto:
// la regola che conta e' quella del backend (da 8 caratteri a 72 byte), controllata a parte.

export type Robustezza = { livello: 0 | 1 | 2 | 3 | 4; testo: string }

export function robustezzaPassword(password: string): Robustezza {
  if (!password) return { livello: 0, testo: 'Almeno 8 caratteri' }
  if (password.length < 8) return { livello: 1, testo: `Troppo corta: ancora ${8 - password.length} caratteri` }
  let punti = 1
  if (password.length >= 12) punti++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password)) punti++
  if (/[^A-Za-z0-9]/.test(password)) punti++
  const livello = Math.min(4, punti) as Robustezza['livello']
  const testi = { 1: 'Debole: aggiungi numeri, maiuscole o simboli', 2: 'Discreta', 3: 'Buona', 4: 'Ottima' } as const
  return { livello, testo: testi[livello as 1 | 2 | 3 | 4] }
}
