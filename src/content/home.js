// 첫 화면의 숫자 벽. 각 숫자는 어느 프로젝트에서 왔는지로 이어진다.
export const wall = [
  { value: '7→4→3→2', caption: '회차가 거듭될수록 운영자가 직접 넣은 항목 수', to: '/p/moimjigi' },
  { value: '22 / 0', caption: '검사기에 일부러 심은 결함 중 잡음 / 놓침', to: '/p/moimjigi' },
  { value: 3250, caption: '키 없이 다시 검산되는 오프라인 검사 수', to: '/p/pricesignal' },
  { value: 17, caption: '통계청 4곳을 거쳐 같은 경로로 다루는 시장 수', to: '/p/pricesignal' },
  { value: '504', caption: '법정 판정 조합 전수. 근거 조문 모순 0건', to: '/p/362' },
  { value: 0, caption: '운영 중인 서비스가 바깥으로 보내는 요청 수', to: '/p/362' },
  { value: 20374, caption: '별로 찍은 제22대 국회 법안 수', to: '/p/radar' },
  { value: '21위', caption: '공개 120위권에서 비공개 평가로 올라간 자리', to: '/p/moimjigi' },
]

// 2026년 기록. 넣을 만한 것만, 짧게.
export const log = [
  { when: '7월', text: '삼성 SCPC 2026 1차 예선. 에이전트 하네스를 설계해 비공개 평가 21위로 2차 진출.', to: '/p/moimjigi' },
  { when: '7월', text: '기억함. 보훈 공공데이터·AI 공모전에 사흘 만에 시연 MVP를 만들어 출품.', to: '/p/gieokham' },
  { when: '7월 29일 – 8월 5일', text: '2차 예선. 처음 하는 Android로 7일 안에 설치 가능한 앱 "모임지기" 제출.', to: '/p/moimjigi' },
  { when: '8월', text: '본선 발표. AI 트랙 4등상.', to: '/p/moimjigi', stamp: 'award' },
  { when: '8월 – 9월', text: '삼육이. 금융 AI Challenge에 출품하고 지금까지 운영 중.', to: '/p/362' },
  { when: '9월', text: 'DACON 나라장터 입찰공고 법령위반 모니터링. 17위, 15위 컷에 0.001 부족. 같은 달 시작한 두 대회는 폐기.', to: '/how#leaderboard' },
  { when: '9월 –', text: 'KISTI DATA·AI 분석 경진대회, 한국어 웹 대체텍스트 품질 판정. 규칙 40건을 정밀도 1.000으로 못 박고 나머지만 모델에 넘기는 구조. 11월 6일 마감.' },
  { when: '10월 –', text: '내 법안 레이더. 수업 팀 프로젝트, 웹과 배포 담당.', to: '/p/radar' },
  { when: '10월 12일', text: '고용24 AI 고용서비스 해커톤에 기획안 "인정 미리보기"(실업급여 수급자용 재취업활동 인정 여부 미리 판정) 제출.' },
  { when: '10월 14일', text: '내가 에이전트와 일해 온 방식을 로그 숫자로 진단하고 운영 방식을 바꿈.', to: '/how' },
  { when: '10월', text: 'DACON 항만 선박 매칭. 0.936까지 올리고 폐기. 교훈은 장치로 남김.', to: '/how#leaderboard' },
  { when: '10월 22일 – 28일', text: 'PriceSignal. Open Agent Hackathon 2026 제출.', to: '/p/pricesignal' },
  { when: '10월 30일', text: '해운·항만·물류 AX 아이디어 공모전에 기획서와 HTML 프로토타입 제출. "포워더용 발행 전 체크B/L 정정 예방 AI".' },
  { when: '11월 2일', text: 'Zetaris Demo Challenge에 PriceSignal 영상 제출.', to: '/p/pricesignal' },
  { when: '11월', text: '청도 바이브코딩 해커톤(5–6일), KIC AI 에이전트 공모전(12일), 현대차그룹 차량용 앱 공모전·AI 우왕톤(15일).', stamp: 'planned' },
]
