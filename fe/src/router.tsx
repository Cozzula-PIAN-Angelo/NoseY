import { createBrowserRouter } from 'react-router'
import App from '@/App'
import { SoloConLogin, SoloOspiti, SoloRuolo } from '@/components/layout'
import Componenti from '@/pages/Componenti'
import DettaglioEvento from '@/pages/DettaglioEvento'
import MappaEventi from '@/pages/MappaEventi'
import PaginaNonTrovata from '@/pages/PaginaNonTrovata'
import PaginaProvvisoria from '@/pages/PaginaProvvisoria'

// Rotte concordate in docs/interfacce.md (TEAM-02). Percorsi in inglese, parametri con gli
// stessi nomi dell'API. Ogni card sostituisce la PaginaProvvisoria della propria pagina.
// L'accesso (login, ospite, ADMIN) lo decidono le rotte contenitore di components/layout/Protezioni.
export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      // ---------- Pubbliche ----------
      { index: true, element: <PaginaProvvisoria titolo="Home" card="FE1-04" /> },
      { path: 'events', element: <PaginaProvvisoria titolo="Esplora eventi" card="FE1-04" /> },
      { path: 'map', element: <MappaEventi /> },
      { path: 'events/:id', element: <DettaglioEvento /> },
      { path: 'artists', element: <PaginaProvvisoria titolo="Catalogo artisti" card="FE1-11" /> },
      { path: 'artists/:artistaId', element: <PaginaProvvisoria titolo="Scheda artista" card="FE1-11" /> },
      // Catalogo dei componenti comuni (FE1-01): non e' nella barra di navigazione
      { path: 'componenti', element: <Componenti /> },

      // ---------- Login ----------
      {
        element: <SoloConLogin />,
        children: [
          { path: 'events/new', element: <PaginaProvvisoria titolo="Crea evento" card="FE1-07" /> },
          { path: 'events/:id/edit', element: <PaginaProvvisoria titolo="Modifica evento" card="FE1-07" /> },
          { path: 'events/:id/participants', element: <PaginaProvvisoria titolo="Partecipanti" card="FE1-14" /> },
          { path: 'my-events', element: <PaginaProvvisoria titolo="I miei eventi" card="FE1-08" /> },
          { path: 'tickets', element: <PaginaProvvisoria titolo="I miei ticket" card="FE1-08" /> },
          { path: 'friends', element: <PaginaProvvisoria titolo="Amici e richieste" card="FE2-10" /> },
          { path: 'chat', element: <PaginaProvvisoria titolo="Chat" card="FE2-12" /> },
          { path: 'chat/:chatId', element: <PaginaProvvisoria titolo="Conversazione" card="FE2-12" /> },
          { path: 'notifications', element: <PaginaProvvisoria titolo="Notifiche" card="FE2-13" /> },
          { path: 'profile', element: <PaginaProvvisoria titolo="Profilo" card="FE2-07" /> },
        ],
      },

      // ---------- Ospite (solo senza login) ----------
      {
        element: <SoloOspiti />,
        children: [
          { path: 'login', element: <PaginaProvvisoria titolo="Accesso" card="FE2-05" /> },
          { path: 'register', element: <PaginaProvvisoria titolo="Registrazione" card="FE2-04" /> },
          { path: 'verify', element: <PaginaProvvisoria titolo="Verifica email" card="FE2-04" /> },
          { path: 'forgot-password', element: <PaginaProvvisoria titolo="Password dimenticata" card="FE2-06" /> },
        ],
      },

      // ---------- ADMIN (vale anche per il SUPERADMIN) ----------
      {
        element: <SoloRuolo minimo="ADMIN" />,
        children: [
          { path: 'admin/users', element: <PaginaProvvisoria titolo="Admin: utenti" card="FE1-15" /> },
          { path: 'admin/artists', element: <PaginaProvvisoria titolo="Admin: artisti" card="FE1-16" /> },
        ],
      },

      { path: '*', element: <PaginaNonTrovata /> },
    ],
  },
])
