import { useEffect, useRef } from 'react'

// 첫 화면 → 본문 장면 전환.
// 본문 판이 밀려 올라오는 대신, 스크롤하는 동안 화면 전체가 픽셀 단위로 뒤집힌다.
// 칸마다 잠깐 첫 화면의 강조색(청록 · 연보라)으로 번쩍인 뒤 본문 바탕색으로 바뀌고,
// 화면이 다 바뀌는 순간 본문이 이어 붙는다. 첫 화면의 점 격자 · 픽셀 별과 같은 언어.
//
// 구조: 커튼 맨 앞의 투명한 빈 구간(.shift-spacer)이 지나가는 동안 진행도가 0 → 1.
// 진행도 1이 되는 순간 본문(.curtain) 윗변이 화면 아래에 닿고, 화면은 이미 본문 바탕색이라 이음매가 없다.
// 움직임 줄이기 설정이면 빈 구간과 캔버스를 숨겨 예전처럼 본문이 그냥 올라온다(CSS).

const FLIP = 0.22 // 칸 하나가 뒤집히는 데 쓰는 진행도 폭
const FLASH = 0.45 // 그중 강조색으로 번쩍이는 앞부분 비율

// 칸 좌표마다 고정된 난수 — 스크롤을 되감아도 같은 칸이 같은 순서로 뒤집힌다
function hash(x, y, s = 0) {
  let n = (x * 374761393 + y * 668265263 + s * 2147483647) | 0
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296
}

export default function PixelShift() {
  const spacerRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    const spacer = spacerRef.current
    const cv = canvasRef.current
    if (!spacer || !cv) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = cv.getContext('2d')
    const body = spacer.parentElement.querySelector('.curtain')
    let raf = 0
    let w = 0
    let h = 0
    let dpr = 1
    let paper = '#f5f4fa'
    let accents = ['#5fe0c9', '#b9a8ff']

    const readColors = () => {
      if (body) paper = getComputedStyle(body).backgroundColor
      const root = getComputedStyle(document.documentElement)
      const a = root.getPropertyValue('--color-hero-accent').trim()
      if (a) accents = [a, '#b9a8ff']
    }

    const draw = () => {
      raf = 0
      const r = spacer.getBoundingClientRect()
      const span = r.height || 1
      const p = Math.min(1, Math.max(0, (h - r.top) / span))
      // 시작 전이거나, 본문이 화면을 다 덮은 뒤에는 그리지 않는다
      if (p <= 0 || r.bottom <= 0) {
        cv.style.visibility = 'hidden'
        return
      }
      cv.style.visibility = 'visible'
      const cell = w < 640 ? 22 : 30
      const cols = Math.ceil(w / cell)
      const rows = Math.ceil(h / cell)
      const P = p * (1 + FLIP)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      for (let y = 0; y < rows; y++) {
        const fromTop = (y + 0.5) / rows
        for (let x = 0; x < cols; x++) {
          const rnd = hash(x, y)
          // 순서: 절반은 아래에서 위로 쓸어 올리는 흐름, 절반은 흩어진 난수 → 화면 전체가 동시에 파바박
          const order = 0.5 * (1 - fromTop) + 0.5 * rnd
          const t = (P - order) / FLIP
          if (t <= 0) continue
          if (t < FLASH) {
            const k = t / FLASH
            const size = Math.max(4, Math.round((cell * (0.3 + 0.6 * k)) / 2) * 2)
            const off = (cell - size) / 2
            ctx.fillStyle = accents[hash(x, y, 7) < 0.5 ? 0 : 1]
            ctx.fillRect(x * cell + off, y * cell + off, size, size)
          } else {
            ctx.fillStyle = paper
            ctx.fillRect(x * cell, y * cell, cell + 1, cell + 1)
          }
        }
      }
    }

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(draw)
    }

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1)
      w = window.innerWidth
      h = window.innerHeight
      cv.width = Math.round(w * dpr)
      cv.height = Math.round(h * dpr)
      readColors()
      draw()
    }

    resize()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', resize)
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener?.('change', resize)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', resize)
      mq.removeEventListener?.('change', resize)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <>
      <div ref={spacerRef} className="shift-spacer" aria-hidden="true" />
      <canvas ref={canvasRef} className="shift-canvas" aria-hidden="true" />
    </>
  )
}
