import { useEffect, useState } from 'react'
import { L, useLang, useUi } from '../i18n.jsx'

// 첫 화면의 컨셉: "말은 AI가, 숫자와 판정은 코드가". 실제 프로젝트 기록에서 가져온 세 장면을 차례로 보여 준다.
// 모델(또는 자기 보고)이 쓴 줄 → 코드가 검산한 줄 → 결과. 움직임 줄이기 설정이면 움직이지 않는다.
const scenesKo = [
  {
    project: 'PriceSignal',
    to: '/p/pricesignal',
    claimBy: '모델이 쓴 헤드라인',
    claim: '세 시장 모두 식품 물가가 꺾이는 중',
    checkBy: '코드 검산',
    check: '호주는 보합. 계산값과 다른 추세 주장',
    verdict: '문장 삭제, 다시 써서 통과한 것만 보고서에',
  },
  {
    project: '삼육이',
    to: '/p/362',
    claimBy: '모델의 회신 분류',
    claim: '이 회신은 「거절」입니다',
    checkBy: '코드 검산',
    check: '세 유형을 모두 설명한 회신은 법상 거절일 수 없음',
    verdict: '모델과 법 구조가 어긋나면 코드가 이긴다',
  },
  {
    project: '모임지기',
    to: '/p/moimjigi',
    claimBy: '검사 결과',
    claim: '스키마 대조: PASS',
    checkBy: '검사기를 검사',
    check: '대조한 파일이 0벌이었다. 검사 26곳을 전수 조사하니 2곳은 아무것도 검사하지 않고 있었음',
    verdict: '결함 22개를 심어 22개를 잡는지까지 확인',
  },
]

const scenesEn = [
  {
    project: 'PriceSignal',
    to: '/p/pricesignal',
    claimBy: 'Headline written by the model',
    claim: 'Food inflation is easing in all three markets',
    checkBy: 'Checked by code',
    check: 'Australia is flat. The trend claim contradicts the computed values',
    verdict: 'Sentence deleted. Only the rewrite that passed made it into the report',
  },
  {
    project: 'Samyuk-i',
    to: '/p/362',
    claimBy: "Model's reading of the reply",
    claim: 'This reply is a "refusal"',
    checkBy: 'Checked by code',
    check: 'A reply that explains all three required items cannot legally be a refusal',
    verdict: 'When the model and the legal structure disagree, the code wins',
  },
  {
    project: 'Moimjigi',
    to: '/p/moimjigi',
    claimBy: 'Test result',
    claim: 'Schema check: PASS',
    checkBy: 'Testing the tests',
    check: 'It had compared zero files. An audit of all 26 checks found 2 that checked nothing at all',
    verdict: 'Planted 22 defects and confirmed all 22 were caught',
  },
]

const STEP_MS = 5200

export default function VerifyLog() {
  const t = useUi()
  const scenes = useLang() === 'en' ? scenesEn : scenesKo
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [i, setI] = useState(0)
  const [auto, setAuto] = useState(!reduce)

  useEffect(() => {
    if (!auto) return
    const t = setInterval(() => setI((n) => (n + 1) % scenes.length), STEP_MS)
    return () => clearInterval(t)
  }, [auto])

  const s = scenes[i]
  return (
    <div className="relative">
      <div className="verify rounded-[22px] border border-hero-line bg-[#0d0b22]/80 p-5 shadow-[0_30px_80px_-30px_rgb(0_0_0/0.7)] sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] font-semibold text-hero-ink-2">{t.verifyTitle}</p>
          <div className="flex gap-1.5" role="tablist" aria-label={t.verifyPick}>
            {scenes.map((x, k) => (
              <button
                key={x.project}
                type="button"
                role="tab"
                aria-selected={k === i}
                aria-label={x.project}
                onClick={() => { setI(k); setAuto(false) }}
                className={`h-2 rounded-full transition-all ${k === i ? 'w-6 bg-hero-accent' : 'w-2 bg-hero-line hover:bg-hero-ink-2'}`}
              />
            ))}
          </div>
        </div>

        <div key={i} className={reduce ? '' : 'verify-run'} aria-live="polite">
          <div className="v-line v-claim mt-5">
            <span className="v-who">{s.claimBy}</span>
            <p className="v-text">
              <span className="v-strike">{s.claim}</span>
            </p>
          </div>
          <div className="v-line v-check mt-4">
            <span className="v-who text-hero-accent">{s.checkBy}</span>
            <p className="v-text text-hero-ink">{s.check}</p>
          </div>
          <div className="v-line v-verdict mt-4 flex items-start gap-2.5 rounded-xl bg-hero-accent/10 px-3.5 py-3">
            <span aria-hidden="true" className="mt-[3px] grid h-4 w-4 shrink-0 place-items-center rounded-[4px] bg-hero-accent text-[11px] font-black text-[#0d0b22]">✓</span>
            <p className="text-[14.5px] leading-[1.55] text-hero-ink">{s.verdict}</p>
          </div>
        </div>

        <p className="mt-5 text-[13px] text-hero-ink-2">
          {t.verifyFrom}{' '}
          <L to={s.to} className="font-semibold text-hero-ink underline decoration-hero-line underline-offset-4 hover:decoration-hero-accent">
            {s.project}
          </L>
        </p>
      </div>
    </div>
  )
}
