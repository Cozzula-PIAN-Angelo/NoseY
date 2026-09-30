// Tipi dei DTO del backend (NoseY-progettazione.md). Si aggiungono man mano che servono.

/** Stato dell'evento nei DTO: IN_CORSO e CONCLUSO il backend li calcola dalle date */
export type StatoEvento = 'PROGRAMMATO' | 'IN_CORSO' | 'CONCLUSO' | 'ANNULLATO'

/** Tipo di un punto di interesse (POI) dentro l'area dell'evento */
export type TipoPoi = 'INGRESSO' | 'USCITA' | 'EMERGENZA'
