import { configureStore } from '@reduxjs/toolkit'
import { apiSlice } from './apiSlice'

// Le slice delle singole funzionalita' si registrano in reducer, accanto a quella dell'API.
export const store = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(apiSlice.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
