export function initMotion(root, { reducedMotion, visibility } = {}) {
  if (!root) return () => {}

  const elements = [...root.querySelectorAll('[data-reveal], [data-zoom]')]
  const grouped = new Map()
  let disposed = false
  let subscriptions = []

  elements.forEach((element) => {
    const block = element.closest('[data-motion-block]') || element

    if (!grouped.has(block)) {
      grouped.set(block, { block, elements: [], generation: 0 })
    }

    grouped.get(block).elements.push(element)
  })

  const scenes = [...grouped.values()]

  function reset(scene) {
    scene.generation += 1
    scene.elements.forEach((element) => {
      element.classList.remove('is-revealed', 'is-finished')
    })
  }

  function unsubscribe() {
    subscriptions.forEach((remove) => remove())
    subscriptions = []
  }

  async function reveal(scene) {
    const current = ++scene.generation
    const images = new Set(
      scene.elements.flatMap((element) =>
        element.matches('img')
          ? [element]
          : [...element.querySelectorAll('img')]
      )
    )

    await Promise.all(
      [...images]
        .filter(
          (image) => !image.complete && typeof image.decode === 'function'
        )
        .map((image) => image.decode().catch(() => {}))
    )

    if (disposed || current !== scene.generation) return

    scene.elements.forEach((element) => {
      element.classList.add('is-revealed')
    })
  }

  function configure() {
    unsubscribe()
    scenes.forEach(reset)

    if (reducedMotion?.matches || !visibility) {
      elements.forEach((element) => {
        element.classList.add('is-revealed', 'is-finished')
      })
      root.classList.remove('motion-ready')
      return
    }

    root.classList.add('motion-ready')
    subscriptions = scenes.map((scene) =>
      visibility.observe(scene.block, {
        onEnter: () => void reveal(scene),
        onExit: () => reset(scene)
      })
    )
  }

  function onAnimationEnd(event) {
    if (disposed) return

    const { target } = event

    if (
      target.matches('[data-reveal]') &&
      target.classList.contains('is-revealed')
    ) {
      target.classList.add('is-finished')
    }

    if (target.matches('.detail__label')) {
      const viewport = target.closest('[data-zoom]')

      if (viewport?.classList.contains('is-revealed')) {
        viewport.classList.add('is-finished')
      }
    }
  }

  root.addEventListener('animationend', onAnimationEnd)
  reducedMotion?.addEventListener('change', configure)
  configure()

  return () => {
    disposed = true
    unsubscribe()
    scenes.forEach(reset)
    root.classList.remove('motion-ready')
    root.removeEventListener('animationend', onAnimationEnd)
    reducedMotion?.removeEventListener('change', configure)
  }
}
