// Tipi dei DTO del backend (docs/NoseY-progettazione.md), divisi per area.
// Import unico: import type { EventoMappaResponse, StatoEvento } from '@/types/api'
export * from './comuni'
export * from './eventi'
export * from './social'
export * from './utenti'
// Risposta delle liste paginate: sta in lib/pagine insieme alle funzioni della paginazione
export type { PaginaResponse, ParametriPagina } from '@/lib/pagine'
