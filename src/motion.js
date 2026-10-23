export function initMotion(root, { reducedMotion } = {}) {
  if (!root) return () => {}

  const elements = [...root.querySelectorAll('[data-reveal], [data-zoom]')]
  const remaining = new Set(
    elements.filter((element) => !element.classList.contains('is-revealed'))
  )
  const pending = new WeakSet()
  let observer = null
  let disposed = false
  let stopped = false

  function stop() {
    stopped = true
    observer?.disconnect()
  }

  function revealAll() {
    elements.forEach((element) => element.classList.add('is-revealed'))
    remaining.clear()
    stop()
    root.classList.remove('motion-ready')
  }

  async function reveal(element) {
    if (disposed || stopped || pending.has(element)) return

    pending.add(element)
    observer?.unobserve(element)

    const images = element.matches('img')
      ? [element]
      : [...element.querySelectorAll('img')]

    await Promise.all(
      images
        .filter(
          (image) => !image.complete && typeof image.decode === 'function'
        )
        .map((image) => image.decode().catch(() => {}))
    )

    if (disposed || stopped) return

    element.classList.add('is-revealed')
    remaining.delete(element)

    if (!remaining.size) stop()
  }

  function onMotionChange() {
    if (!disposed && reducedMotion.matches) revealAll()
  }

  function onAnimationEnd(event) {
    if (disposed) return

    const { target } = event

    if (target.matches('[data-reveal]')) {
      target.classList.add('is-finished')
    }

    if (target.matches('.detail__label')) {
      target.closest('[data-zoom]')?.classList.add('is-finished')
    }
  }

  root.addEventListener('animationend', onAnimationEnd)

  if (
    reducedMotion?.matches ||
    typeof IntersectionObserver !== 'function' ||
    !remaining.size
  ) {
    revealAll()
  } else {
    observer = new IntersectionObserver(
      (entries) => {
        if (disposed || stopped) return

        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.33) {
            void reveal(entry.target)
          }
        })
      },
      { threshold: 0.33 }
    )

    root.classList.add('motion-ready')
    remaining.forEach((element) => observer.observe(element))
    reducedMotion?.addEventListener('change', onMotionChange)
  }

  return () => {
    disposed = true
    stop()
    root.classList.remove('motion-ready')
    root.removeEventListener('animationend', onAnimationEnd)
    reducedMotion?.removeEventListener('change', onMotionChange)
  }
}
