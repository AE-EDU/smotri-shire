import { playTitleDust } from './title-dust.js'

export function initStoryMotion(root, { reducedMotion, visibility } = {}) {
  if (!root) return () => {}

  const photo = root.querySelector('.shared__photo')
  const receipt = root.querySelector('.shared__receipt')
  const heading = root.querySelector('.shared__title')
  const title = root.querySelector('[data-story-title]')
  const image = photo.querySelector('img')
  const initialTitle = 'Макс хочет отправить\nснимок в чат'
  const sentTitle = 'Макс отправил\nснимок в чат'
  let unsubscribe = () => {}
  let frame = null
  let cancelDust = null
  let playing = false
  let disposed = false
  let generation = 0
  let titleGeneration = 0
  let titleDone = false
  let chatDone = false

  function cancelTitle() {
    titleGeneration += 1
    cancelDust?.()
    cancelDust = null
  }

  function labelTitle(text) {
    const label = text.replace('\n', ' ')

    if (heading.getAttribute('aria-label') !== label) {
      heading.setAttribute('aria-label', label)
    }
  }

  function setTitle(sent) {
    cancelTitle()
    const text = sent ? sentTitle : initialTitle
    title.textContent = text
    labelTitle(text)
    root.classList.toggle('is-title-settled', sent)
    root.classList.toggle('is-chat-visible', sent)
  }

  function diffuseTitle() {
    if (cancelDust) return

    const current = ++titleGeneration
    cancelDust = playTitleDust(title, {
      from: initialTitle,
      to: sentTitle,
      onStart: () => {
        if (disposed || current !== titleGeneration) return
        labelTitle(sentTitle)
        root.classList.add('is-story-playing')
      },
      onReveal: () => {
        if (disposed || current !== titleGeneration) return
        root.classList.add('is-chat-visible')
      },
      onFinish: ({ completed }) => {
        if (disposed || current !== titleGeneration) return
        cancelDust = null

        if (!completed || !root.classList.contains('is-story-playing')) {
          finish()
          return
        }

        setTitle(true)
        titleDone = true
        if (chatDone) finish()
      }
    })
  }

  function reset() {
    generation += 1
    playing = false
    titleDone = false
    chatDone = false
    cancelAnimationFrame(frame)
    setTitle(false)
    root.classList.remove('is-frame-open', 'is-photo-sent', 'is-story-playing')
    root.classList.add('is-story-ready')
  }

  function finish() {
    generation += 1
    playing = false
    titleDone = true
    chatDone = true
    cancelAnimationFrame(frame)
    setTitle(true)
    root.classList.add('is-frame-open', 'is-photo-sent')
    root.classList.remove('is-story-ready', 'is-story-playing')
  }

  async function play() {
    const current = ++generation
    playing = true
    titleDone = false
    chatDone = false
    cancelAnimationFrame(frame)
    setTitle(false)
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
      diffuseTitle()
    })
  }

  function onAnimationEnd(event) {
    if (disposed || !playing || !root.classList.contains('is-chat-visible')) {
      return
    }
    if (event.target !== receipt || event.animationName !== 'chat-arrives') {
      return
    }

    chatDone = true
    if (titleDone) finish()
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
    if (document.hidden && (playing || cancelDust)) finish()
  }

  root.classList.add('is-story-enhanced')
  root.addEventListener('animationend', onAnimationEnd)
  reducedMotion?.addEventListener('change', configure)
  document.addEventListener('visibilitychange', onVisibilityChange)

  configure()

  return () => {
    disposed = true
    titleDone = false
    chatDone = false
    generation += 1
    cancelAnimationFrame(frame)
    unsubscribe()
    root.removeEventListener('animationend', onAnimationEnd)
    reducedMotion?.removeEventListener('change', configure)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    setTitle(true)
    root.classList.remove(
      'is-story-enhanced',
      'is-story-ready',
      'is-story-playing',
      'is-frame-open',
      'is-photo-sent',
      'is-title-settled',
      'is-chat-visible'
    )
  }
}
