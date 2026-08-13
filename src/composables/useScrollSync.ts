export function setupScrollSync(a: HTMLElement, b: HTMLElement): () => void {
  let lock = false
  const sync = (from: HTMLElement, to: HTMLElement) => (): void => {
    if (lock) return
    const maxFrom = from.scrollHeight - from.clientHeight
    const maxTo = to.scrollHeight - to.clientHeight
    if (maxFrom <= 0 || maxTo <= 0) return
    lock = true
    to.scrollTop = (from.scrollTop / maxFrom) * maxTo
    requestAnimationFrame(() => {
      lock = false
    })
  }
  const onA = sync(a, b)
  const onB = sync(b, a)
  a.addEventListener('scroll', onA, { passive: true })
  b.addEventListener('scroll', onB, { passive: true })
  return () => {
    a.removeEventListener('scroll', onA)
    b.removeEventListener('scroll', onB)
  }
}
