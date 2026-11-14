// English version of ../how.js. Numbers come from my Oct 14, 2026 self-audit of work logs and from each competition's records.

export const how = {
  title: 'How I work',
  lead:
    'I work alone, but not by myself. Claude Code on my laptop and a coordinating session in the cloud form one team (until early November, Codex handled reviews and overnight runs). I own the success criteria, the validation sets, changes of direction, and the final call. This page describes how that setup looks, where it broke down, and what I changed because of it.',
  blocks: [
    { type: 'h', text: 'Splitting the roles' },
    { type: 'p', text: 'Each session can do different things. Claude Code on my laptop touches local files and GPU pods. The cloud session reads competition pages and forums in a browser and designs strategy. Until early November I used Codex as reviewer and overnight runner, not because it comes from a different company but because it had a separate token budget and was good at reviewing documents. I press the submit button myself. Only decisions that are hard to undo come up to me — a DACON submission, topping up RunPod credit, interpreting a rule, a large expense — and the agents decide the rest.' },
    { type: 'p', text: 'At night I send a job file (JOB.md) that states the success condition as a command, the limits in hours, turns and dollars, and the line “report what you find; don’t act on new directions.” Results land in a handoff file (HANDOFF.md), and my phone gets a DONE, FAIL or STUCK push. In the morning I look only at the push and the result file, and there are one or two decisions to make per day.' },

    { type: 'h', text: 'Oct 14, 2026: I audited myself' },
    { type: 'p', text: 'In September I ran three DACON competitions at once, with one coordinating session checking on three cloud sessions and three Claude Code sessions every 30 minutes. It burned a lot of tokens and achieved nothing. So before entering another competition, I decided to examine the way I had been working with agents. I ran a script that collected work traces from my laptop, interviewed myself, and compared the two to get a diagnosis.' },
    { type: 'facts', rows: [
      ['What the logs said', '52 Claude Code sessions, 2,528 user turns, 197 context compactions. Ten days of the procurement competition took 19 sessions, 60,592 assistant turns and 25,838 shell commands. One session started before dawn on Sep 22 stayed open for 5.4 days'],
      ['Where the interview disagreed', 'I said I “almost never add rules to instruction files,” yet the project instruction files were 150–326 lines long. The agents, not I, had grown them: after every incident an agent wrote a rule in prose for the next session'],
      ['Why I trusted the reports', 'I had no way not to. The competition projects had no tests, no hooks and no git; verification was the agent’s own claim that the “checklist passed.” The product projects had tests, and there Codex stopped on its own: “didn’t pass, so not pushing”'],
      ['Four patterns', 'State had no owner. Verification was prose. Rules grew as agents wrote them for other agents. The watcher and the worker were the same kind of session, run in a loop'],
    ] },
    { type: 'p', text: 'What I changed is simple. One session per task modifies files. A machine decides when work is done (tests, lint, build). State lives in the repository. People write the rules and hooks enforce them. Waiting happens outside the model. Model review is third in line, not first: mechanical checks, then re-measuring the outputs, then model review. And I don’t record mistakes as sentences.' },
    { type: 'quote', text: 'Lessons written down as sentences were not followed. Only the ones enforced by hooks and gate scripts held.', cite: 'Lesson from the port-matching competition, Oct 29, 2026' },

    { type: 'h', text: 'What leaderboard competitions taught me', id: 'leaderboard' },
    { type: 'p', text: '**Public procurement (September).** The task was to decide which of 24 legal requirements a public bid notice violated. A fixed model on the server (Gemma 26B) had to process 1,853 notices within two hours, and training was forbidden, so the only tools were model output and hand-written rules. I broke statutes down into checklists, used rules to filter on preconditions and cut false positives, and sent only the context-dependent judgments to the model in batches. I treated the one submission per day as an A/B experiment. Final result: 17th place, 0.7590, about 0.001 short of the top-15 cutoff. I submitted around ten times; most top teams submitted 20–30. For the last submission I chose a result I was satisfied with over leaderboard score, because I was tired of riding every score change.' },
    { type: 'p', text: '**Port (October).** The task was to match vessel records to an official registry. I put a LightGBM ranking model and rule-based post-processing on top of candidate retrieval and reached 0.9360, but the top teams were at 0.98, and 81 versions and some 30 submissions had moved the score by 0.007. I scrapped it. The lessons: check that local metrics transfer to the server first (of 10 versions that improved offline, none improved on the server). When the gap is large, change the approach instead of tuning. Write down on day one how the test data differs from the training data. Decide the stopping rule before starting. These lessons became hooks and gate scripts for the next competition.' },
    { type: 'p', text: '**SCPC round 1 (July).** The opposite also happened. I rose from 120th–170th on the public ranking to 21st on the hidden one because I treated rules fitted to the public data as memorization and dropped them. A hypothesis was adopted only if it passed three gates: can it be explained by a principle, is it independent of other signals, and how much data does it cover. I also wrote down failed experiments, so I would not dig the same hole twice.' },

    { type: 'h', text: 'Tools I built', id: 'tools' },
    { type: 'list', items: [
      '**plan.parkmiyeong.com** — A task board that my agents and I look at together. It opens only on three registered devices, and every click is saved as a commit on the data branch of a GitHub repository. It is a static page with no build step plus a few Vercel functions. I first built it to keep several sessions from tangling up who does what and when; it has since become my personal infrastructure repo, holding exam review cards and contest schedules. Agents co-authored 233 of its 437 commits.',
      '**focuslock** — A lock app in the same repository. A phone app (Flutter and Kotlin), a laptop agent and a Windows install script all read one rule file, lock.json, on the data branch. When a lock starts, it even closes open YouTube tabs. The design and the shared decision contract are described on the plan · focuslock project page.',
      '**runpod-watch** — Built on the day I found out that the volume of a stopped GPU pod had been billing for over two days without anyone noticing. Every hour, even with my laptop off, GitHub Actions checks for unexplained charges, pods without an expiry tag, and low balance, and pushes to my phone. A hook enforces the rule that every pod name ends with its expiry time, and every Monday it sends “watch OK” even if nothing is wrong. If that message doesn’t arrive, the watchdog is broken.',
      '**Contest radar** — Every Monday and Thursday morning, a scheduled session looks for new calls and updates a document. It records the rule that competitions with limited spots are never left until the deadline. That rule exists because I once submitted a carefully written application on the deadline day and it was never evaluated, since the spots had already filled.',
    ] },

    { type: 'h', text: 'What I hold to' },
    { type: 'list', items: [
      'Numbers and statutes that must be right belong to code. The model reads what people say and writes explanations. Sentences the model writes go out only after being checked against computed values.',
      'What I couldn’t verify, I leave blank, and the screen says that it is blank.',
      'I keep “the check passed” and “the check catches problems” apart. Now and then I plant a defect on purpose.',
      'Mistakes are recorded as mechanisms, not sentences.',
    ] },
  ],
}
