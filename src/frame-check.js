export function initFrameCheck(root, { reducedMotion } = {}) {
  if (!root) return () => {}

  const stage = root.querySelector('.frame-check__stage')
  const target = root.querySelector('[data-private-target]')
  const reset = root.querySelector('[data-check-reset]')
  const status = root.querySelector('[data-check-status]')
  const cleanImage = root.querySelector('[data-clean-photo]')

  if (!stage || !target || !reset || !status || !cleanImage) return () => {}

  const initialStatus = status.textContent
  let revealTimer = null
  let feedbackTimer = null
  let hintAnimation = null
  let cleanPromise = null
  let cleanReady = false
  let completionRequest = 0
  let found = false
  let disposed = false

  function clearTimers() {
    window.clearTimeout(revealTimer)
    window.clearTimeout(feedbackTimer)
    revealTimer = null
    feedbackTimer = null
  }

  function stopHintAnimation() {
    hintAnimation?.cancel()
    hintAnimation = null
  }

  function clearHint() {
    stopHintAnimation()
    root.classList.remove('is-hint')
  }

  function showComplete() {
    root.classList.add('is-complete')
    status.textContent =
      'Верно! Кота можно показать, а адрес и телефон лучше скрыть'

    if (document.activeElement === target) {
      reset.focus({ preventScroll: true })
    }
  }

  function prepareCleanImage() {
    if (cleanReady) return Promise.resolve()
    if (cleanPromise) return cleanPromise

    if (cleanImage.complete && !cleanImage.naturalWidth) {
      cleanImage.src = cleanImage.getAttribute('src')
    }

    if (typeof cleanImage.decode !== 'function') {
      return cleanImage.complete && cleanImage.naturalWidth
        ? Promise.resolve()
        : Promise.reject(new Error('Image is not ready'))
    }

    cleanPromise = cleanImage
      .decode()
      .then(() => {
        cleanReady = true
      })
      .catch((error) => {
        cleanPromise = null
        throw error
      })

    return cleanPromise
  }

  function startDissolve(request) {
    if (disposed || !found || request !== completionRequest) return

    root.classList.add('is-masking')

    if (reducedMotion?.matches) {
      showComplete()
      return
    }

    feedbackTimer = window.setTimeout(() => {
      feedbackTimer = null

      if (disposed || !found || request !== completionRequest) return

      showComplete()
    }, 500)
  }

  function revealCleanImage() {
    clearTimers()

    if (disposed || !found) return

    const request = ++completionRequest

    if (cleanReady) {
      startDissolve(request)
      return
    }

    void prepareCleanImage()
      .then(() => {
        if (disposed || !found || request !== completionRequest) return

        startDissolve(request)
      })
      .catch(() => {
        if (disposed || !found || request !== completionRequest) return

        status.textContent = 'Не получилось обновить снимок. Попробуй ещё раз.'

        if (document.activeElement === target) {
          reset.focus({ preventScroll: true })
        }
      })
  }

  function syncMotion() {
    const shouldReduce = Boolean(reducedMotion?.matches)

    root.classList.toggle('is-reduced-motion', shouldReduce)

    if (shouldReduce) stopHintAnimation()
    if (shouldReduce && found) revealCleanImage()
  }

  function findPrivateDetail() {
    if (disposed || found) return

    clearHint()
    found = true
    target.setAttribute('aria-disabled', 'true')
    target.setAttribute('tabindex', '-1')
    root.classList.add('is-found')
    status.textContent = 'Верно! Скроем адрес и телефон…'

    if (reducedMotion?.matches) {
      revealCleanImage()
    } else {
      revealTimer = window.setTimeout(revealCleanImage, 1200)
    }
  }

  function hint(event) {
    if (disposed || found || target.contains(event.target)) return

    stopHintAnimation()
    status.textContent = 'Посмотри на наклейку справа внизу коробки.'
    root.classList.add('is-hint')

    if (reducedMotion?.matches || typeof status.animate !== 'function') {
      return
    }

    hintAnimation = status.animate(
      [{ fontWeight: 400 }, { fontWeight: 600 }, { fontWeight: 400 }],
      { duration: 700, iterations: 2, easing: 'ease-in-out' }
    )
  }

  function startAgain() {
    if (disposed) return

    clearTimers()
    clearHint()
    completionRequest += 1
    found = false
    root.classList.remove('is-found', 'is-masking', 'is-complete')
    target.removeAttribute('aria-disabled')
    target.removeAttribute('tabindex')
    status.textContent = initialStatus
    target.focus({ preventScroll: true })
  }

  target.addEventListener('click', findPrivateDetail)
  stage.addEventListener('click', hint)
  reset.addEventListener('click', startAgain)
  reducedMotion?.addEventListener('change', syncMotion)
  syncMotion()
  root.classList.add('is-enhanced')
  void prepareCleanImage().catch(() => {})

  return () => {
    disposed = true
    clearTimers()
    clearHint()
    completionRequest += 1
    target.removeEventListener('click', findPrivateDetail)
    stage.removeEventListener('click', hint)
    reset.removeEventListener('click', startAgain)
    reducedMotion?.removeEventListener('change', syncMotion)
    target.removeAttribute('aria-disabled')
    target.removeAttribute('tabindex')
    status.textContent = initialStatus
    root.classList.remove(
      'is-enhanced',
      'is-found',
      'is-masking',
      'is-complete',
      'is-reduced-motion'
    )
  }
}
