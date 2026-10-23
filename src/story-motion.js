export function initStoryMotion(root, { reducedMotion } = {}) {
  if (!root) return () => {}

  const photo = root.querySelector('.shared__photo')
  const receipt = root.querySelector('.shared__receipt')
  const replay = root.querySelector('[data-story-replay]')
  const image = photo.querySelector('img')
  let observer = null
  let frame = null
  let started = false
  let playing = false
  let disposed = false
  let generation = 0
  let replayHadFocus = false

  function finish() {
    generation += 1
    started = true
    playing = false
    cancelAnimationFrame(frame)
    observer?.disconnect()
    root.classList.add('is-frame-open', 'is-photo-sent')
    root.classList.remove('is-story-ready', 'is-story-playing')
    replay.disabled = false

    if (replayHadFocus && document.activeElement === document.body) {
      replay.focus({ preventScroll: true })
    }

    replayHadFocus = false
  }

  async function play() {
    const current = ++generation
    replayHadFocus = document.activeElement === replay
    started = true
    playing = true
    cancelAnimationFrame(frame)
    root.classList.remove('is-frame-open', 'is-photo-sent', 'is-story-playing')
    root.classList.add('is-story-ready')
    replay.disabled = true

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
    observer?.observe(photo)
  }

  function onIntersection(entries) {
    if (disposed) return

    entries.forEach((entry) => {
      if (entry.boundingClientRect.bottom <= 0) {
        finish()
        return
      }
      if (!started && entry.intersectionRatio >= 0.33) void play()
    })
  }

  function onAnimationEnd(event) {
    if (event.target === receipt && playing) finish()
  }

  function onReplay() {
    const bounds = photo.getBoundingClientRect()

    if (bounds.bottom < 0 || bounds.top > window.innerHeight) {
      photo.scrollIntoView({
        block: 'center',
        behavior: 'auto'
      })
    }

    void play()
  }

  function onMotionChange() {
    if (reducedMotion.matches) finish()
  }

  function onResize() {
    if (playing) finish()
  }

  function onVisibilityChange() {
    if (document.hidden && playing) finish()
  }

  root.classList.add('is-story-enhanced')
  root.addEventListener('animationend', onAnimationEnd)
  replay.addEventListener('click', onReplay)
  reducedMotion?.addEventListener('change', onMotionChange)
  window.addEventListener('resize', onResize)
  document.addEventListener('visibilitychange', onVisibilityChange)

  if (reducedMotion?.matches || typeof IntersectionObserver !== 'function') {
    finish()
  } else {
    root.classList.add('is-story-ready')
    replay.disabled = true
    observer = new IntersectionObserver(onIntersection, {
      threshold: [0, 0.33]
    })
    observer.observe(photo)
  }

  return () => {
    disposed = true
    generation += 1
    cancelAnimationFrame(frame)
    observer?.disconnect()
    root.removeEventListener('animationend', onAnimationEnd)
    replay.removeEventListener('click', onReplay)
    reducedMotion?.removeEventListener('change', onMotionChange)
    window.removeEventListener('resize', onResize)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    replay.disabled = false
    root.classList.remove(
      'is-story-enhanced',
      'is-story-ready',
      'is-story-playing',
      'is-frame-open',
      'is-photo-sent'
    )
  }
}
