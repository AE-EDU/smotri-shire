export function playTitleDust(title, { from, to, onReveal, onFinish }) {
  const previousHeight = title.style.minHeight
  let canvas = null
  let frame = null
  let cancelled = false
  let revealed = false

  function cancel() {
    if (cancelled) return
    cancelled = true
    cancelAnimationFrame(frame)
    window.removeEventListener('resize', finish)
    canvas?.remove()
    title.classList.remove('is-dust-active')
    title.style.minHeight = previousHeight
  }

  function finish() {
    if (cancelled) return
    cancel()
    onFinish()
  }

  async function prepare() {
    await document.fonts?.ready
    if (cancelled) return

    const style = getComputedStyle(title)
    const width = Math.ceil(title.getBoundingClientRect().width)
    const padding = 96
    const limit = window.innerWidth <= 900 ? 720 : 1000
    const source = capture(title, from, style, width, padding, limit)
    const target = capture(title, to, style, width, padding, limit)

    if (!source.points.length || !target.points.length) {
      finish()
      return
    }

    const height = Math.max(source.height, target.height)
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    canvas = document.createElement('canvas')
    canvas.className = 'shared__title-dust'
    canvas.setAttribute('aria-hidden', 'true')
    canvas.width = Math.ceil((width + padding * 2) * ratio)
    canvas.height = Math.ceil((height + padding * 2) * ratio)
    canvas.style.width = `${width + padding * 2}px`
    canvas.style.height = `${height + padding * 2}px`
    canvas.style.left = `${-padding}px`
    canvas.style.top = `${-padding}px`

    const context = canvas.getContext('2d')
    if (!context) {
      finish()
      return
    }

    context.scale(ratio, ratio)
    context.fillStyle = style.color
    title.style.minHeight = `${height}px`
    title.classList.add('is-dust-active')
    title.append(canvas)

    const particles = createParticles(source.points, target.points)
    let start = null

    function draw(time) {
      if (cancelled) return
      if (start === null) start = time

      const elapsed = time - start
      if (!revealed && elapsed >= 1620) {
        revealed = true
        onReveal?.()
        if (cancelled) return
      }

      const reveal = clamp((elapsed - 1620) / 180)
      const dustOpacity = clamp(elapsed / 120) * (1 - reveal)
      context.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio)
      context.globalAlpha = clamp(1 - elapsed / 150)
      context.drawImage(source.mask, 0, 0)

      for (const particle of particles) {
        const gathering = elapsed >= 850
        const progress = clamp(
          (elapsed - (gathering ? 850 : 0) - particle.delay) /
            (gathering ? 800 : 700)
        )
        const ease = gathering ? progress ** 3 : 1 - (1 - progress) ** 3
        const origin = gathering ? particle.cloud : particle.from
        const destination = gathering ? particle.to : particle.cloud
        const drift = Math.sin(progress * Math.PI) * particle.drift
        const x = mix(origin.x, destination.x, ease) + drift
        const y = mix(origin.y, destination.y, ease) - drift * 0.6

        context.globalAlpha =
          (0.75 + Math.cos(progress * Math.PI * 2) * 0.25) * dustOpacity
        context.beginPath()
        context.arc(x, y, particle.radius, 0, Math.PI * 2)
        context.fill()
      }

      context.globalAlpha = reveal
      context.drawImage(target.mask, 0, 0)

      if (elapsed >= 1800) finish()
      else frame = requestAnimationFrame(draw)
    }

    frame = requestAnimationFrame(draw)
  }

  window.addEventListener('resize', finish)
  void prepare().catch(finish)
  return cancel
}

function capture(title, text, style, width, padding, limit) {
  title.textContent = text
  const bounds = title.getBoundingClientRect()
  const height = Math.ceil(bounds.height)
  const mask = document.createElement('canvas')
  mask.width = width + padding * 2
  mask.height = height + padding * 2
  const context = mask.getContext('2d', { willReadFrequently: true })
  if (!context || !title.firstChild) return { height, points: [], mask }

  context.font = [
    style.fontStyle,
    style.fontWeight,
    style.fontSize,
    style.fontFamily
  ].join(' ')
  context.fillStyle = style.color
  context.textBaseline = 'alphabetic'
  const metrics = context.measureText('М')
  const ascent = metrics.fontBoundingBoxAscent || parseFloat(style.fontSize)
  const range = document.createRange()

  for (let index = 0; index < text.length; index += 1) {
    if (/\s/.test(text[index])) continue
    range.setStart(title.firstChild, index)
    range.setEnd(title.firstChild, index + 1)
    const glyph = range.getBoundingClientRect()
    const character =
      style.textTransform === 'uppercase'
        ? text[index].toUpperCase()
        : text[index]

    context.fillText(
      character,
      glyph.left - bounds.left + padding,
      glyph.top - bounds.top + ascent + padding
    )
  }

  const pixels = context.getImageData(0, 0, mask.width, mask.height).data
  const points = []

  for (let y = 0; y < mask.height; y += 2) {
    for (let x = 0; x < mask.width; x += 2) {
      if (pixels[(y * mask.width + x) * 4 + 3] > 90) {
        points.push({ x, y })
      }
    }
  }

  if (points.length <= limit) return { height, points, mask }

  return {
    height,
    mask,
    points: Array.from(
      { length: limit },
      (_, index) => points[Math.floor((index * points.length) / limit)]
    )
  }
}

function createParticles(source, target) {
  const count = Math.max(source.length, target.length)

  return Array.from({ length: count }, (_, index) => {
    const from = source[index % source.length]
    const to = target[index % target.length]
    const angle = index * 2.39996
    const spread = 30 + ((index * 37) % 60)

    return {
      from,
      to,
      cloud: {
        x: mix(from.x, to.x, 0.5) + Math.cos(angle) * spread,
        y: mix(from.y, to.y, 0.5) + Math.sin(angle) * spread * 0.65
      },
      delay: (index * 19) % 141,
      radius: 0.65 + ((index * 7) % 8) / 10,
      drift: ((index * 13) % 25) - 12
    }
  })
}

function clamp(value) {
  return Math.max(0, Math.min(value, 1))
}

function mix(from, to, progress) {
  return from + (to - from) * progress
}
