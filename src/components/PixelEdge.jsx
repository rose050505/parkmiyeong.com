import { useEffect, useRef } from 'react'

// 첫 화면 → 본문 전환. 커튼의 윗변을 직선 대신 픽셀 디더링으로 그린다.
// 스크롤할수록 아래 칸부터 픽셀이 자라며 차올라, 짙은 첫 화면이 본문 바탕으로 녹아든다.
// 첫 화면의 점 격자 · 픽셀 별과 같은 언어. 움직임 줄이기 설정이면 한 장면으로 멈춘다.

// 4×4 Bayer 행렬 — 칸마다 문턱값을 고르게 흩어 계단 대신 고른 디더 무늬가 나온다
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((r) => r.map((v) => (v + 0.5) / 16))

const SPREAD = 0.32 // 디더 폭: 앞선이 몇 줄에 걸쳐 흩어지는지
const GROW = 0.07 // 문턱을 넘은 칸이 작은 점에서 꽉 찬 칸으로 자라는 구간

export default function PixelEdge() {
  const ref = useRef(null)

  useEffect(() => {
    const cv = ref.current
    const host = cv?.parentElement
    if (!cv || !host) return
    const ctx = cv.getContext('2d')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let w = 0
    let h = 0
    let dpr = 1
    let color = '#fff'

    const progress = () => {
      const vh = window.innerHeight
      return Math.min(1, Math.max(0, (vh - host.getBoundingClientRect().top) / vh))
    }

    const draw = () => {
      raf = 0
      if (!w || !h) return
      const p = reduce ? 0.3 : progress()
      // 앞선: 처음엔 맨 아래 몇 줄만 흩어져 있고, 커튼이 화면 절반쯤 올라오면 멈춘다.
      // 끝까지 채우지 않아 띠 꼭대기가 직선으로 잘리지 않고 늘 흩어진 픽셀로 남는다
      const front = 0.04 + Math.min(1, p / 0.5) * 0.86
      const cell = w < 640 ? 12 : 16
      const cols = Math.ceil(w / cell)
      const rows = Math.ceil(h / cell)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = color
      for (let r = 0; r < rows; r++) {
        const fromBottom = (rows - 1 - r + 0.5) / rows // 0 = 커튼 바로 위, 1 = 띠 꼭대기
        const y = h - (rows - r) * cell
        for (let c = 0; c < cols; c++) {
          // 낮은 물결을 섞어 앞선이 수평 직선이 되지 않게
          const wave = 0.07 * Math.sin(c * 0.31) + 0.04 * Math.sin(c * 0.11 + 1.7)
          const v = fromBottom + wave + (BAYER[r & 3][c & 3] - 0.5) * SPREAD * 2
          const t = (front - v) / GROW
          if (t <= 0) continue
          const s = Math.min(1, t)
          // 크기는 2px 단위로만 — 부드럽게 커지지 않고 픽셀처럼 단계적으로 자란다
          const size = Math.max(2, Math.round((cell * s) / 2) * 2)
          const off = (cell - size) / 2
          ctx.fillRect(c * cell + off, y + off, size, size)
        }
      }
    }

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(draw)
    }

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1)
      w = cv.clientWidth
      h = cv.clientHeight
      cv.width = Math.round(w * dpr)
      cv.height = Math.round(h * dpr)
      color = getComputedStyle(host).backgroundColor
      draw()
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(cv)
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener?.('change', resize)
    if (!reduce) window.addEventListener('scroll', schedule, { passive: true })
    return () => {
      ro.disconnect()
      mq.removeEventListener?.('change', resize)
      window.removeEventListener('scroll', schedule)
      cancelAnimationFrame(raf)
    }
  }, [])

  return <canvas ref={ref} aria-hidden="true" className="pixel-edge" />
}
