# parkmiyeong.com

박미영 포트폴리오. React + Vite + Tailwind, react-router, Vercel.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/
```

## 어디를 고치나

- 프로젝트 여섯 개의 모든 글과 숫자: `src/content/projects.js`
- 첫 화면의 확인된 결과(3), 강점(4), 2026년 기록: `src/content/home.js`
- 프로젝트 순서는 `projects.js` 배열 순서. 카드의 공들인 부분은 `craft`, 키운 능력은 `skills`
- 일하는 방식 페이지: `src/content/how.js`
- 연락처·링크: `src/content/site.js`
- 색·글꼴: `src/index.css`의 `@theme` (다크 모드는 `prefers-color-scheme`)
- 이미지: `public/img/*.webp`
- 영어판 글: `src/content/en/` (한국어 파일과 같은 모양). 화면 문구(메뉴·제목·버튼): `src/i18n.jsx`의 `ui`
  한국어 글을 고치면 영어 파일의 같은 자리도 고친다

## 구조

- `/` 첫 화면, `/p/<slug>` 프로젝트, `/how` 일하는 방식. 앞에 `/en`을 붙이면 영어판(`/en`, `/en/p/<slug>`, `/en/how`).
  언어는 주소로만 정하고 자동 이동은 없다. content의 내부 링크는 한국어 경로로 적고 `L` 컴포넌트가 `/en`을 붙인다.
- SPA라 `vercel.json`이 모든 경로를 `index.html`로 보낸다.
- 글꼴은 Pretendard Variable을 npm 패키지에서 가져와 번들에 포함한다. 외부 폰트 요청이 없다.
