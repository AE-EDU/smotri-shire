export function createSceneVisibility() {
  const scenes = new Set()
  let frame = null
  let disposed = false
  let direction = 1
  let lastScrollY = window.scrollY

  function update() {
    frame = null
    if (disposed) return

    const scrollY = window.scrollY
    const viewportHeight = window.innerHeight

    if (scrollY !== lastScrollY) {
      direction = scrollY > lastScrollY ? 1 : -1
    }

    lastScrollY = scrollY

    const measurements = [...scenes].map((scene) => ({
      scene,
      bounds: scene.element.getBoundingClientRect()
    }))

    for (const { scene, bounds } of measurements) {
      if (disposed) return
      if (!scenes.has(scene)) continue

      const outside =
        bounds.height <= 0 || bounds.bottom <= 0 || bounds.top >= viewportHeight

      if (outside) {
        const shouldExit = scene.visible || scene.active
        scene.visible = false
        scene.active = false
        scene.entryDirection = null
        if (shouldExit) scene.onExit?.()
        continue
      }

      if (!scene.visible) scene.entryDirection = direction
      scene.visible = true
      if (scene.active) continue

      const contained = bounds.top >= -1 && bounds.bottom <= viewportHeight + 1
      const trailingEdgeVisible =
        scene.entryDirection === 1
          ? bounds.bottom <= viewportHeight + 1 && bounds.bottom > 0
          : bounds.top >= -1 && bounds.top < viewportHeight
      const ready =
        bounds.height <= viewportHeight + 1 ? contained : trailingEdgeVisible

      if (ready) {
        scene.active = true
        scene.onEnter?.()
      }
    }
  }

  function schedule() {
    if (disposed || frame !== null) return
    frame = requestAnimationFrame(update)
  }

  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule)

  return {
    observe(element, { onEnter, onExit } = {}) {
      if (disposed) return () => {}

      const scene = {
        element,
        onEnter,
        onExit,
        visible: false,
        active: false,
        entryDirection: null
      }

      scenes.add(scene)
      schedule()

      return () => scenes.delete(scene)
    },
    dispose() {
      if (disposed) return
      disposed = true
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      scenes.clear()
    }
  }
}
