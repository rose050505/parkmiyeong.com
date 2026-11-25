// 운영단 표 (청사진 §3 · §7 프론트 순서 6 · 경영도우미 설계 §4 P): 사장님 심사 · 학생 선발 · 팀 구성 · 추적(월 집계 · 「버티기 위험」)
// 이 브라우저에서 실제로 낸 지원서 · 가게만 보인다(지어낸 가게는 넣지 않음). 백엔드가 붙으면 db 부분만 GET /track · 심사 API로.
(function () {
  const A = window.APP, { st, save, store, SP, esc, shortAddr } = A;
  const MY = () => window.MYSTORE;
  const TABS = [['owner', '사장님 심사'], ['student', '학생 선발'], ['team', '팀 구성'], ['track', '추적']];
  let tab = 'owner';
  const ownerApps = () => st.ownerApps || (st.ownerApps = []);
  const stuApps = () => st.stuApps || (st.stuApps = []);
  if (!st.teams || typeof st.teams !== 'object') st.teams = {};
  if (!Array.isArray(st.opsLog)) st.opsLog = [];
  const rerender = () => { const W = document.getElementById('work'), y = W.scrollTop; A.rerender(); W.scrollTop = y; };
  const LM = Object.entries(A.M.lm).map(([name, [x, y]]) => ({ name, x, y }));

  // 바람 수요(계산): 창업 준비면 그 빈칸 바람, 운영 중이면 가게 위치(「내 가게」에서 찍은 곳 → 상담에서 고른 곳) 150m 안 바람(없으면 300m 안 가까운 3개 — 「내 가게」와 같은 계산)
  // 운영팀이 넣어 둔 바람은 따로 센다(실제 시민 수요가 아님)
  function demand(ap) {
    let ws = [];
    if (ap.space && SP[ap.space]) ws = store.bySpace(ap.space);
    else {
      const ms = MY().storeOf(ap.uid), pt = (ms && ms.setup && ms.pt) || LM.find(l => l.name === ap.near);
      if (pt) ws = window.OWNER.tools.nearWishes(pt, ap.item).list.map(x => x.w);
    }
    const mem = ws.filter(w => !w.seed);
    return { n: ws.length, likes: ws.reduce((x, w) => x + store.likes(w), 0), seed: ws.length - mem.length, memN: mem.length, memLikes: mem.reduce((x, w) => x + store.likes(w), 0), top: ws.slice().sort((a, b) => store.likes(b) - store.likes(a))[0] };
  }
  const score = ap => ap.score || { ready: 0, fit: 0 };
  const total = ap => { const s = score(ap), d = demand(ap); return s.ready + s.fit + Math.min(5, Math.ceil(d.likes / 10)); };   // 바람 수요 점수 = 공감 10개당 1점(최대 5) [가정]

  function decideOwner(id, v) {
    if (!A.hasRole('ops')) return null;
    const ap = ownerApps().find(a => a.id === id); if (!ap) return null;
    ap.result = v; ap.decidedAt = Date.now();
    if (st.owner && st.owner.appId === id) st.owner.result = v;   // 사장님 화면 진행 상태가 이 값을 읽음
    save(); A.toast(v === 'yes' ? `「${ap.item}」 선정 · 학생 모집 공고가 올라가요` : `「${ap.item}」 미선정 · 비교군으로 추적해요`); return ap;
  }
  function decideStudent(id, v) {
    if (!A.hasRole('ops')) return null;
    const sa = stuApps().find(a => a.id === id); if (!sa) return null;
    sa.status = v; if (st.stu && st.stu.appId === id) st.stu.status = v;
    save(); A.toast(v === 'pass' ? `${sa.name} 학생 선발 · 사장님 면담으로` : `${sa.name} 학생 · 다음 기회`); return sa;
  }

  function tOwner() {
    const L = ownerApps().slice().reverse();
    if (!L.length) return '<p class="emptyw">아직 들어온 사장님 지원서가 없어요. 사장님 상담 → 지원서를 내면 여기에 떠요.</p>';
    return `<div class="tblwrap"><table class="otable"><thead><tr><th>가게 · 자리</th><th>상황 · 과제</th><th>바람 수요 <small>계산</small></th><th>준비 정도</th><th>과제 적합</th><th>합계</th><th>결과</th></tr></thead><tbody>
      ${L.map(ap => { const d = demand(ap), s = score(ap); return `<tr><td><b>${esc(ap.item)}</b><br><small>${esc(ap.place)} · ${esc(ap.name)}</small></td>
        <td><small>${ap.status === 'pre' ? '창업 준비' : '운영 중'}${ap.trouble ? ' · ' + esc(ap.trouble) : ''} · ${esc(ap.when || '')}<br>${ap.tasks.map(t => esc(t.t)).join(' · ')}</small></td>
        <td>${d.n}개 · ♥${d.likes}${d.seed ? `<br><small>운영팀 바람 ${d.seed}개 포함 · 회원 바람 ${d.memN}개 ♥${d.memLikes}</small>` : ''}${d.top ? `<br><small>1위 「${esc(d.top.title)}」</small>` : ''}</td>
        ${['ready', 'fit'].map(k => `<td><select data-p-in="${k}" data-id="${ap.id}"${ap.result ? ' disabled' : ''}>${[0, 1, 2, 3, 4, 5].map(n => `<option value="${n}"${s[k] === n ? ' selected' : ''}>${n || '—'}</option>`).join('')}</select></td>`).join('')}
        <td><b>${total(ap)}</b><small> / 15</small></td>
        <td>${ap.result ? `<span class="tag ${ap.result === 'yes' ? 'real' : ''}">${ap.result === 'yes' ? '선정' : '미선정 · 비교군'}</span> <button class="link" data-p="undo" data-id="${ap.id}">되돌리기</button>` : `<button class="cta sm" data-p="oyes" data-id="${ap.id}">선정</button><button class="cta2 sm" data-p="ono" data-id="${ap.id}">미선정</button>`}</td></tr>`; }).join('')}
      </tbody></table></div>
      <p class="fine">합계 = 준비 정도(0~5) + 과제 적합(0~5) + 바람 수요(공감 10개당 1점, 최대 5) — 배점은 [가정], 운영단이 정해요. 운영팀이 넣어 둔 바람은 실제 시민 수요가 아니니 회원 바람 수를 같이 봐요. 미선정 가게는 같은 동의로 비교군이 되어 「내 가게」를 똑같이 쓰고, 합격선 근처 가게끼리 업종 · 개업 시기를 맞춰 비교해요 [제안].</p>`;
  }

  function tStudent() {
    const L = stuApps().slice().reverse();
    if (!L.length) return '<p class="emptyw">아직 들어온 학생 지원서가 없어요. 대학생 화면에서 지원서를 내면 여기에 떠요.</p>';
    return `<div class="tblwrap"><table class="otable"><thead><tr><th>학생</th><th>지원한 자리</th><th>관심 직무 · 가능 시간</th><th>답 2개</th><th>결과</th></tr></thead><tbody>
      ${L.map(sa => `<tr><td><b>${esc(sa.name)}</b><br><small>${esc(sa.prof.school)} ${esc(sa.prof.major)}</small></td><td>${esc(sa.roleT)}<br><small>@ ${esc(sa.item)}</small></td>
        <td><small>${esc(sa.prof.groups.join(', '))}<br>${esc(sa.prof.time.join(', '))}</small></td>
        <td><details><summary>답 보기</summary>${(sa.qs || []).map((q, i) => `<p class="fine"><b>Q${i + 1}. ${esc(q)}</b><br>${esc((sa.ans || [])[i] || '')}</p>`).join('')}</details></td>
        <td>${sa.status === 'sent' ? `<button class="cta sm" data-p="spass" data-id="${sa.id}">선발</button><button class="cta2 sm" data-p="sdrop" data-id="${sa.id}">다음 기회</button>` : `<span class="tag">${esc({ pass: '선발 · 면담 전', met: '면담 완료', team: '팀 확정', run: '학기 진행', drop: '다음 기회' }[sa.status] || sa.status)}</span>`}</td></tr>`).join('')}
      </tbody></table></div><p class="fine">선발은 운영단 → 사장님 면담 순서예요. 전공 · 학년 제한은 두지 않아요.</p>`;
  }

  // 팀 구성: 선정 가게 × 선발 학생. 짝 후보는 학생 추천(reco)과 같은 AI 칸을 다시 쓰고, 안 되면 관심 직무로 맞춤
  const pairBusy = {};
  function suggest(ap, sa) {
    const key = ap.id + '|' + sa.id; if (ap.pairs && ap.pairs[key]) return ap.pairs[key];
    if (pairBusy[key]) return null; pairBusy[key] = true;
    const slots = ap.tasks.map((t, i) => ({ id: `p${i}:${i}`, item: ap.item, t: t.t, major: t.major }));   // reco는 id 8자까지만 받음
    const rule = () => { const g = (sa.prof.groups || []).join(' '), i = ap.tasks.findIndex(t => t.major.split(/\s*·\s*/).some(m => g.includes(m.slice(0, 2)) || (sa.prof.major || '').includes(m.slice(0, 2)))); return { i: i < 0 ? 0 : i, why: i < 0 ? '관심 직무와 바로 맞는 자리가 없어 첫 자리로' : '관심 직무 · 학과와 맞는 전공', ai: false }; };
    window.ASSIST.call('reco', { major: sa.prof.major, groups: sa.prof.groups, time: sa.prof.time, slots }, 20000)
      .then(out => { const p = out.pick[0], i = +String(p.id).split(':')[1]; return isNaN(i) ? rule() : { i, why: p.why, ai: true }; }, rule)
      .then(r => { (ap.pairs || (ap.pairs = {}))[key] = r; pairBusy[key] = false; save(); if (A.view().mode === 'ops' && tab === 'team') rerender(); });
    return null;
  }
  function tTeam() {
    const sel = ownerApps().filter(a => a.result === 'yes'), pool = stuApps().filter(a => ['pass', 'met', 'team', 'run'].includes(a.status));
    if (!sel.length) return '<p class="emptyw">선정된 가게가 아직 없어요. 「사장님 심사」에서 먼저 선정해 주세요.</p>';
    return sel.map(ap => {
      const tm = st.teams[ap.id] || { members: [] };
      return `<section class="oq"><h3>${esc(ap.item)} <small>@ ${esc(ap.place)} · 자리 ${ap.tasks.length}개</small></h3>
        <ul class="slots">${ap.tasks.map((t, i) => { const m = tm.members.find(x => x.slot === i); return `<li><b>${esc(t.t)}</b> <small>${esc(t.major)}</small> — ${m ? `<span class="tag real">${esc(m.name)}</span> <button class="link" data-p="unpair" data-id="${ap.id}" data-i="${i}">빼기</button>` : '<small>비어 있음</small>'}</li>`; }).join('')}</ul>
        ${pool.length ? `<div class="tlist">${pool.map(sa => { const sg = suggest(ap, sa), inT = tm.members.find(x => x.sa === sa.id), other = !inT && Object.entries(st.teams).some(([k, t]) => k !== ap.id && t.members.some(x => x.sa === sa.id));
          return `<div class="trow"><span><b>${esc(sa.name)}</b> <small>${esc(sa.prof.major)} · ${esc(sa.prof.groups.join(', '))} · 지원: ${esc(sa.roleT)}</small><br><small>${sg ? `짝 후보: 「${esc(ap.tasks[sg.i] ? ap.tasks[sg.i].t : '')}」 — ${esc(sg.why)} ${sg.ai ? '<span class="tag ai">AI</span>' : '<span class="tag">기본 추천</span>'}` : '<span class="busy">짝 후보 찾는 중…</span>'}</small></span>
            ${inT ? '<small>이 팀</small>' : other ? '<small>다른 팀</small>' : `<span class="pbtns">${sa.post === ap.id ? `<button class="cta2 sm" data-p="pair" data-id="${ap.id}" data-s="${sa.id}" data-i="${sa.role}">지원한 자리로</button>` : ''}${sg && !(sa.post === ap.id && sg.i === sa.role) ? `<button class="cta2 sm" data-p="pair" data-id="${ap.id}" data-s="${sa.id}" data-i="${sg.i}">짝 후보 자리로</button>` : ''}</span>`}</div>`; }).join('')}</div>` : '<p class="fine">선발된 학생이 아직 없어요(「학생 선발」 탭).</p>'}
        <div class="onav"><span>${tm.at ? `<small>팀 확정 · ${new Date(tm.at).toLocaleDateString('ko-KR')}</small>` : ''}</span><button class="cta sm" data-p="teamok" data-id="${ap.id}"${tm.members.length ? '' : ' disabled'}>팀 확정 (지도교수 배정 · 학생에게 알림)</button></div></section>`;
    }).join('');
  }

  function tTrack() {
    const stores = MY().stores().filter(s => s.setup), tracked = stores.map(s => ({ s, ap: MY().appOf(s) })).filter(x => x.ap && x.ap.track);
    const reported = MY().db.answers().filter(a => a.reports > 0);
    const rows = tracked.map(({ s, ap }) => ({ s, ap, risk: MY().risk(s), note: MY().areaNote(s), m: MY().monthly(s) }));
    const atRisk = rows.filter(r => r.risk.length).length;
    // 효과 요약(설계서 §0 전체 지표): 선정 · 비교군의 이번 달 기록 지속 · 영업 유지, 그리고 바람 → 답 → 알림 → 보여 주기 → 방문 단계
    const cur = new Date().toISOString().slice(0, 7), grp = res => rows.filter(r => r.ap.result === res);
    const keep = L => { const sh = L.filter(r => MY().shareOf(r.s).open); return sh.length ? `${sh.filter(r => !r.risk.some(x => /기록 없음|문 닫았/.test(x))).length} / ${sh.length}곳` : '—'; };
    const live = MY().db.answers().filter(a => !a.hidden), F = live.map(a => MY().funnel(a)).reduce((t, f) => ({ sent: t.sent + f.sent, shows: t.shows + f.shows, went: t.went + f.went, came: t.came + f.came, ok: t.ok + f.ok }), { sent: 0, shows: 0, went: 0, came: 0, ok: 0 });
    const small = grp('yes').length < 5 || grp('no').length < 5;
    const cell = v => v == null ? '<td class="off">공유 안 함</td>' : `<td>${esc(v === '' ? '—' : v)}</td>`;
    return `<div class="kpis"><div><b>${tracked.length}</b><small>추적 중인 가게 (선정 ${tracked.filter(r => r.ap.result === 'yes').length} · 비교군 ${tracked.filter(r => r.ap.result === 'no').length})</small></div><div><b class="${atRisk ? 'bad' : ''}">${atRisk}</b><small>「버티기 위험」 표시</small></div><div><b>${st.opsLog.length}</b><small>연결한 지원 · 학생 팀</small></div><div><b>${MY().db.answers().filter(a => !a.hidden).length}</b><small>근처 바람에 올라간 답</small></div></div>
      <section class="oq"><h3>효과 요약 <small>${esc(cur.replace('-', '.'))} 기준${small ? ' · 표본 부족(선정 · 비교군 각 5곳 미만 — 비교는 참고만)' : ''}</small></h3>
        <div class="tblwrap"><table class="otable"><thead><tr><th></th><th>가게</th><th>기록 · 영업 이어 가는 곳 <small>(한 달 넘게 기록 없음 · 문 닫음 제외)</small></th><th>올린 답</th></tr></thead><tbody>
          ${[['선정', 'yes'], ['비교군', 'no']].map(([t, k]) => `<tr><td>${t}</td><td>${grp(k).length}곳</td><td>${keep(grp(k))}</td><td>${grp(k).reduce((x, r) => x + MY().myAnswers(r.s).length, 0)}개</td></tr>`).join('')}</tbody></table></div>
        <p class="funnel">바람에 올라간 답 <b>${live.length}</b> → 알림 받은 회원 <b>${F.sent}</b> → 보여 주기 연 회원 <b>${F.shows}</b> → 가 봤어요 <b>${F.went}</b> → 바람 보고 온 손님 <b>${F.came}</b> <small>(그중 시민 화면에서 사장님 확인 ${F.ok})</small></p>
        <p class="fine">6 · 12개월 [가정] 영업 유지는 개업 뒤 추적이 쌓이면 이 표에 이어 붙어요. 바람 보고 온 손님이 보여 주기 연 회원보다 많으면 사장님 [＋]만으로 센 것이라 확인이 필요해요.</p></section>
      ${rows.length ? rows.map(({ s, ap, risk, note, m }) => `<section class="oq${risk.length ? ' risk1' : ''}"><h3>${esc(MY().storeLabel(s))} <small>${ap.result === 'yes' ? '선정' : ap.result === 'no' ? '비교군' : '심사 중'} · ${esc(s.sub)}</small></h3>
        ${risk.length ? `<p class="rflag"><b>버티기 위험</b> ${risk.map(esc).join(' · ')} <small>[가정 — 기준은 운영단이 정함]</small></p><div class="ochips"><button data-p="act" data-id="${esc(s.id)}" data-v="지원 안내 연결">지원 안내 연결</button><button data-p="act" data-id="${esc(s.id)}" data-v="학생 팀 연결">학생 팀 연결</button></div>` : ''}
        ${note ? `<p class="anote"><b>주변 변화</b> ${esc(note)} <small>위험 수에는 넣지 않음 · 사라진 업소는 이전 · 상호 변경일 수도 있음</small></p>` : ''}
        <div class="tblwrap"><table class="otable"><thead><tr><th>달</th><th>영업 일수</th><th>매출 구간</th><th>답 수</th><th>판매 일수</th><th>누적 판매</th><th>바람 보고 온 손님</th></tr></thead>
        <tbody>${m.map(r => `<tr><td>${r.ym.replace('-', '.')}${r.alive ? ` <small>${esc(r.alive)}</small>` : ''}</td>${cell(r.open)}${cell(r.band)}${cell(r.answers)}${cell(r.soldDays)}${cell(r.sold)}${cell(r.came)}</tr>`).join('')}</tbody></table></div>
        ${st.opsLog.filter(l => l.sid === s.id).map(l => `<small class="fine">${new Date(l.at).toLocaleDateString('ko-KR')} ${esc(l.what)}</small>`).join(' · ')}</section>`).join('')
        : '<p class="emptyw">추적할 가게가 아직 없어요. 지원서(추적 동의)를 낸 사장님이 「내 가게」를 설정하면 월 집계가 여기에 떠요.</p>'}
      ${stores.length > tracked.length ? `<p class="fine">지원서 없이 「내 가게」를 쓰는 가게 ${stores.length - tracked.length}곳은 공유 동의가 없어 보이지 않아요.</p>` : ''}
      <p class="fine">공유 항목은 사장님이 「내 가게 → 공유 항목」에서 켠 것만 보여요. 메뉴 가격 · 정확한 매출 · 답글 밖의 메모 · 손님 정보는 이 표에 나오지 않게 만들었어요(백엔드에서도 같은 항목만 내보내요).</p>
      <h3 style="margin-top:18px">신고된 답 <small>${reported.length}건</small></h3>
      ${reported.length ? `<div class="tlist">${reported.map(a => `<div class="trow"><span><b>${esc(a.store)}</b> 「${esc(a.menu)}」 <small>${esc(a.reply)}</small><br><small>신고 ${a.reports}건 · ${esc((a.reportWhy || []).join(', '))}</small></span>${a.hidden ? `<button class="cta2 sm" data-p="unhide" data-id="${a.id}">다시 보이기</button>` : `<button class="cta2 sm" data-p="hide" data-id="${a.id}">숨기기</button>`}</div>`).join('')}</div>` : '<p class="fine">신고된 답이 없어요.</p>'}`;
  }

  function render() {
    if (!A.hasRole('ops')) return `<div class="owrap"><div class="otop"><button class="back" data-p="map">← 지도로</button><p class="kick">운영단 표</p></div><section class="ocard"><h2>운영단 회원만 볼 수 있어요</h2><p class="was">대구시 + 지역 대학 운영단 계정으로 로그인해 주세요(회원 역할 「운영단」).</p></section></div>`;
    const body = { owner: tOwner, student: tStudent, team: tTeam, track: tTrack }[tab]();
    return `<div class="owrap wide"><div class="otop"><button class="back" data-p="map">← 지도로</button><p class="kick">운영단 표 · 동행 프로젝트 1기 (대구시 + 지역 대학)</p>
      <div class="ptabs">${TABS.map(([k, t]) => `<button class="${tab === k ? 'on' : ''}" data-p="tab" data-v="${k}">${t}<small>${{ owner: ownerApps().filter(a => !a.result).length, student: stuApps().filter(a => a.status === 'sent').length, team: ownerApps().filter(a => a.result === 'yes' && !(st.teams[a.id] || {}).at).length, track: '' }[k] || ''}</small></button>`).join('')}</div></div>
      ${body}</div>`;
  }

  const Wk = document.getElementById('work');
  const isOps = () => document.body.classList.contains('work-open') && A.view().mode === 'ops';
  Wk.addEventListener('change', e => {
    if (!isOps()) return;
    const k = e.target.dataset.pIn; if (!k) return;
    const ap = ownerApps().find(a => a.id === e.target.dataset.id); if (!ap) return;
    ap.score = Object.assign(score(ap), { [k]: +e.target.value }); save(); rerender();
  });
  Wk.addEventListener('click', e => {
    if (!isOps()) return;
    const b = e.target.closest('[data-p]'); if (!b) return;
    e.preventDefault();
    const k = b.dataset.p, id = b.dataset.id;
    switch (k) {
      case 'map': return A.go('home');
      case 'tab': tab = b.dataset.v; return A.rerender();
      case 'oyes': decideOwner(id, 'yes'); return rerender();
      case 'ono': decideOwner(id, 'no'); return rerender();
      case 'undo': { const ap = ownerApps().find(a => a.id === id); if (ap) { ap.result = null; if (st.owner && st.owner.appId === id) st.owner.result = null; save(); } return rerender(); }
      case 'spass': decideStudent(id, 'pass'); return rerender();
      case 'sdrop': decideStudent(id, 'drop'); return rerender();
      case 'pair': {
        const ap = ownerApps().find(a => a.id === id), sa = stuApps().find(a => a.id === b.dataset.s); if (!ap || !sa) return;
        const tm = st.teams[ap.id] || (st.teams[ap.id] = { members: [], at: 0 }), i = +b.dataset.i;
        tm.members = tm.members.filter(m => m.slot !== i && m.sa !== sa.id).concat({ sa: sa.id, uid: sa.uid, name: sa.name, major: sa.prof.major, slot: i, slotT: ap.tasks[i] ? ap.tasks[i].t : '' });
        save(); return rerender();
      }
      case 'unpair': { const tm = st.teams[id]; if (tm) { tm.members = tm.members.filter(m => m.slot !== +b.dataset.i); save(); } return rerender(); }
      case 'teamok': {
        const tm = st.teams[id]; if (!tm || !tm.members.length) return;
        tm.at = Date.now(); tm.members.forEach(m => { m.slot = m.slot; m.slotName = m.slotT; const sa = stuApps().find(a => a.id === m.sa); if (sa && ['pass', 'met'].includes(sa.status)) { sa.status = 'team'; if (st.stu && st.stu.appId === sa.id) st.stu.status = 'team'; } });
        save(); A.toast('팀을 확정했어요 · 사장님 「내 가게 → 학생 팀」에 떠요'); return rerender();
      }
      case 'act': st.opsLog.push({ sid: id, what: b.dataset.v, at: Date.now() }); save(); A.toast(`${b.dataset.v}을 기록했어요`); return rerender();
      case 'hide': case 'unhide': { const a = MY().db.answer(id); if (a) { a.hidden = k === 'hide'; MY().db.putAnswer(a); A.toast(a.hidden ? '답을 숨겼어요 · 시민에게 안 보여요' : '다시 보이게 했어요'); } return rerender(); }
    }
  });

  window.OPS = { render, decideOwner, decideStudent, demand };
})();
