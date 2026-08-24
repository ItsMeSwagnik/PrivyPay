"use client"

import { useEffect, useRef } from "react"

export function LiquidBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    let width = 0
    let height = 0
    let dpr = 1
    let frame = 0
    let time = 0
    let last = 0
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    // Raw target pointer (updated on mouse move)
    const target = { x: 0, y: 0 }
    // Smoothed pointer used for rendering
    const pointer = { x: 0, y: 0, vx: 0, vy: 0 }

    const ripples: { x: number; y: number; radius: number; life: number }[] = []

    const particles = Array.from({ length: 170 }, (_, i) => ({
      x: (i * 83) % 1000,
      y: (i * 137) % 700,
      r: 0.7 + (i % 4) * 0.35,
      phase: i * 0.37,
      ox: 0, // smoothed offset x
      oy: 0, // smoothed offset y
    }))

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = width + "px"
      canvas.style.height = height + "px"
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      target.x = width / 2
      target.y = height * 0.46
      pointer.x = target.x
      pointer.y = target.y
    }

    const move = (e: PointerEvent) => {
      // Use clientX/Y directly — canvas is fixed to viewport so they align
      target.x = e.clientX
      target.y = e.clientY
      document.documentElement.style.setProperty("--pointer-x", `${(e.clientX / width) * 100}%`)
      document.documentElement.style.setProperty("--pointer-y", `${(e.clientY / height) * 100}%`)
      document.documentElement.style.setProperty("--pointer-dx", `${e.clientX - width / 2}px`)
      document.documentElement.style.setProperty("--pointer-dy", `${e.clientY - height / 2}px`)
    }

    const splash = (e: PointerEvent) => {
      if (reduced) return
      ripples.push({ x: e.clientX, y: e.clientY, radius: 2, life: 1 })
    }

    const draw = (now: number) => {
      const delta = Math.min((now - last) / 16.67 || 1, 2)
      last = now
      time += reduced ? 0 : 0.004 * delta

      // Smooth pointer toward target with spring-like lerp
      const lerpFactor = 1 - Math.pow(0.08, delta)
      pointer.vx += (target.x - pointer.x) * 0.18 * delta
      pointer.vy += (target.y - pointer.y) * 0.18 * delta
      pointer.vx *= Math.pow(0.72, delta)
      pointer.vy *= Math.pow(0.72, delta)
      pointer.x += pointer.vx * delta
      pointer.y += pointer.vy * delta

      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = "rgba(4, 7, 18, 0.3)"
      ctx.fillRect(0, 0, width, height)

      const field = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, Math.max(width, height) * 0.42)
      field.addColorStop(0, "rgba(119, 93, 255, 0.16)")
      field.addColorStop(0.28, "rgba(45, 201, 214, 0.08)")
      field.addColorStop(1, "rgba(4, 7, 18, 0)")
      ctx.fillStyle = field
      ctx.fillRect(0, 0, width, height)

      for (const p of particles) {
        const baseX = (p.x / 1000) * width
        const baseY = (p.y / 700) * height
        const dist = Math.hypot(baseX - pointer.x, baseY - pointer.y)
        const influence = Math.max(0, 1 - dist / 240)
        const wave = Math.sin(time * 5 + p.phase + dist * 0.035) * (reduced ? 0 : 5)

        // Target offset based on smoothed pointer velocity (not raw delta)
        const targetOx = influence * (pointer.vx * 2.2 + (baseX - pointer.x) * 0.06 * Math.min(Math.hypot(pointer.vx, pointer.vy), 40) / 40)
        const targetOy = influence * (pointer.vy * 2.2 + (baseY - pointer.y) * 0.06 * Math.min(Math.hypot(pointer.vx, pointer.vy), 40) / 40)

        // Lerp particle offsets smoothly
        p.ox += (targetOx - p.ox) * lerpFactor
        p.oy += (targetOy - p.oy) * lerpFactor

        const x = baseX + p.ox + Math.cos(p.phase + time) * wave
        const y = baseY + p.oy + Math.sin(p.phase + time) * wave

        ctx.beginPath()
        ctx.arc(x, y, p.r + influence * 1.8, 0, Math.PI * 2)
        ctx.fillStyle = influence > 0.15 ? "rgba(160, 225, 255, 0.72)" : "rgba(150, 145, 255, 0.28)"
        ctx.fill()
      }

      for (let i = ripples.length - 1; i >= 0; i--) {
        const rip = ripples[i]
        rip.radius += 3.5 * delta
        rip.life -= 0.018 * delta
        if (rip.life <= 0) { ripples.splice(i, 1); continue }
        ctx.beginPath()
        ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(145, 220, 255, ${rip.life * 0.34})`
        ctx.lineWidth = 1.5
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(rip.x, rip.y, rip.radius * 0.58, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(135, 110, 255, ${rip.life * 0.2})`
        ctx.stroke()
      }

      frame = requestAnimationFrame(draw)
    }

    resize()
    frame = requestAnimationFrame(draw)
    window.addEventListener("resize", resize)
    window.addEventListener("pointermove", move, { passive: true })
    window.addEventListener("pointerdown", splash, { passive: true })

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("resize", resize)
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerdown", splash)
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0" />
}
