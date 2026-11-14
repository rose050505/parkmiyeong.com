// 첫 화면 맨 위에 두는 결과. 바깥에서 확인된 것만 둔다.
export const results = [
  { value: '최우수상', caption: '반도체 인라인 공정 해커톤. 2026 강원LRS·충북PRIDE 공유대학 Deep-Dive 캠프, 팀 pluto', to: '/#log' },
  { value: 'AI 트랙 4등상', caption: '삼성 SCPC 2026 본선. 1차 예선 비공개 평가 21위로 올라가, 처음 써 본 Android로 7일 만에 만든 앱 모임지기', to: '/p/moimjigi' },
  { value: '지금도 운영 중', caption: '삼육이. 금융 AI Challenge에 낸 뒤 362.parkmiyeong.com에서 계속 운영합니다', to: '/p/362' },
]

// 강점. 주장 하나에 근거 둘. 숫자는 근거 문장 안에서만 쓴다.
export const strengths = [
  {
    title: 'AI를 쓰되, 믿지 않는 구조로 만듭니다',
    text: '법 조문과 숫자는 코드가 정하고, 모델은 사람의 말을 옮기거나 설명을 쓰는 자리에만 둡니다. 모델이 낸 답은 원문과 계산값에 대조한 뒤에만 화면에 나갑니다.',
    proof: [
      { project: '삼육이', text: '모델이 정상 회신을 "거절"로 잘못 분류하는 걸 보고, 법 구조로 모델 출력을 검산하는 단계를 넣었습니다.', to: '/p/362' },
      { project: 'PriceSignal', text: '계산값과 다른 문장은 지우고 지웠다고 표시합니다. 첫 헤드라인이 실제로 이 검사에 걸렸습니다.', to: '/p/pricesignal' },
    ],
  },
  {
    title: '검사가 정말 잡아내는지까지 확인합니다',
    text: '테스트를 통과했다는 것과 테스트가 문제를 잡아낸다는 것은 다릅니다. 그래서 검사기 자체에 결함을 심어 보고, 판정할 수 있는 경우를 전부 돌려 봅니다.',
    proof: [
      { project: '모임지기', text: '일부러 심은 결함 22개를 모두 잡았고, 아무것도 검사하지 않던 검사 2곳을 찾아냈습니다.', to: '/p/moimjigi' },
      { project: '삼육이', text: '판정 조합 504가지를 전부 실행해 근거 조문과 어긋나는 경우가 0건임을 확인했습니다.', to: '/p/362' },
      { project: 'focuslock', text: '같은 잠금 판정을 네 언어로 구현하고, 네 구현이 공용 사례 84개를 모두 통과하게 묶었습니다.', to: '/p/plan' },
    ],
  },
  {
    title: '처음 보는 플랫폼과 데이터로도 기한 안에 냅니다',
    text: '익숙한 도구만 쓰지 않습니다. 처음 다루는 환경이라도 마감 안에 실제로 설치되고 접속되는 결과물까지 갑니다.',
    proof: [
      { project: '모임지기', text: '처음 써 본 Android로 7일 만에 설치되는 앱을 냈고, 본선에서 4등상을 받았습니다.', to: '/p/moimjigi' },
      { project: 'PriceSignal', text: '형식이 제각각인 공식 통계를 묶어 17개 시장을 한 질의로 비교하는 에이전트를 일주일에 만들었습니다.', to: '/p/pricesignal' },
    ],
  },
  {
    title: '점수보다 일반화를 고릅니다',
    text: '공개 점수에만 맞춘 규칙은 암기라고 보고 버립니다. 로컬에서 오른 점수가 실제 평가로 옮겨지는지부터 확인하고, 안 되면 멈춥니다.',
    proof: [
      { project: 'SCPC 1차', text: '공개 데이터에 맞춘 규칙을 버려 공개 120~170위에서 비공개 21위로 올랐습니다.', to: '/p/moimjigi' },
      { project: 'DACON 항만', text: '로컬에서 오른 판 10개가 서버에서 하나도 오르지 않는 걸 확인하고 폐기한 뒤, 교훈을 검사 장치로 남겼습니다.', to: '/how#leaderboard' },
    ],
  },
]

// 2026년 기록. 넣을 만한 것만, 짧게.
export const log = [
  { when: '7월 23일', text: '2026 강원LRS·충북PRIDE 공유대학 초광역 융합인재 Deep-Dive 캠프, 반도체 인라인 공정 해커톤 최우수상 (팀 pluto).', stamp: 'award' },
  { when: '7월', text: '삼성 SCPC 2026 1차 예선. 에이전트 하네스를 설계해 비공개 평가 21위로 2차 진출.', to: '/p/moimjigi' },
  { when: '7월 29일 – 8월 5일', text: '2차 예선. 처음 하는 Android로 7일 안에 설치 가능한 앱 "모임지기" 제출.', to: '/p/moimjigi' },
  { when: '8월', text: '본선 발표. AI 트랙 4등상.', to: '/p/moimjigi', stamp: 'award' },
  { when: '8월 – 9월', text: '삼육이. 금융 AI Challenge에 출품하고 지금까지 운영 중.', to: '/p/362' },
  { when: '9월', text: 'DACON 나라장터 입찰공고 법령위반 모니터링. 17위, 15위 컷에 0.001 부족.', to: '/how#leaderboard' },
  { when: '10월 1일 –', text: 'plan과 focuslock. 에이전트와 같이 쓰는 할 일 보드와 세 기기 잠금.', to: '/p/plan' },
  { when: '10월 –', text: '내 법안 레이더. 수업 팀 프로젝트, 웹과 배포 담당.', to: '/p/radar' },
  { when: '10월', text: 'DACON 항만 선박 매칭. 0.936까지 올리고 폐기. 교훈은 장치로 남김.', to: '/how#leaderboard' },
  { when: '10월 22일 – 28일', text: 'PriceSignal. Open Agent Hackathon 2026 제출.', to: '/p/pricesignal' },
]
