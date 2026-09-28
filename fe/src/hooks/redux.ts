import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from '@/store'

// Da usare al posto di useDispatch / useSelector: sono gia' tipizzati sullo store.
export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
