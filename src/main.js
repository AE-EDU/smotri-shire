import { initGuide } from './guide.js'
import { initMotion } from './motion.js'
import { initStoryMotion } from './story-motion.js'
import { initFrameCheck } from './frame-check.js'
import { createSceneVisibility } from './scene-visibility.js'

const root = document.querySelector('.longread')
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
const visibility = createSceneVisibility()
const disposeGuide = initGuide(root.querySelector('[data-guide]'), {
  reducedMotion
})
const disposeMotion = initMotion(root, { reducedMotion, visibility })
const disposeStory = initStoryMotion(
  root.querySelector('[data-story-motion]'),
  {
    reducedMotion,
    visibility
  }
)
const disposeFrameCheck = initFrameCheck(
  root.querySelector('[data-frame-check]'),
  { reducedMotion }
)

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposeGuide()
    disposeMotion()
    disposeStory()
    disposeFrameCheck()
    visibility.dispose()
  })
}
