// Chiamate alle API del lato utenti (progettazione v4, sezioni 1 e 2): endpoint RTK Query aggiunti
// all'unica API dell'app (store/apiSlice.ts), che mette gia' token e gestione del 401.
// Gli errori si leggono con leggiErrore() (lib/errori.ts); i codici possibili sono nei commenti
// dei tipi di richiesta in types/utenti.ts.
import { apiSlice } from '@/store/apiSlice'
import { accesso, utenteAggiornato } from '@/store/sessioneSlice'
import type {
  AnonimizzazioneRequest,
  CambioPasswordRequest,
  EmailRequest,
  LoginRequest,
  LoginResponse,
  ModificaUtenteRequest,
  RegistrazioneRequest,
  RegistrazioneResponse,
  ReimpostaPasswordRequest,
  UtenteResponse,
  VerificaRequest,
} from '@/types/api'

const apiConEtichette = apiSlice.enhanceEndpoints({ addTagTypes: ['Profilo'] })

// Ogni risposta con l'utente aggiorna la sessione (barra, menu, ruolo per le rotte)
type Aggiorna = { dispatch: (azione: unknown) => unknown; queryFulfilled: Promise<{ data: UtenteResponse }> }
async function aggiornaSessione({ dispatch, queryFulfilled }: Aggiorna) {
  try {
    const { data } = await queryFulfilled
    dispatch(utenteAggiornato(data))
  } catch {
    // Errore: lo gestisce chi ha chiamato (o apiSlice per il 401); la sessione resta com'e'
  }
}

// Login e Verifica salvano la sessione: la pagina deve solo chiamarli e, se va bene, la rotta
// per ospiti (SoloOspiti) riporta alla pagina di partenza (?redirect=)
type Accedi = { dispatch: (azione: unknown) => unknown; queryFulfilled: Promise<{ data: LoginResponse }> }
async function salvaAccesso({ dispatch, queryFulfilled }: Accedi) {
  try {
    const { data } = await queryFulfilled
    dispatch(accesso(data))
  } catch {
    // Credenziali errate, email non verificata...: le mostra la pagina
  }
}

export const apiUtenti = apiConEtichette.injectEndpoints({
  endpoints: (build) => ({
    // ---------------------------------------------------------------- Auth (sezione 1)

    /** Registrazione: poi si va a /verify?email=, il codice arriva via email */
    registrazione: build.mutation<RegistrazioneResponse, RegistrazioneRequest>({
      query: (dati) => ({ url: '/api/auth/register', method: 'POST', body: dati }),
    }),

    /** Verifica: fa gia' il login (sessione salvata qui) */
    verifica: build.mutation<LoginResponse, VerificaRequest>({
      query: (dati) => ({ url: '/api/auth/verify', method: 'POST', body: dati }),
      onQueryStarted: (_arg, api) => salvaAccesso(api),
    }),

    /** ReinviaCodice: 204 anche per email sconosciute; 429 se troppo presto (60 secondi) */
    reinviaCodice: build.mutation<void, EmailRequest>({
      query: (dati) => ({ url: '/api/auth/resend-code', method: 'POST', body: dati }),
    }),

    /** Login: sessione salvata qui. Il suo 401 (CREDENZIALI_ERRATE) non fa uscire */
    login: build.mutation<LoginResponse, LoginRequest>({
      query: (dati) => ({ url: '/api/auth/login', method: 'POST', body: dati }),
      onQueryStarted: (_arg, api) => salvaAccesso(api),
    }),

    /** Logout: revoca il token sul server. La sessione locale la chiude chi chiama (uscita()) */
    logout: build.mutation<void, void>({
      query: () => ({ url: '/api/auth/logout', method: 'POST' }),
    }),

    /** PasswordDimenticata: 204 anche per email sconosciute */
    passwordDimenticata: build.mutation<void, EmailRequest>({
      query: (dati) => ({ url: '/api/auth/password/forgot', method: 'POST', body: dati }),
    }),

    /** ReimpostaPassword: non fa il login, si entra poi con la nuova password */
    reimpostaPassword: build.mutation<void, ReimpostaPasswordRequest>({
      query: (dati) => ({ url: '/api/auth/password/reset', method: 'POST', body: dati }),
    }),

    // ---------------------------------------------------------------- Utente (sezione 2)

    /** VediProfilo: chiamato all'avvio (ControlloSessione) e dalla pagina del profilo */
    vediProfilo: build.query<UtenteResponse, void>({
      query: () => '/api/users/me',
      providesTags: ['Profilo'],
      onQueryStarted: (_arg, api) => aggiornaSessione(api),
    }),

    /** ModificaProfilo: solo i campi cambiati (400 RICHIESTA_VUOTA se nessuno) */
    modificaProfilo: build.mutation<UtenteResponse, ModificaUtenteRequest>({
      query: (dati) => ({ url: '/api/users/me', method: 'PATCH', body: dati }),
      invalidatesTags: ['Profilo'],
      onQueryStarted: (_arg, api) => aggiornaSessione(api),
    }),

    /** CaricaImmagineProfilo: multipart con "file", JPEG/PNG/WEBP fino a 2 MB (LIMITI_UTENTI) */
    caricaImmagineProfilo: build.mutation<UtenteResponse, File>({
      query: (file) => {
        const dati = new FormData()
        dati.append('file', file)
        return { url: '/api/users/me/avatar', method: 'POST', body: dati }
      },
      invalidatesTags: ['Profilo'],
      onQueryStarted: (_arg, api) => aggiornaSessione(api),
    }),

    /** RimuoviImmagineProfilo: 204; il profilo ricaricato aggiorna la sessione */
    rimuoviImmagineProfilo: build.mutation<void, void>({
      query: () => ({ url: '/api/users/me/avatar', method: 'DELETE' }),
      invalidatesTags: ['Profilo'],
    }),

    /** CambioPassword: gli altri dispositivi escono, questo resta collegato */
    cambioPassword: build.mutation<void, CambioPasswordRequest>({
      query: (dati) => ({ url: '/api/users/me/password', method: 'POST', body: dati }),
    }),

    /**
     * Anonimizzazione: irreversibile e revoca il token. Dopo il 204 la pagina porta alla home e
     * chiude la sessione con uscita(), come "Esci" (altrimenti la prossima chiamata darebbe 401).
     */
    anonimizzazione: build.mutation<void, AnonimizzazioneRequest>({
      query: (dati) => ({ url: '/api/users/me/anonymize', method: 'POST', body: dati }),
    }),
  }),
})

export const {
  useRegistrazioneMutation,
  useVerificaMutation,
  useReinviaCodiceMutation,
  useLoginMutation,
  useLogoutMutation,
  usePasswordDimenticataMutation,
  useReimpostaPasswordMutation,
  useVediProfiloQuery,
  useModificaProfiloMutation,
  useCaricaImmagineProfiloMutation,
  useRimuoviImmagineProfiloMutation,
  useCambioPasswordMutation,
  useAnonimizzazioneMutation,
} = apiUtenti
