import { Link, useLocation } from 'react-router-dom'

// 언어는 주소로 정한다. /en 으로 시작하면 영어, 아니면 한국어.
// 자동 이동은 하지 않는다 — 같은 주소는 누구에게나 같은 언어로 보인다.

export function langOf(pathname) {
  return pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'ko'
}

export function useLang() {
  return langOf(useLocation().pathname)
}

// 한국어 기준 경로('/p/362', '/#log', '/how#tools')를 지금 언어의 경로로 바꾼다.
export function localize(to, lang) {
  if (lang !== 'en' || typeof to !== 'string' || !to.startsWith('/')) return to
  if (to === '/') return '/en'
  if (to.startsWith('/#')) return `/en${to.slice(1)}`
  return `/en${to}`
}

// 지금 보고 있는 페이지의 다른 언어 주소
export function counterpart(pathname, hash, lang) {
  if (lang === 'en') {
    const rest = pathname.replace(/^\/en/, '') || '/'
    return rest + hash
  }
  return localize(pathname, 'en') + hash
}

// 내부 링크. content 파일에는 한국어 기준 경로만 적고, 여기서 언어를 붙인다.
export function L({ to, ...rest }) {
  const lang = useLang()
  return <Link to={localize(to, lang)} {...rest} />
}

export const ui = {
  ko: {
    name: '박미영',
    siteTitle: '박미영 — 만든 것들',
    titleSuffix: ' — 박미영',
    nav: [
      { label: '강점', to: '/#strengths' },
      { label: '만든 것들', to: '/#work' },
      { label: '2026 기록', to: '/#log' },
      { label: '일하는 방식', to: '/how' },
      { label: '연락', to: '/#contact' },
    ],
    navLabel: '주요',
    switchLabel: 'EN',
    switchAria: 'Read this page in English',
    eyebrow: '소프트웨어 전공 2학년 · AI 서비스 개발',
    headline: [['틀리면 안 되는 숫자는', ' 코드가 계산하고,'], ['말은 AI가 합니다.']],
    intro:
      '박미영입니다. 법 조문, 공식 통계, 모임 기록처럼 틀리면 안 되는 자료를 다루는 AI 서비스를 만듭니다. 2026년에 공모전과 대회에 내놓은 것들을 모았고, 기획부터 배포까지 대부분 혼자 했습니다.',
    resultsLabel: '확인된 결과',
    scrollCue: '내려서 보기',
    scrollCueAria: '아래로 내려 보기',
    strengthsTitle: '강점',
    strengthsLead: '올해 만든 것들에서 반복해서 드러난 네 가지입니다. 각각 아래 프로젝트에서 실제로 한 일을 근거로 붙였습니다.',
    workTitle: '만든 것들',
    workLead:
      '제대로 만들어 내놓은 다섯입니다. 상을 받았거나 지금도 쓰이는 것부터 놓았고, 프로젝트마다 공들인 부분과 그 과정에서 키운 능력을 적었습니다.',
    logTitle: '2026년 기록',
    logLead: '위 다섯을 포함해 올해 한 일입니다. 끝난 것, 안 된 것, 하는 중인 것을 함께 적었습니다.',
    howTitle: '일하는 방식',
    howTeaser:
      '혼자 하지만 혼자 하지 않습니다. 노트북의 Claude Code와 클라우드의 총괄 세션이 한 팀이고, 저는 성공 기준과 검증 세트와 최종 선택을 쥡니다. 10월에는 에이전트와 일해 온 제 방식을 작업 로그로 진단해서 운영 방식을 바꿨습니다. 할 일 보드와 GPU 과금 감시기처럼 그 과정에서 직접 만든 도구도 있습니다.',
    howRead: '어떻게 일하는지 읽기',
    howDescription: '박미영이 AI 코딩 에이전트와 일하는 방식, 거기서 배운 것, 직접 만든 도구.',
    pullQuote: '문장으로 남긴 교훈은 지켜지지 않았고, 훅·관문 스크립트로 막은 것만 지켜졌다.',
    pullCite: '항만 대회 교훈, 2026년 10월 29일',
    craftTitle: '공들인 부분',
    skillsTitle: '이 프로젝트로 키운 능력',
    receiptsTitle: '숫자로 보면',
    readMore: (n) => `${n} 자세히 읽기`,
    seeMore: (n) => `${n} 자세히 보기`,
    stampAward: '수상',
    stampPlanned: '예정',
    backToWork: '← 만든 것들',
    facts: { period: '언제', venue: '어디에', result: '결과', role: '역할', stack: '만든 재료' },
    otherProjects: '다른 프로젝트',
    prev: '이전',
    next: '다음',
    contactTitle: '연락',
    contactLead: '함께 만들 일, 물어볼 것, 틀린 곳을 발견했을 때. 메일이 가장 빠릅니다.',
    builtWith: (src) => (
      <>
        이 사이트도 코딩 에이전트와 함께 만들었고, {src('소스')}를 공개해 둡니다.
      </>
    ),
    notFoundTitle: '없는 페이지',
    notFoundText: '이 주소에는 아무것도 없습니다.',
    notFoundBack: '첫 화면으로',
    verifyTitle: '검산 기록',
    verifyPick: '장면 고르기',
    verifyFrom: '실제 기록에서 ·',
    numLocale: 'ko-KR',
  },
  en: {
    name: 'Mi Yeong Park',
    siteTitle: 'Mi Yeong Park — Things I built',
    titleSuffix: ' — Mi Yeong Park',
    nav: [
      { label: 'Strengths', to: '/#strengths' },
      { label: 'Work', to: '/#work' },
      { label: '2026 log', to: '/#log' },
      { label: 'How I work', to: '/how' },
      { label: 'Contact', to: '/#contact' },
    ],
    navLabel: 'Main',
    switchLabel: '한국어',
    switchAria: '이 페이지를 한국어로 보기',
    eyebrow: 'Software engineering, 2nd year · AI products',
    headline: [['Code does the math.', ''], ['AI does the talking.']],
    intro:
      "I'm Mi Yeong Park, a software engineering student at Chungbuk National University in Korea. I build AI services around material that can't be wrong — statutes, official statistics, meeting records. This page collects what I shipped to contests and competitions in 2026. Most of it I took from idea to deployment on my own.",
    resultsLabel: 'Verified results',
    scrollCue: 'Scroll',
    scrollCueAria: 'Scroll down',
    strengthsTitle: 'Strengths',
    strengthsLead:
      'Four things that kept showing up in what I built this year. Each one is backed by something I actually did in the projects below.',
    workTitle: 'Work',
    workLead:
      'Five projects I finished and put out. Awards and things still in use come first. For each, I wrote down the parts I worked hardest on and what I learned. Most were built for Korean users, so the screenshots are in Korean.',
    logTitle: '2026 log',
    logLead: "Everything I did this year, including the five above — what finished, what didn't work, and what's still going.",
    howTitle: 'How I work',
    howTeaser:
      "I work alone, but not by myself. Claude Code on my laptop and a coordinating session in the cloud form one team; I own the success criteria, the validation sets, and the final call. In October I audited how I'd been working with agents using my own logs, and changed how I run things. Along the way I built a few tools of my own, like a shared task board and a GPU billing watchdog.",
    howRead: 'Read how I work',
    howDescription: 'How Mi Yeong Park works with AI coding agents, what she learned, and the tools she built for it.',
    pullQuote: 'Lessons written down as sentences were not followed. Only the ones enforced by hooks and gate scripts held.',
    pullCite: 'Lesson from the port-matching competition, Oct 29, 2026',
    craftTitle: 'What I worked hardest on',
    skillsTitle: 'What I learned',
    receiptsTitle: 'By the numbers',
    readMore: (n) => `Read more about ${n}`,
    seeMore: (n) => `See ${n} in detail`,
    stampAward: 'Award',
    stampPlanned: 'Planned',
    backToWork: '← Work',
    facts: { period: 'When', venue: 'Where', result: 'Result', role: 'Role', stack: 'Built with' },
    otherProjects: 'Other projects',
    prev: 'Previous',
    next: 'Next',
    contactTitle: 'Contact',
    contactLead: 'Something to build together, a question, or a mistake you spotted. Email is fastest.',
    builtWith: (src) => <>This site was also built with coding agents. The {src('source')} is public.</>,
    notFoundTitle: 'Not found',
    notFoundText: "There's nothing at this address.",
    notFoundBack: 'Back to the home page',
    verifyTitle: 'Check log',
    verifyPick: 'Pick a scene',
    verifyFrom: 'From the actual record ·',
    numLocale: 'en-US',
  },
}

export function useUi() {
  return ui[useLang()]
}
