export function initFrameCheck(root, { reducedMotion } = {}) {
  if (!root) return () => {}

  const stage = root.querySelector('.frame-check__stage')
  const target = root.querySelector('[data-card-target]')
  const reset = root.querySelector('[data-check-reset]')
  const status = root.querySelector('[data-check-status]')

  if (!stage || !target || !reset || !status) return () => {}

  const initialStatus = status.textContent
  let completionTimer = null
  let found = false
  let disposed = false

  function clearCompletion() {
    window.clearTimeout(completionTimer)
    completionTimer = null
  }

  function complete() {
    clearCompletion()

    if (disposed || !found) return

    root.classList.add('is-complete')
    status.textContent = 'Верно! Карта осталась за кадром.'

    if (document.activeElement === target) {
      reset.focus({ preventScroll: true })
    }
  }

  function syncMotion() {
    const shouldReduce = Boolean(reducedMotion?.matches)

    root.classList.toggle('is-reduced-motion', shouldReduce)

    if (shouldReduce && found) complete()
  }

  function findCard() {
    if (disposed || found) return

    found = true
    target.setAttribute('aria-disabled', 'true')
    target.setAttribute('tabindex', '-1')
    root.classList.add('is-found')
    status.textContent = 'Верно! Оставляем карту за кадром…'

    if (reducedMotion?.matches) {
      complete()
    } else {
      completionTimer = window.setTimeout(complete, 650)
    }
  }

  function hint(event) {
    if (disposed || found || target.contains(event.target)) return

    status.textContent = 'Посмотри справа от коробки.'
  }

  function startAgain() {
    if (disposed) return

    clearCompletion()
    found = false
    root.classList.remove('is-found', 'is-complete')
    target.removeAttribute('aria-disabled')
    target.removeAttribute('tabindex')
    status.textContent = initialStatus
    target.focus({ preventScroll: true })
  }

  target.addEventListener('click', findCard)
  stage.addEventListener('click', hint)
  reset.addEventListener('click', startAgain)
  reducedMotion?.addEventListener('change', syncMotion)
  syncMotion()
  root.classList.add('is-enhanced')

  return () => {
    disposed = true
    clearCompletion()
    target.removeEventListener('click', findCard)
    stage.removeEventListener('click', hint)
    reset.removeEventListener('click', startAgain)
    reducedMotion?.removeEventListener('change', syncMotion)
    target.removeAttribute('aria-disabled')
    target.removeAttribute('tabindex')
    status.textContent = initialStatus
    root.classList.remove(
      'is-enhanced',
      'is-found',
      'is-complete',
      'is-reduced-motion'
    )
  }
}
