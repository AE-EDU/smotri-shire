export function initStoryMotion(root, { reducedMotion, visibility } = {}) {
  if (!root) return () => {}

  const photo = root.querySelector('.shared__photo')
  const receipt = root.querySelector('.shared__receipt')
  const image = photo.querySelector('img')
  let unsubscribe = () => {}
  let frame = null
  let playing = false
  let disposed = false
  let generation = 0

  function reset() {
    generation += 1
    playing = false
    cancelAnimationFrame(frame)
    root.classList.remove('is-frame-open', 'is-photo-sent', 'is-story-playing')
    root.classList.add('is-story-ready')
  }

  function finish() {
    generation += 1
    playing = false
    cancelAnimationFrame(frame)
    root.classList.add('is-frame-open', 'is-photo-sent')
    root.classList.remove('is-story-ready', 'is-story-playing')
  }

  async function play() {
    const current = ++generation
    playing = true
    cancelAnimationFrame(frame)
    root.classList.remove('is-frame-open', 'is-photo-sent', 'is-story-playing')
    root.classList.add('is-story-ready')

    if (reducedMotion?.matches) {
      finish()
      return
    }

    if (!image.complete && typeof image.decode === 'function') {
      await image.decode().catch(() => {})
    }

    if (disposed || current !== generation) return

    frame = requestAnimationFrame(() => {
      if (disposed || current !== generation) return
      root.classList.add('is-story-playing')
    })
  }

  function onAnimationEnd(event) {
    if (event.target === receipt && playing) finish()
  }

  function configure() {
    unsubscribe()

    if (reducedMotion?.matches || !visibility) {
      finish()
      return
    }

    reset()
    unsubscribe = visibility.observe(root, {
      onEnter: () => void play(),
      onExit: reset
    })
  }

  function onVisibilityChange() {
    if (document.hidden && playing) finish()
  }

  root.classList.add('is-story-enhanced')
  root.addEventListener('animationend', onAnimationEnd)
  reducedMotion?.addEventListener('change', configure)
  document.addEventListener('visibilitychange', onVisibilityChange)

  configure()

  return () => {
    disposed = true
    generation += 1
    cancelAnimationFrame(frame)
    unsubscribe()
    root.removeEventListener('animationend', onAnimationEnd)
    reducedMotion?.removeEventListener('change', configure)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    root.classList.remove(
      'is-story-enhanced',
      'is-story-ready',
      'is-story-playing',
      'is-frame-open',
      'is-photo-sent'
    )
  }
}
