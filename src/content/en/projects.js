// English version of ../projects.js. Same order, same slugs, same images; only the text changes.
// Every number is a measured value from the repositories, slide decks and technical notes, as in the Korean version.

export const projects = [
  {
    slug: 'moimjigi',
    tint: '#dcece3',
    name: 'Moimjigi',
    period: 'Jul – Aug 2026',
    venue: 'Samsung SCPC 2026 AI Challenge (round 1 → round 2 → finals)',
    result: '4th place, AI track',
    status: { kind: 'award', label: '4th place, AI track' },
    role: 'Solo (as “Graphite”)',
    stack: 'Kotlin, Android 15 / API 35, no model (deterministic), no server',
    oneLiner:
      'An on-device memory agent that takes over the paperwork a recurring group’s secretary or organizer repeats every session, filling more of it in by itself as sessions go on. The number of items the organizer has to enter went from 7 to 2, while the step that asks a person before anything is finalized never shrank.',
    card: {
      image: { src: '/img/scpc-slide-07.webp', alt: 'Slide showing organizer inputs per session: 7, 4, 3, 2', kind: 'wide' },
    },
    craft: [
      '**Each memory records how far it is valid.** For every value it stores which group it belongs to, whether it is a standing value or only for this session, and which instruction it came from. As a result, the values the organizer types by hand dropped from 7 in session 1 to 2 in session 4 (measured on a real device).',
      '**It got easier without giving up human confirmation.** When a correction comes in, the app does not fix things automatically. It names the affected paragraphs and asks, and it never touches what has already been finalized. Input went down, but not a single approval step before finalizing was removed.',
      '**It guards against accidents that only happen on phones.** The send is split across two save points so that the delivery status is never recorded wrongly, whenever the OS kills the app. If the connection drops, it waits and sends exactly once after recovery.',
      '**I tested whether the tests catch things.** I deliberately planted 22 defects and confirmed all 22 were caught, then audited all 26 checks and found 2 that in fact checked nothing.',
    ],
    skills: ['Getting a new platform (Android, Kotlin) to shippable level in 7 days', 'Designing models of state and scope of validity', 'Recovery design that stays consistent through app kills and offline periods', 'Verifying the verification with fault injection and mutated runs'],
    links: [],
    hero: { kind: 'wide', images: [{ src: '/img/scpc-slide-01.webp', alt: 'Title slide of the finals deck. Moimjigi, an on-device memory agent for organizers of recurring groups' }], caption: 'Title slide of the finals deck: “The more sessions you run, the less you have to enter. But approval before finalizing never shrinks.”' },
    receipts: [
      { value: '7→4→3→2', caption: 'Values the organizer entered by hand, sessions 1 to 4' },
      { value: '22 / 22', caption: 'Deliberately planted defects caught by the checks' },
      { value: '7 days', caption: 'From first-ever Android code to an installable app' },
      { value: '0', caption: 'Permissions the app requests. Group data never leaves the device' },
    ],
    body: [
      { type: 'h', text: 'Three rounds' },
      { type: 'p', text: 'Round 1 was about designing an **agent harness** that reads task JSON and produces structured answers. No external LLMs, no hard-coding, Python standard library only. On the public leaderboard I moved between 120th and 170th, but on the hidden evaluation I rose to **21st** and passed the top-40 cut, because I did not adopt rules fitted to the public data. One rule split 26 samples into 23 groups and reached 92% purity; I judged that it was memorization, not a rule, and dropped it. Giving up public rank for that decision is what produced 21st on the hidden set.' },
      { type: 'p', text: 'Round 2 was a completely different kind of task. It started on July 29 and closed on August 5. I had to build an **Android app that actually installs** and submit seven items: APK, source, technical note, install guide, evidence files and a 3-minute video. A one-page Mission statement was due within 48 hours of the start, and after that the core problem and user journey could not change. It was my first time developing for Android. I presented at the finals and won 4th place in the AI track.' },

      { type: 'h', text: 'What I built' },
      { type: 'p', text: 'It started from my experience as the note-taker of a study group, writing every session report myself. Every week I rewrote similar documents from scratch, re-entered information I had already confirmed, traced by hand what a correction affected, and dealt with member replies that arrived late and out of order.' },
      { type: 'p', text: 'Moimjigi is an app for one person, the organizer. Members don’t use the app; their replies arrive as synthetic incoming events. The app fills in the session plan, announcement draft, retrospective questions, session report and milestone report from a **memory ledger**. It doesn’t store documents; it redraws them from the ledger every time they are viewed. Retrospective answers flow back as material for the next session’s plan.' },
      { type: 'figure', kind: 'phones', images: [
        { src: '/img/moimjigi-main.webp', alt: 'Preparation status screen with session, virtual clock, last decision, progress controls, and per-session input counts' },
        { src: '/img/moimjigi-memory.webp', alt: 'Memory management screen. Each memory shows its group, scope, lifetime and authority version, with confirm, update and delete buttons' },
      ], caption: 'Screens from a real device. Left: preparation status and per-session input counts. Right: memory management. Deleting a memory removes the original from the stored bytes and leaves only a tombstone.' },

      { type: 'h', text: 'SVML: storing not the value but how far it is valid' },
      { type: 'p', text: 'Each memory has four axes: which group it belongs to (entityId), which unit of preparation (scope), whether it is standing or only for this session (lifetime), and which instruction it came from (authorityVersion). Separating lifetime from scope is the point. “Only for this session, and not withdrawn” cannot be expressed if the two are merged into one field. Authority versions are assigned in the order they were first seen instead of being parsed from strings like “March notice” or “V1”. Round 1 showed me that anything relying on notation breaks on the first unfamiliar expression.' },
      { type: 'p', text: 'Each paragraph of a document carries which memories it was derived from (derivedFrom). When a correction arrives, nothing is fixed automatically. The app names the affected paragraphs and asks, rewrites only the approved range, and leaves finalized material and collected retrospective answers alone. Fixing things automatically would overturn what was already finalized.' },
      { type: 'figure', kind: 'wide', images: [{ src: '/img/scpc-slide-10.webp', alt: 'Decision ladder: evidence deleted → ABSTAIN, conflicting correction → ASK, late reply → ASK, no connection → WAIT, no reply → WAIT, blank → ASK, no memory → ASK, nothing in the way → ACT' }], caption: 'The 8-rung decision ladder. The rung is decided by the state of the ledger at that moment, not by which button was pressed — so it is not a script. Zero model calls.' },

      { type: 'h', text: 'Four mobile constraints, four answers' },
      { type: 'list', items: [
        'The OS can kill the process at any time → a commit boundary that splits sending an announcement into two saves. If the app dies in between, the next process marks it RECOVERY_REQUIRED, recording it neither as done nor as failed.',
        'Connections drop → WAIT(NETWORK_OFFLINE). It survives restarts and sends exactly once after recovery. A repeated event does not add a second receipt.',
        'Typing is expensive → standing values are filled from memory. 7, 4, 3, 2.',
        'There is no server → zero uses-permission entries. State lives only on the device.',
      ] },

      { type: 'h', text: 'Verifying the verification' },
      { type: 'p', text: 'Saying it passed and saying the checks catch problems are different. I ran it in two environments, kept 17 pieces of evidence and 22 sample export files, and wrote 468 tests. Then I shook three axes: 117 vocabulary mutations that swapped out names, values and tokens wholesale; 104 order mutations that flipped independent operations; and 225 output checks that compared observation dumps against the original schema. Then I tested the checkers themselves by planting defects and watching whether the checks complained. I planted 22, caught 22, and missed 0.' },
      { type: 'quote', text: '“The check didn’t pass; it didn’t run.” The same class of problem turned up in six places. cp stamped a new mtime so every file looked new; a wildcard in a git pathspec matched nothing and silently disabled a whole check; the schema comparison printed PASS after comparing zero files. On the third occurrence I changed approach and audited all 26 checks. Six had no lower bound, and two were in fact checking nothing.', cite: 'Finals deck, slide 13' },
      { type: 'figure', kind: 'wide', images: [{ src: '/img/scpc-slide-11.webp', alt: 'Verifying the verification: runs in two environments, mutations on three axes (117, 104, 225), checker self-test with 22 caught and 0 missed' }], caption: 'Finals deck, slide 11.' },
      { type: 'p', text: 'Comparison runs followed the same principle. I ran the same input with only the memory method changed (ledger vs. flat most-recent-first) and fixed in advance where the two should diverge and where they must not. Pulling in another group’s data, or leaking last session’s one-off values, diverged in 13 of 13 runs; deletion precedence and receipt counts diverged in 0. The last two matter more than the first two: tweaking deletion or exactly-once delivery to make the claim look better would have been a gate violation.' },

      { type: 'h', text: 'What I verified and what I didn’t' },
      { type: 'p', text: 'The technical note separates the two. For finalized items, conflicts are caught by comparing the evidence at finalization with the current evidence; items never finalized have nothing to compare with, so their conflicts are not caught. The organizer’s edits and updates work on screen, but those steps are not in the 61-step automated journey record. One of the 8 rungs of the decision ladder never appears in the run records, and a machine counts that and writes it into a table. “It can do this” and “it is on the record” are different, and I chose to say so.' },

      { type: 'h', text: 'What’s left' },
      { type: 'p', text: 'A signed APK and source, the Mission statement, a 7-page technical note, a 12-page install and usage guide, build and submission info, sample exports, a 3-minute video, and a 16-slide finals deck. Under the competition rules, the repository is private.' },
    ],
  },

  {
    slug: '362',
    tint: '#dfe5f3',
    name: 'Samyuk-i',
    period: 'Aug – Sep 2026 (submitted Sep 7), still running',
    venue: '2026 Financial AI Challenge (organized by the Financial Security Institute, sponsored by the Financial Services Commission)',
    result: 'Entered, still running',
    status: { kind: 'live', label: 'Live' },
    role: 'Solo (team name Graphite)',
    stack: 'React 18, Vite, Tailwind, react-router, Vercel Serverless Functions, Anthropic API',
    oneLiner:
      'A service that lets ordinary consumers actually exercise the right guaranteed by Article 36-2 of Korea’s Credit Information Act: to ask for an explanation of an automated credit decision, submit favorable information, and demand a recalculation. The name means “three-six-two,” after the article number.',
    card: {
      image: { src: '/img/362-home.webp', alt: 'Samyuk-i home screen: “You can ask why an AI made this decision about you”', kind: 'phone' },
    },
    craft: [
      '**What the law fixes lives in code; the model has only two jobs.** Statute text, form wording, procedures and deadlines are constants in code. The model only maps the situation a user describes in everyday words onto the categories the law defines, and sorts a financial company’s reply into the types the law defines.',
      '**When the model is wrong, the code wins.** During development I saw the model label a reply that the Enforcement Decree allows as a “refusal.” Left alone, that would have led users to claim a right they don’t have. So I added a step that checks model output against the structure of the law, and also checks whether each sentence the model quotes really appears in the original; if not, it is discarded.',
      '**I ran every possible decision.** I executed all 504 combinations of case type, counterpart institution and condition, and confirmed zero cases where the verdict contradicted the cited article. I compared the forms against the official text from the Korea Law Information Center down to punctuation, and corrected 5 places where financial companies’ published versions differed from it.',
      '**No personal credit data on the server.** There is no sign-up and no database, and it never asks for a resident registration number. Because nothing calls out to an outside origin, I could apply a content security policy (CSP) that blocks every external source.',
    ],
    skills: ['Domain analysis that turns statutes into code rules', 'Verification design that checks AI output against source text', 'Designing so personal data is never collected in the first place', 'Product finish down to accessibility and print'],
    links: [{ label: 'Open the service: 362.parkmiyeong.com (Korean)', href: 'https://362.parkmiyeong.com' }],
    hero: { kind: 'phones', images: [
      { src: '/img/362-home.webp', alt: 'Samyuk-i home screen. Choosing one of three situations leads to a different screen' },
      { src: '/img/362-diagnose.webp', alt: 'Diagnosis screen. After choosing what happened, it shows the rights you can exercise, the governing articles, and which form to file where' },
    ], caption: 'Home and diagnosis screens. No sign-up; three sample scenarios show the whole flow right away.' },
    receipts: [
      { value: '504', caption: 'Decision combinations run exhaustively. Zero contradicted the cited article' },
      { value: '5', caption: 'Places where companies’ published forms differed from the official legal text, corrected' },
      { value: '0', caption: 'Pieces of personal data stored on the server. There is no database' },
      { value: '80', caption: 'Accessibility checks. Nowhere relies on color alone to carry meaning' },
    ],
    body: [
      { type: 'h', text: 'Why I built it' },
      { type: 'p', text: 'Since a 2020 amendment to the Credit Information Act, individuals in Korea can ask credit bureaus and financial companies to explain the result of an automated evaluation, its main criteria and an outline of the underlying data; they can also submit favorable information, or demand correction or deletion of the underlying data and a recalculation. A Financial Services Commission notice even provides the forms. The right, the procedure and the forms all exist, yet almost no one uses them. People don’t know the right exists, can’t fill in paperwork phrased as “automated evaluation” or “correction of underlying data,” and can’t tell where to file, because that depends on where the data came from — which consumers cannot see.' },
      { type: 'p', text: 'Financial companies can’t build this tool. Producing paperwork that challenges your own credit decisions is a conflict of interest. I judged it to be a gap only a third party could fill, and set out to fill it.' },
      { type: 'figure', kind: 'wide', images: [{ src: '/img/362-diagram-loop.webp', alt: 'One loop: diagnosis, strategy, form, filing, reading the reply, correction and recalculation' }], caption: 'Exercising the right doesn’t end with one document. It is a weeks-long process of getting a reply, reading it and demanding correction of wrong data, so I designed the whole loop.' },

      { type: 'h', text: 'What the AI does and doesn’t do' },
      { type: 'p', text: 'The moment an unverified sentence slips into a statutory form, the form is unusable. So statute text, grounds for refusal, form wording and structure, procedures and deadlines are all constants in code, and the screen shows the four versions of the laws it is based on. The model does only two things: it turns the situation a user describes in everyday words into “information that would help if submitted,” in the categories the law defines; and it sorts a financial company’s reply into the three types and five classes the law defines.' },
      { type: 'p', text: 'The server checks both outputs. It verifies that the sentences quoted as reasons really appear in the user’s original text, and that the quotes backing a reply interpretation appear verbatim in the reply; anything that doesn’t is discarded. During development I watched the model classify a valid reply — “we explained all three items, but the method of combining them is excluded as a proprietary model” — as a **refusal**. That is not a refusal under Article 36-2(3); it is an exclusion the Enforcement Decree allows. Had that error gotten through, users would have asserted a right they don’t have. The code checks the legal structure — if all three items were explained, it cannot be a refusal — and when it contradicts the model, the code wins.' },
      { type: 'figure', kind: 'wide', images: [{ src: '/img/362-diagram-architecture.webp', alt: 'Legal constants and code on one side, the LLM on the other, with server-side checks between them discarding output whose evidence doesn’t match' }], caption: 'A structure that uses AI without trusting it. Model output reaches the screen only after being checked against the structure of the law.' },

      { type: 'h', text: 'What I couldn’t verify, I left blank' },
      { type: 'p', text: 'No processing deadline appears anywhere in the Act, the Decree or the supervisory regulations. So instead of a countdown, the app says plainly that “the law sets no deadline.” Fines likewise apply only to violations of paragraph 1, not paragraph 2, so I didn’t write a blanket “they’ll be fined if they don’t comply.” Real replies are sent to individuals and I couldn’t obtain any; the screen states that the two sample replies were written by this service. Generative AI is built to fill in blanks, and my conclusion from this project is that in a service handling statutory forms, stopping that tendency has to come from structure, not prompts.' },

      { type: 'h', text: 'Personal data' },
      { type: 'list', items: [
        'No sign-up or login, and no database on the server. The API is just two stateless functions.',
        'It never asks for a resident registration number. That box on the printed form is left empty and marked “fill in by hand after printing.”',
        'Name and contact details never go to the server. Drafts stay only in that browser, and the screen says so.',
        'The text of a reply is not stored after it has been interpreted.',
        'With zero external requests, I could set the CSP to default-src \'self\' and add six security headers. It doesn’t use web fonts either: the URL had to stay up through a five-day judging period, and an external font request is a point of failure.',
      ] },

      { type: 'h', text: 'Verification' },
      { type: 'facts', rows: [
        ['Regression tests', '40 (9 unit, 30 browser, 1 full CSP run). Browser tests drive a real headless Chrome over CDP'],
        ['Exhaustive decisions', '504 combinations of case type × institution × condition, 4,057 checks. Zero contradictions between verdict and cited article'],
        ['Print', 'The announced page count matched the actual PDF page count in all 10 combinations (default and large text × 5 scenarios). Measured by laying out the same page off-screen and reading its height'],
        ['Forms vs. official text', 'Three appendix forms compared with the Korea Law Information Center text down to punctuation and word order. Companies’ published versions differed in 5 places; corrected to the official text'],
        ['Accessibility', '80 checks. Nowhere relies on color alone: § for article badges, ? for terms, ↗ for external links, ✓ for selected state'],
        ['Deploy check', 'Every deploy verifies zero traces of the API key in the shipped bundle'],
      ] },

      { type: 'h', text: 'What’s left' },
      { type: 'p', text: 'I submitted a proposal, a functional specification (both PDFs) and the live URL. The repository has a facts document (docs/facts.md), so every sentence in the proposal is backed by a code path, a statute or a measurement command. I didn’t write any sentence without one.' },
    ],
  },

  {
    slug: 'plan',
    tint: '#e7e1fb',
    name: 'plan · focuslock',
    period: 'Oct 1, 2026 – in daily use',
    venue: 'Personal project. Task board plan.parkmiyeong.com and focuslock, a lock system across three devices',
    result: 'In daily use (opens only on 3 registered devices; private repo)',
    status: { kind: 'live', label: 'Used daily' },
    role: 'Solo (I do the design and decisions; much of the code was written with Claude Code and Codex)',
    stack: 'JavaScript (Vercel functions, no-build frontend), Kotlin + Flutter (Android), Python (Linux agent, systemd), PowerShell (Windows agent), GitHub Contents API',
    oneLiner:
      'A task board that my coding agents and I share, and a lock system across three devices tied to it. During study blocks, only allowed apps and sites open on my phone, laptop and desktop, and finishing that block’s tasks unlocks them.',
    card: {
      image: { src: '/img/plan-board-main.webp', alt: 'plan board. At the top, when Cowork and CC last checked in; tabs for me, Cowork and CC; today’s classes and tasks. An algorithms assignment shows CC’s note and my answer; a contest item shows a question from Cowork awaiting my answer', kind: 'wide' },
    },
    craft: [
      '**One decision, four languages, one contract.** The rule for whether to lock now and what to allow is implemented separately on the server (JS), phone (Kotlin), laptop (Python) and desktop (PowerShell). All four must read and pass the same case file (cases.json, 84 cases), so devices never disagree. The contract even pins down that PowerShell’s default sort is case-insensitive, which would otherwise change result order.',
      '**It doesn’t trust the device clock.** Devices lock on their own, but they unlock only after confirming server time. Turning the clock back doesn’t unlock anything, and every lock has an automatic release time so I can’t get stuck if the server goes down. There is no emergency override — only one-time codes that open a specific app for a set time. On the phone, even the Settings app is blocked during a lock, since most workarounds go through Settings.',
      '**Finishing the work unlocks it.** When the server record shows all tasks attached to a block are done, the board shows an unlock code. The lock reason lists what to study in that block, so the lock screen doubles as the to-do list.',
      '**git instead of a database.** Every click on the board becomes a commit on the data branch, so Cowork, Claude Code and I see the same state, with history. At first every data commit triggered a deploy and ate through the daily deploy limit, so I moved data to a branch that doesn’t deploy.',
    ],
    skills: ['Contract tests that make one rule behave identically across platforms', 'Native Android using accessibility services and device admin', 'Security design that starts from the bypasses (server-time unlock, one-time codes)', 'A lightweight git-as-storage backend and state shared by people and agents'],
    links: [],
    hero: { kind: 'wide', maxW: 680, images: [{ src: '/img/plan-board-main.webp', alt: 'plan board: Cowork and CC check-in times, tabs per owner, today’s classes, a task where I answered CC’s note, and a question Cowork raised for me' }], caption: 'Three of us work on one screen. When CC hits a condition while building test inputs, it leaves a note and I answer; Cowork raises choices I need to make as “needs answer.” At the top you can see when each session last checked in. (Dummy data for this portfolio, same code.)' },
    receipts: [
      { value: '4 languages', caption: 'Separate implementations of the same decision: JS, Kotlin, Python, PowerShell' },
      { value: 84, caption: 'Shared decision cases all four implementations must pass' },
      { value: '3 devices', caption: 'Locked together: phone, laptop, desktop' },
      { value: 576, caption: 'Commits on main from Oct 1 to Nov 3' },
    ],
    body: [
      { type: 'h', text: 'Why I built it' },
      { type: 'p', text: 'In October I was running several competitions alongside classes. With Claude Code on my laptop, a Cowork session in the cloud and me each holding our own tasks, who was doing what kept getting tangled. So first I built a board all three of us look at. Then, to actually keep the study and sleep hours written on that board, I added a lock that allows only approved things on three devices during those hours.' },

      { type: 'h', text: 'The board' },
      { type: 'list', items: [
        '**Every task has an owner:** me, Cowork or CC. Questions an agent needs me to answer come up as “needs answer,” and the top of the board shows when each session last checked in.',
        '**It opens only on three registered devices.** Devices register with a code, and cookies are signed with HttpOnly, Secure and SameSite=Strict. Cookies not on the device list are rejected.',
        '**It is just a static page with no build step and a few Vercel functions.** On my phone it sits on the home screen like an app (PWA).',
        '**It shows how much of each exam’s scope I’ve covered.** For each course it draws a bar of the share of review cards in exam scope I’ve actually done, and divides by the days left to tell me how many more minutes a day I need.',
      ] },
      { type: 'figure', kind: 'wide', images: [{ src: '/img/plan-balance.webp', alt: 'Course balance card: Systems Software 100%, Algorithms 87%, Probability & Statistics 80%, Intro to Computer Systems 75%, Open Source SW 65%, Programming Language Theory 52%, AI Programming 22%, each marked done' }], caption: 'Actual screen, Nov 3. Courses whose exam has passed are marked “done”; before the exam they show a D-day count. The ratios are computed from review card records.' },

      { type: 'h', text: 'The lock' },
      { type: 'p', text: 'I fixed the design principles in a document before starting. It is allowlist-based: during a lock, only the apps and sites on that mode’s list open. Every lock has both a start time and an automatic release time, and a lock without automatic release can’t be created. Devices fetch the schedule in advance and lock by their own clock, but unlocking always requires server time. Devices don’t poll the server constantly; they check only at startup, on network change, every six hours, and when a code is entered.' },
      { type: 'figure', kind: 'phones', images: [
        { src: '/img/plan-focuslock-home.webp', alt: 'focuslock home screen: study-mode lock active, automatic release time and time remaining, next lock, and a field for an allow code' },
        { src: '/img/plan-focuslock-block.webp', alt: 'Block screen shown when opening m.youtube.com in study mode, with the lock reason, automatic release time and an allow-code field' },
      ], caption: 'The focuslock phone app (emulator, real lock data from Nov 3). The lock reason shows that block’s study items as-is. On the right is what appears when opening a blocked site in Chrome: it blocks sites in the address bar, not just apps.' },
      { type: 'figure', kind: 'wide', images: [{ src: '/img/plan-board-lock.webp', alt: 'Lock card at the top of the plan board: study lock in progress, all tasks for this block done, unlock code shown' }], caption: 'The lock card at the top of the board. Finishing the block’s tasks reveals the unlock code (dummy data).' },

      { type: 'h', text: 'The shared decision contract' },
      { type: 'p', text: 'Four platforms had to reach the same decision, but they couldn’t share decision code: the phone had to be Kotlin, the laptop Python, the desktop PowerShell. So instead of sharing code, they **share a contract**. Time is fixed to KST, and intervals are half-open so that at the exact release time the lock has already ended. Overlapping locks follow the earlier rule, but if the earlier rule has been released by a code, they fall through to the next. Result lists are sorted by code point. These rules are written down as 84 cases, and all four implementations read that file as-is and must pass it.' },

      { type: 'h', text: 'Study game' },
      { type: 'p', text: 'The same board also hosts a study game (Beat Dungeon). Every question made from lecture slides carries its source page, and missed questions come back at spaced intervals. Finishing a run automatically completes the matching task on that day’s board, which feeds into the unlock check.' },

      { type: 'h', text: 'Stated limits' },
      { type: 'list', items: [
        'It’s a tool built for one person, so there are no records from other users.',
        'The repository holds my schedule and study records, so it’s private.',
        'Phone screens were captured on an emulator with real lock data; I cropped out the install-check warning banner the emulator shows. Board screens were captured by running the same code locally with dummy data.',
      ] },
    ],
  },

  {
    slug: 'pricesignal',
    tint: '#f1e7da',
    name: 'PriceSignal',
    period: 'Oct 22 – 28, 2026',
    venue: 'Open Agent Hackathon 2026 (GenAI.Works) · Track 01 Solving Fragmented Intelligence',
    result: 'Submitted; results announced Nov 7',
    status: { kind: 'done', label: 'Submitted' },
    role: 'Solo (planning, design, build, video)',
    stack: 'TypeScript, Node, Zetaris (Lightning SQL), Meterless Nightshift + H-MEM, NVIDIA Nemotron',
    oneLiner:
      'An agent that answers whether an exporter’s proposed price increase fits each market’s official inflation — and its own costs — using fragmented data from three national statistics agencies. Every number comes with the SQL that produced it.',
    card: {
      image: { src: '/img/psig-ui.webp', alt: 'PriceSignal screen: the question and live trace on the left, per-market verdicts on the right', kind: 'wide' },
    },
    craft: [
      '**It pulls together official statistics in incompatible formats.** Eurostat and the Canadian and Australian statistics agencies differ in data format, classification and release schedule. For each question it registers only the needed series as SQL tables and normalizes them to a common shape, comparing 17 markets — 14 EU countries, Canada, Australia and the US — in a single federated query.',
      '**The model can’t touch the numbers.** Growth rates, benchmarks and cost-recovery targets are computed by code, and every sentence of the model’s explanation is checked against the computed values and deleted if it disagrees. There is a record of the very first headline being caught by this check and rewritten.',
      '**I measured where it was slow and fixed it.** Finding one model setting (enable_thinking) cut question parsing from 56–63 s to 3.4–5.0 s, and adding a cache cut comparison queries from 5.7–8.8 s to 1.4–1.8 s.',
      '**Anyone can recompute the results.** Each run saves its queries and result rows, so the report’s numbers can be recomputed from scratch without an API key. Along the way I found that the Eurostat dataset everyone was using had stopped updating in December 2025.',
    ],
    skills: ['Unifying public data in different formats into one query structure', 'Agent design with planning, tool calls and memory', 'Finding and cutting bottlenecks by measurement', 'Keeping run records so results can be reproduced'],
    links: [
      { label: 'GitHub repository', href: 'https://github.com/rose050505/pricesignal' },
      { label: 'Replay recorded runs', href: 'https://rose050505.github.io/pricesignal/' },
      { label: '3-minute demo video', href: 'https://youtu.be/XjbFIqRgQWk' },
    ],
    hero: { kind: 'wide', images: [{ src: '/img/psig-ui.webp', alt: 'PriceSignal run screen. For the question “our gochujang & snacks…”, it shows food inflation in Germany, Canada and Australia and a verdict on the +5% proposal' }], caption: 'Run from Oct 27, 2026. Left: the question and a trace of what the agent is doing right now. Right: per-market verdicts and the SQL behind them.' },
    receipts: [
      { value: 17, caption: 'Markets compared in one federated query: 14 EU countries, Canada, Australia, US' },
      { value: '9–34 s', caption: 'From question to report, across 8 recorded runs' },
      { value: '63 s→5 s', caption: 'Worst-case question parsing time, cut by finding one model setting' },
      { value: '8.8 s→1.8 s', caption: 'Worst-case market comparison query, after adding a cache' },
    ],
    body: [
      { type: 'h', text: 'The problem' },
      { type: 'p', text: 'A small exporter selling snacks and gochujang to Germany, Canada and Australia asks whether it can raise prices 5% next quarter. The evidence for the answer is each country’s official price statistics, scattered across Eurostat, Statistics Canada and the Australian Bureau of Statistics, each in its own format: JSON-stat 2.0, WDS JSON and SDMX-JSON 2.0, with three classification systems and three release schedules. Reconciling them by hand means repeating the same work at every price review, so in practice companies often just raise prices by a round number.' },
      { type: 'p', text: 'While building it I found something else. The Eurostat dataset everyone links to (prc_hicp_manr) had stopped in December 2025. The agent checks freshness, switches to the successor dataset (prc_hicp_minr), and says so in the report.' },

      { type: 'h', text: 'What I built' },
      { type: 'list', items: [
        '**It takes the question as people actually write it** — typos (canda), aliases (deutschland, aus), Korean, “+5%”, and conditions like “costs rose 8% and are 60% of the selling price” or “we pass through 70%.” Code extracts the percentages; the model only reads.',
        '**It finds the official series at each agency,** registers them as REST tables in Zetaris, normalizes them to a common schema with decoding views, and caches them. There is no prebuilt warehouse; tables are registered when a question needs them.',
        '**One federated SQL query compares three markets,** and a second query joins the company price list to build per-SKU price scenarios. Every number in the report carries a query number, and the full SQL is printed at the end.',
        '**Code computes the numbers:** latest year-over-year growth, one-year average, the benchmark between them, how far the proposal is from the benchmark, the change that fits every market, and the cost-recovery target. There is no number the model can change.',
        '**The model writes the explanation, and every sentence is checked.** If a number, verdict or trend claim differs from the computed values, the sentence is deleted and marked as deleted. There is a record of the first headline claiming “food inflation is easing in all three markets,” being rejected because Australia was flat, and being rewritten.',
        '**It remembers.** Verified series mappings, pricing policy and past results live in H-MEM, so “same as last time but +3%?” works, and it starts by saying what changed since the last report. When every mapping is already in memory, it skips the planning model call entirely.',
      ] },
      { type: 'figure', kind: 'wide', images: [{ src: '/img/psig-slide-07.webp', alt: 'Slide: how an agency API becomes a cached, queryable SQL table in Zetaris, with the actual DDL' }], caption: 'How an agency API becomes an SQL table inside Zetaris: CREATE LIGHTNING REST TABLE, a decoding view, then CACHE TABLE.' },

      { type: 'h', text: 'What I measured' },
      { type: 'p', text: 'What I did most during the hackathon week was measure. A few of the results:' },
      { type: 'facts', rows: [
        ['Cache effect', 'Federated comparison query: 5.7–8.8 s before caching, 1.4–1.8 s after. Price-list join: from 2.8–3.4 s to 0.9–1.2 s'],
        ['The setting that mattered most', 'Nemotron’s chat-template switch enable_thinking: false. Question parsing went from 56–63 s to 3.4–5.0 s. A /no_think prompt alone did not stop the hidden reasoning'],
        ['Handling slow responses', 'If there’s no answer within 10 s, the same request is sent again and whichever arrives first is used; each stage has a time budget and a code fallback. A slow provider can’t stall the report'],
        ['8 recorded runs', 'Back-to-back runs before dawn on Oct 28, each starting from a fresh memory store and a fresh Zetaris namespace. All 26 model calls went to Nemotron 3.5 Lightning'],
        ['Offline recomputation', 'Each run leaves evidence.json (queries, rows, computed results), and npm run verify recomputes everything without keys. 3,250 checks across the 8 runs, with 508 market rows and 585 price rows preserved'],
        ['One odd bug', 'When a percentage followed “go,” as in “can we go +3%,” the provider returned an empty response (16 times, 502). Only in the text sent to the model, “go” is replaced with “move”; the user’s original text stays as written'],
      ] },
      { type: 'figure', kind: 'wide', images: [{ src: '/img/psig-same-period.webp', alt: 'Same-month comparison table: Germany and Australia side by side for August 2026, while Germany’s latest September value stays on its market card' }], caption: 'A table that aligns markets with different release dates to the same month. Latest values and same-month values are shown separately.' },

      { type: 'h', text: 'Stated limits' },
      { type: 'list', items: [
        'For Canada and the US, only the food and all-items indexes are connected. Snacks and sauces are compared at the food level, and the report says so.',
        'The benchmark is a descriptive comparison over the past year, not a forecast or an estimate of consumers’ willingness to pay. Exchange rates aren’t included.',
        'The sentence check covers numbers, verdicts and trend claims only. An unsupported adjective can get through.',
        'The price list is a sample from a fictional exporter.',
      ] },

      { type: 'h', text: 'How it was made' },
      { type: 'p', text: 'I built it alone from Oct 22 to the Oct 28 deadline, alternating between Claude Code and Codex for code. The memory engine (Meterless H-MEM reference implementation) and Zetaris are used as-is; the agent, checks, recomputation and UI on top are what I wrote. After submitting, I made a new 3 min 40 s video of the same project for the Zetaris Demo Challenge and submitted it on Nov 2.' },
      { type: 'links', items: [
        { label: 'Full description and measurements in the README', href: 'https://github.com/rose050505/pricesignal#readme' },
        { label: 'Replay the 8 recorded runs in the real UI', href: 'https://rose050505.github.io/pricesignal/' },
      ] },
    ],
  },

  {
    slug: 'radar',
    tint: '#e2def3',
    name: 'My Bill Radar',
    period: 'Oct 2026 – (in progress until the December presentation)',
    venue: 'Final team project, AI Programming course',
    result: 'Updated daily at radar.parkmiyeong.com',
    status: { kind: 'wip', label: 'In progress' },
    role: 'Team of 3. I own the whole web app, deployment and the initial data collection',
    stack: 'React, Vite, canvas map, Vercel serverless functions, National Assembly Open API, Python pipeline, GitHub Actions',
    oneLiner:
      'An installable web app that starts from a map plotting the 20,000-plus bills introduced in Korea’s 22nd National Assembly as stars, and shows the bills open for public comment that affect you — in plain language, with their chances of passing and comment deadlines.',
    card: {
      image: { src: '/img/radar-desktop.webp', alt: 'National Assembly celestial field map: clusters of stars colored by policy area on a dark background, with labels for 11 areas', kind: 'wide' },
    },
    craft: [
      '**20,000 bills you can browse on one screen.** I built a canvas map that draws all 20,374 bills of the 22nd National Assembly as star clusters by policy area, with zoom, search, area filters, and a bill card that opens when you tap a star.',
      '**It picks out only what applies to you and your family.** A short survey of birth year, status, housing, region and family is turned into conditions, and each bill is judged as applying to you, to your family, or neither. Comment deadlines can be downloaded as a calendar file with a reminder three days before.',
      '**The service runs before the models arrive.** Teammates’ model output comes in an agreed JSON format, and live legislative notices are refreshed daily by a serverless function. Until the models are ready, a small language model reads the team’s tag definitions and adds provisional annotations.',
      '**Rules for cost and for gaps.** Language model spending is capped at $4 a month, and bills affecting very broad groups, such as “all National Pension subscribers,” are shown separately to every user at the weakest relevance level.',
    ],
    skills: ['Collaborating by agreeing on data formats with teammates first', 'Visualizing large datasets on a single screen', 'Running automatic public API refreshes and serverless deployment', 'Using language models under a cost cap'],
    links: [{ label: 'Open the site: radar.parkmiyeong.com (Korean)', href: 'https://radar.parkmiyeong.com' }],
    hero: { kind: 'wide', images: [{ src: '/img/radar-desktop.webp', alt: 'Celestial field map screen. On the left, 20,374 bills in total, 238 open for comment, and browsing by area. The star map in the center' }], caption: 'Observed Nov 2, 2026. Each star is one bill. Tapping one opens a plain-language summary and a link to submit a comment.' },
    receipts: [
      { value: 20374, caption: 'Bills of the 22nd National Assembly on one map' },
      { value: 238, caption: 'Bills open for public comment as of Nov 2' },
      { value: '6', caption: 'National Assembly Open APIs combined' },
      { value: '$4 / mo', caption: 'Language model spending cap' },
    ],
    body: [
      { type: 'h', text: 'Why' },
      { type: 'p', text: 'In Korea, a bill is published for public comment for at least ten days after it is filed, and anyone can submit an opinion during that time. But there are so many bills, written in such difficult language, that most citizens don’t even know whether one affects them. When we started planning on Oct 7, there were 145 bills open for comment. The course required the National Assembly Open API, preprocessing, an AI algorithm, visualization, a final report and a presentation, and we decided to build a service people could actually use within those requirements.' },

      { type: 'h', text: 'What’s in it' },
      { type: 'list', items: [
        '**Celestial field map.** A canvas map that draws every bill of the 22nd National Assembly as star clusters by policy area. It supports zoom, search and area filters, and tapping a star opens the bill card.',
        '**My constellation.** A survey of birth year, status, housing, region and family is turned into conditions and tags, and related bills open for comment are ranked. A condition like “monthly savings until age 18 for those born in 2012 or later” is judged as applying to you, to your family, or neither.',
        '**Bill card.** A plain-language summary, tags for who is affected and whether that includes you, the chance of passing and why, similar past bills, and a link to submit a comment with a D-day count.',
        '**Deadline reminders.** A calendar file (.ics, with a reminder three days before the deadline) and a D-day card image. Web push needs a server, so we left it out of scope.',
        '**Installable (PWA).** It sits on the home screen without an app install. Saved bills are stored in the browser.',
      ] },
      { type: 'figure', kind: 'phone', images: [{ src: '/img/radar-mobile.webp', alt: 'The star map on a phone just before it unfolds' }], caption: 'The first screen on a phone. The stars gather, then spread out by policy area.' },

      { type: 'h', text: 'Data and models' },
      { type: 'p', text: 'It uses six National Assembly Open APIs: active and closed legislative notices, bills’ reasons and main contents, bills introduced by members (19,837 in the 22nd Assembly, 23,655 in the 21st), sponsor information, and member profiles. Bills from the 21st Assembly, whose outcomes are mostly settled, are for training; 22nd Assembly bills and active notices are for the service.' },
      { type: 'p', text: 'As a team we decided that the graded AI would be models we trained ourselves plus unsupervised learning, and that language models would only assist with preprocessing. For topic clusters, Korean sentence embeddings are reduced with UMAP and grouped with HDBSCAN to build the galaxy map. For classifying who is affected, we hand-built a “law → affected group” table for about 100 frequently amended laws, labeled bills by distant supervision, then trained on the reasons text alone with law names masked so it generalizes to laws it hasn’t seen. Chance of passing comes from gradient boosting trained on 21st Assembly bills, with SHAP showing the reasons.' },
      { type: 'p', text: 'How we defined the label changed the results a lot. Only 5.9% of 21st Assembly bills were passed as filed, so a pass/fail split was badly imbalanced. But many bills are formally discarded after their content is absorbed into a committee alternative that does change the law (24%), and we counted those as passing, because the question that matters to a radar user is “will this content become law?” That made the pass rate 29.9%.' },

      { type: 'h', text: 'My part' },
      { type: 'p', text: 'I own the whole web app, deployment and the initial data collection scripts. The models are run in Python ahead of time and exported as JSON, and the web app reads that JSON plus the live legislative-notice API. Live calls go through a Vercel serverless function, and the notice list refreshes automatically every day. Language model spending is capped at $4 a month, and among bills with no tags, those affecting very broad groups such as “all National Pension subscribers” are flagged so every user sees them at the weakest level. The definitions of the 17 tags my teammate wrote are the models’ reference, and until the student-trained models arrive, a small model reads those definitions and adds provisional annotations.' },
      { type: 'p', text: 'The presentation is in December. Until then, I’ll connect the model results to the web app and write the report.' },
    ],
  },
]

export const bySlug = Object.fromEntries(projects.map((p) => [p.slug, p]))
