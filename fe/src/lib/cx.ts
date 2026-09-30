// Unisce le classi CSS saltando quelle vuote: cx('a', cond && 'b', undefined) → 'a b'
export function cx(...classi: Array<string | false | null | undefined>): string {
  return classi.filter(Boolean).join(' ')
}
