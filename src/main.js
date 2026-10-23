import { initGuide } from './guide.js'
import { initMotion } from './motion.js'

const root = document.querySelector('.longread')
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
const disposeGuide = initGuide(root.querySelector('[data-guide]'), {
  reducedMotion
})
const disposeMotion = initMotion(root, { reducedMotion })

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposeGuide()
    disposeMotion()
  })
}
