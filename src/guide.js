export function initGuide(root, { reducedMotion } = {}) {
  if (!root) return () => {}

  const panels = [...root.querySelectorAll('[role="tabpanel"]')]
  const tabs = [...root.querySelectorAll('[role="tab"]')].filter((tab) =>
    panels.some((panel) => panel.id === tab.getAttribute('aria-controls'))
  )

  if (!tabs.length) return () => {}

  const originalTabs = tabs.map((tab) => ({
    selected: tab.getAttribute('aria-selected'),
    tabIndex: tab.getAttribute('tabindex')
  }))
  const wasEnhanced = root.classList.contains('is-enhanced')
  let activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true')
  )
  let animation = null

  function cancelAnimation() {
    if (!animation) return

    animation.cancel()
    animation = null
  }

  function activate(index, { animate = true, focus = false } = {}) {
    const changed = activeIndex !== index
    const activeTab = tabs[index]
    const panelId = activeTab.getAttribute('aria-controls')
    const activePanel = panels.find((panel) => panel.id === panelId)

    cancelAnimation()
    activeIndex = index

    tabs.forEach((tab, tabIndex) => {
      tab.setAttribute('aria-selected', String(tabIndex === index))
      tab.tabIndex = tabIndex === index ? 0 : -1
    })

    panels.forEach((panel) => {
      const inactive = panel !== activePanel

      panel.hidden = inactive
      panel.inert = inactive
    })

    if (focus) activeTab.focus()

    if (
      !animate ||
      !changed ||
      reducedMotion?.matches ||
      typeof activePanel.animate !== 'function'
    ) {
      return
    }

    const nextAnimation = activePanel.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      {
        duration: 180,
        easing: 'ease-out'
      }
    )

    animation = nextAnimation
    nextAnimation.onfinish = () => {
      if (animation === nextAnimation) animation = null
    }
  }

  function onClick(event) {
    const tab = event.target.closest('[role="tab"]')
    const index = tabs.indexOf(tab)

    if (index !== -1) activate(index)
  }

  function onKeyDown(event) {
    const tab = event.target.closest('[role="tab"]')
    const index = tabs.indexOf(tab)

    if (index === -1) return

    let nextIndex

    switch (event.key) {
      case 'ArrowLeft':
        nextIndex = (index - 1 + tabs.length) % tabs.length
        break
      case 'ArrowRight':
        nextIndex = (index + 1) % tabs.length
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = tabs.length - 1
        break
      default:
        return
    }

    event.preventDefault()
    activate(nextIndex, { focus: true })
  }

  root.classList.add('is-enhanced')
  activate(activeIndex, { animate: false })
  root.addEventListener('click', onClick)
  root.addEventListener('keydown', onKeyDown)
  reducedMotion?.addEventListener('change', cancelAnimation)

  return () => {
    cancelAnimation()
    root.removeEventListener('click', onClick)
    root.removeEventListener('keydown', onKeyDown)
    reducedMotion?.removeEventListener('change', cancelAnimation)

    if (!wasEnhanced) root.classList.remove('is-enhanced')

    panels.forEach((panel) => {
      panel.hidden = false
      panel.inert = false
    })

    tabs.forEach((tab, index) => {
      const original = originalTabs[index]

      if (original.selected === null) tab.removeAttribute('aria-selected')
      else tab.setAttribute('aria-selected', original.selected)

      if (original.tabIndex === null) tab.removeAttribute('tabindex')
      else tab.setAttribute('tabindex', original.tabIndex)
    })
  }
}
