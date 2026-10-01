import { useState, type ComponentProps } from 'react'
import { bytePassword } from '@/types/api'
import type { CampoProps } from './Campo'
import { Icon } from './Icon'
import { TextField } from './TextField'

type CampoPasswordProps = Omit<ComponentProps<'input'>, 'type' | 'required'> &
  CampoProps & {
    /** Mostra "12 / 72 byte": il backend (BCrypt) accetta al massimo 72 byte in UTF-8
     *  (una lettera accentata ne vale 2, un'emoji 4) */
    contaByte?: number
  }

// Campo password con l'occhio per mostrarla o nasconderla (registrazione, verifica, login,
// cambio password). Con contaByte mostra il limite in byte, che e' quello che conta per il backend.
export function CampoPassword({ contaByte, ...props }: CampoPasswordProps) {
  const [visibile, setVisibile] = useState(false)

  return (
    <TextField
      {...props}
      type={visibile ? 'text' : 'password'}
      icona="lock"
      testoContatore={contaByte !== undefined ? `${bytePassword(String(props.value ?? ''))} / ${contaByte} byte` : undefined}
      dopo={
        <button
          type="button"
          onClick={() => setVisibile((v) => !v)}
          aria-label={visibile ? 'Nascondi la password' : 'Mostra la password'}
          aria-pressed={visibile}
          className="rounded-md p-1 text-outline transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
        >
          <Icon nome={visibile ? 'visibility_off' : 'visibility'} size={20} />
        </button>
      }
    />
  )
}
