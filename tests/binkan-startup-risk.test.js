import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import handler from '../api/binkan-startup-risk.js';

const ownerScript = readFileSync(new URL('../public/drafthon/binkan/owner.js', import.meta.url), 'utf8');
const space = { id: 'V015', x: 128.599847, y: 35.869114, was: '카페', wasL: '음식' };
const vacancy = { depositKrw: 20000000, monthlyRentKrw: 1000000, areaM2: 54 };

function openConsultation(fetch, assist = () => assert.fail('unexpected task assistant request')) {
  const listeners = {};
  const st = { owner: { step: 1, status: 'pre', known: 'both', item: '스시 오마카세', space: space.id } };
  const window = {
    BK: { spaces: { [space.id]: vacancy } },
    ASSIST: { call: assist },
    APP: {
      st, SP: { [space.id]: space }, M: { lm: {}, bg: [], spaces: [space], meta: { q_now: '시범 분기' } },
      SUP: { list: [], checked: '' }, store: { bySpace: () => [] },
      esc: value => String(value ?? '').replaceAll('<', '&lt;').replaceAll('>', '&gt;'), shortAddr: () => '공평로 55-1',
      view: () => ({ mode: 'owner' }), adHTML: () => '', save() {}, rerender() {},
    },
  };
  runInNewContext(ownerScript, {
    window, fetch, AbortSignal,
    document: { getElementById: () => ({ addEventListener: (type, listener) => { listeners[type] = listener; } }) },
  });
  return {
    render: window.OWNER.render,
    click: (action, data = {}) => listeners.click({
      target: { closest: () => ({ dataset: { o: action, ...data } }) }, preventDefault() {},
    }),
    state: st.owner,
  };
}

async function request(api, body, origin = 'https://parkmiyeong.com') {
  let code;
  const req = { method: 'POST', headers: { origin }, body };
  return api(req, {
    setHeader() {}, status(value) { code = value; return this; },
    json(value) { return Response.json(value, { status: code }); },
  });
}

test('the risk card shows the findings, and the task button opens the Render projects', async () => {
  const token = process.env.STARTUP_RISK_API_TOKEN;
  const originalFetch = globalThis.fetch;
  process.env.STARTUP_RISK_API_TOKEN = 'test-only';
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, auth: init.headers.Authorization, body: JSON.parse(init.body) });
    return Response.json({
      analysisStatus: 'analyzed', summary: '보완 필요 · 현장 확인',
      findings: [{ label: '보증금', status: 'high', status_label: '위험', evidence: '<비교 자료>', action: '임대 조건 확인' }],
      studentProjects: ['주변 상권 조사', '공간 조건 확인', '임대 조건 비교', '차별안 검증', '유입 채널 설계']
        .map(task => ({ task, suggested_majors: ['경영학', '통계학'], deliverable: '조사표' })),
      candidates: [{ learned_risk: { status: 'unavailable', reason: '연구용 모델' },
        public_comparison: { status: 'available', radius_m: 300, nearby_business_count: 120,
        same_industry_count: 7, industry_match: { industry: '일식 회/초밥' }, observed_on: '2026-09-30' } }],
    });
  };
  try {
    const browser = openConsultation((path, init) => {
      assert.equal(path, '/api/binkan-startup-risk');
      return request(handler, init.body);
    });
    assert.match(browser.render(), /이 자리의 위험과 근거 보기/);
    const response = browser.click('go2');
    assert.match(browser.render(), /AI가 주변 상권과 창업 아이템을 비교/);
    await response;
    assert.deepEqual(calls, [{
      url: 'https://v2v-dongseongro-risk.onrender.com/api/startup-risk/direct', auth: 'Bearer test-only',
      body: { businessIdea: '스시 오마카세', latitude: space.y, longitude: space.x, industry: '일식 회/초밥', ...vacancy },
    }]);
    const html = browser.render();
    assert.match(html, /반경 300m · 주변 점포 120곳/);
    assert.match(html, /학습 모델 추정 보류 · 연구용 모델/);
    assert.match(html, /class="hi".*보증금 · 위험.*&lt;비교 자료&gt;.*임대 조건 확인/);
    assert.doesNotMatch(html, /주변 상권 조사|추천 학생 과제/);
    assert.doesNotMatch(html, /test-only/);

    await browser.click('go3');
    const tasks = browser.render();
    assert.match(tasks, /대학생 4인 팀과 한 학기 동안 할 일/);
    assert.match(tasks, /주변 상권 조사.*경영학 · 통계학.*조사표/);
    assert.match(tasks, /유입 채널 설계/);
    assert.equal((tasks.match(/type="checkbox" data-o="task"/g) || []).length, 5);
    assert.equal((tasks.match(/type="checkbox"[^>]+ checked/g) || []).length, 4);
    assert.doesNotMatch(tasks, /null주|undefined주/);
    assert.equal(calls.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (token === undefined) delete process.env.STARTUP_RISK_API_TOKEN;
    else process.env.STARTUP_RISK_API_TOKEN = token;
  }
});

test('an unavailable service offers a retry and a place outside the pilot shows the site data', async () => {
  let requests = 0, assistantRequests = 0;
  const browser = openConsultation(async () => ++requests === 1
    ? Response.json({ error: '분석 연결 오류' }, { status: 502 })
    : Response.json({ analysisStatus: 'outside_coverage', summary: '시범 자료 범위 밖', findings: [], studentProjects: [] }),
  async (kind, input) => {
    assistantRequests++;
    assert.equal(kind, 'tasks');
    assert.ok(input.risks.some(risk => risk.includes('100m 안')));
    return { expert: [], list: [{ t: '점심 수요 조사', major: '경영', out: '설문 결과', wk: 4 }] };
  });
  browser.state.reco = [{ space: space.id, item: '스시 오마카세', why: [] }];
  await browser.click('pick', { i: '0' });
  assert.match(browser.render(), /분석 연결 오류/);
  assert.match(browser.render(), /AI 분석 다시 시도/);
  await browser.click('retry-risk');
  assert.match(browser.render(), /시범 자료 범위 밖/);
  assert.match(browser.render(), /기존 100m 상권 현황/);
  assert.doesNotMatch(browser.render(), /위험 높음|AI 분석 다시 시도/);
  await browser.click('go3');
  assert.match(browser.render(), /점심 수요 조사.*경영 · 4주/);
  assert.equal(assistantRequests, 1);
  assert.equal(requests, 2);
});

test('clicking the task button while the analysis is loading reuses the pending request', async () => {
  let requests = 0, sendResult;
  const response = new Promise(resolve => { sendResult = resolve; });
  const browser = openConsultation(() => { requests++; return response; });
  const risk = browser.click('go2');
  const tasks = browser.click('go3');
  assert.equal(browser.state.step, 2);
  sendResult(Response.json({ analysisStatus: 'analyzed', summary: '분석 완료', findings: [],
    studentProjects: [{ task: '입구 보행량 조사', suggested_majors: ['통계학'], deliverable: '시간대별 조사표' }] }));
  await Promise.all([risk, tasks]);
  assert.equal(browser.state.step, 3);
  assert.match(browser.render(), /입구 보행량 조사/);
  assert.equal(requests, 1);
});

test('the proxy rejects invalid requests before calling Render', async () => {
  const body = { businessIdea: '카페', spaceId: 'V015', latitude: space.y, longitude: space.x };
  assert.equal((await request(handler, { ...body, spaceId: 'not-a-space' })).status, 400);
  assert.equal((await request(handler, body, 'https://other.example')).status, 403);
});
