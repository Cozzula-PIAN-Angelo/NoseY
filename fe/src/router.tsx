import { createBrowserRouter } from 'react-router'
import App from '@/App'
import { SoloConLogin, SoloOspiti, SoloRuolo } from '@/components/layout'
import AdminArtisti from '@/pages/AdminArtisti'
import AdminUtenti from '@/pages/AdminUtenti'
import Amici from '@/pages/Amici'
import Accesso from '@/pages/Accesso'
import Chat from '@/pages/Chat'
import Componenti from '@/pages/Componenti'
import CreaEvento from '@/pages/CreaEvento'
import DettaglioEvento from '@/pages/DettaglioEvento'
import MappaEventi from '@/pages/MappaEventi'
import MieiEventi from '@/pages/MieiEventi'
import MieiTicket from '@/pages/MieiTicket'
import ModificaEvento from '@/pages/ModificaEvento'
import PaginaNonTrovata from '@/pages/PaginaNonTrovata'
import PartecipantiEvento from '@/pages/PartecipantiEvento'
import PaginaProvvisoria from '@/pages/PaginaProvvisoria'
import PasswordDimenticata from '@/pages/PasswordDimenticata'
import Profilo from '@/pages/Profilo'
import Registrazione from '@/pages/Registrazione'
import VerificaEmail from '@/pages/VerificaEmail'

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
          { path: 'events/new', element: <CreaEvento /> },
          { path: 'events/:id/edit', element: <ModificaEvento /> },
          { path: 'events/:id/participants', element: <PartecipantiEvento /> },
          { path: 'my-events', element: <MieiEventi /> },
          { path: 'tickets', element: <MieiTicket /> },
          { path: 'friends', element: <Amici /> },
          { path: 'chat', element: <Chat /> },
          { path: 'chat/:chatId', element: <Chat /> },
          { path: 'notifications', element: <PaginaProvvisoria titolo="Notifiche" card="FE2-13" /> },
          { path: 'profile', element: <Profilo /> },
        ],
      },

      // ---------- Ospite (solo senza login) ----------
      {
        element: <SoloOspiti />,
        children: [
          { path: 'login', element: <Accesso /> },
          { path: 'register', element: <Registrazione /> },
          { path: 'verify', element: <VerificaEmail /> },
          { path: 'forgot-password', element: <PasswordDimenticata /> },
        ],
      },

      // ---------- ADMIN (vale anche per il SUPERADMIN) ----------
      {
        element: <SoloRuolo minimo="ADMIN" />,
        children: [
          { path: 'admin/users', element: <AdminUtenti /> },
          { path: 'admin/artists', element: <AdminArtisti /> },
        ],
      },

      { path: '*', element: <PaginaNonTrovata /> },
    ],
  },
])
