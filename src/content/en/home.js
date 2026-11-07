// English version of ../home.js. Same shape; links use the Korean-side paths (the L component adds /en).

export const results = [
  { value: 'Top Excellence Award', caption: 'Semiconductor inline-process hackathon at the 2026 Gangwon LRS · Chungbuk PRIDE Shared University Deep-Dive Camp, team pluto', to: '/#log' },
  { value: '4th Place, AI Track', caption: 'Samsung SCPC 2026 finals. Reached them from 21st on the hidden test set in round 1, then built the app Moimjigi in 7 days on Android, which I had never used', to: '/p/moimjigi' },
  { value: 'Still running', caption: 'Samyuk-i. Built for the Financial AI Challenge and still live at 362.parkmiyeong.com', to: '/p/362' },
]

export const strengths = [
  {
    title: 'I use AI, but in a structure that doesn’t trust it',
    text: 'Statutes and numbers are decided by code. The model only translates what people say or writes explanations, and its answers reach the screen only after being checked against the source text and the computed values.',
    proof: [
      { project: 'Samyuk-i', text: 'After seeing the model label a legally valid reply as a “refusal,” I added a step that checks model output against the structure of the law.', to: '/p/362' },
      { project: 'PriceSignal', text: 'Sentences that disagree with the computed values are deleted, and the deletion is shown. The very first headline got caught by this check.', to: '/p/pricesignal' },
    ],
  },
  {
    title: 'I check that the checks actually catch things',
    text: 'Passing a test and having a test that catches problems are different things. So I plant defects in the checkers themselves and run every case that can be decided.',
    proof: [
      { project: 'Moimjigi', text: 'Caught all 22 deliberately planted defects, and found 2 checks that had been checking nothing.', to: '/p/moimjigi' },
      { project: 'Samyuk-i', text: 'Ran all 504 decision combinations and confirmed zero cases where the verdict contradicted the cited article.', to: '/p/362' },
      { project: 'focuslock', text: 'Implemented the same lock decision in four languages and bound all four to pass the same 84 shared cases.', to: '/p/plan' },
    ],
  },
  {
    title: 'I ship on time, even on unfamiliar platforms and data',
    text: 'I don’t stick to tools I already know. Even in an environment I’m touching for the first time, I get to something that actually installs and loads before the deadline.',
    proof: [
      { project: 'Moimjigi', text: 'Shipped an installable app in 7 days on my first Android project, and it won 4th place in the finals.', to: '/p/moimjigi' },
      { project: 'PriceSignal', text: 'In one week, built an agent that pulls together official statistics in incompatible formats and compares 17 markets in a single query.', to: '/p/pricesignal' },
    ],
  },
  {
    title: 'I choose generalization over the leaderboard',
    text: 'A rule tuned to the public score is memorization, so I drop it. I first check whether a local gain carries over to the real evaluation, and stop if it doesn’t.',
    proof: [
      { project: 'SCPC round 1', text: 'Dropped rules fitted to the public data and moved from 120th–170th on the public board to 21st on the hidden one.', to: '/p/moimjigi' },
      { project: 'DACON port', text: 'Found that none of 10 versions that improved locally improved on the server, scrapped the approach, and turned the lesson into a guard script.', to: '/how#leaderboard' },
    ],
  },
]

export const log = [
  { when: 'Jul 23', text: 'Top Excellence Award, semiconductor inline-process hackathon, 2026 Gangwon LRS · Chungbuk PRIDE Shared University Deep-Dive Camp (team pluto).', stamp: 'award' },
  { when: 'Jul', text: 'Samsung SCPC 2026 round 1. Designed an agent harness, placed 21st on the hidden test set and advanced to round 2.', to: '/p/moimjigi' },
  { when: 'Jul', text: 'Gieokham. Built a working demo MVP in three days for a veterans’ public data and AI contest.', to: '/p/gieokham' },
  { when: 'Jul 29 – Aug 5', text: 'SCPC round 2. Submitted “Moimjigi,” an installable Android app built in 7 days on my first Android project.', to: '/p/moimjigi' },
  { when: 'Aug', text: 'Presented at the finals. 4th place, AI track.', to: '/p/moimjigi', stamp: 'award' },
  { when: 'Aug – Sep', text: 'Samyuk-i. Entered in the Financial AI Challenge and still running.', to: '/p/362' },
  { when: 'Sep', text: 'DACON public-procurement bid compliance monitoring. 17th place, 0.001 short of the top-15 cutoff. Dropped two other competitions I started that month.', to: '/how#leaderboard' },
  { when: 'Sep –', text: 'KISTI DATA·AI Analysis Competition, quality judgment of Korean web alt text. Pinned down 40 rules at precision 1.000 and sent only the rest to a model. Deadline Nov 6.' },
  { when: 'Oct 1 –', text: 'plan and focuslock. A task board I share with my agents, plus a lock across three devices. Still in daily use.', to: '/p/plan' },
  { when: 'Oct –', text: 'My Bill Radar. Course team project; I own the web app and deployment.', to: '/p/radar' },
  { when: 'Oct 12', text: 'Submitted a proposal to the Work24 AI Employment Service Hackathon: a tool that predicts whether a job-seeking activity will count toward unemployment benefits.' },
  { when: 'Oct 14', text: 'Audited how I’d been working with agents using counts from my own logs, and changed how I run things.', to: '/how' },
  { when: 'Oct', text: 'DACON port vessel matching. Got to 0.936, then scrapped it. Kept the lesson as tooling.', to: '/how#leaderboard' },
  { when: 'Oct 22 – 28', text: 'PriceSignal. Submitted to Open Agent Hackathon 2026.', to: '/p/pricesignal' },
  { when: 'Oct 30', text: 'Submitted a proposal and HTML prototype to a shipping, port and logistics AX idea contest: an AI that checks bills of lading before issue so forwarders don’t have to correct them later.' },
  { when: 'Nov 2', text: 'Submitted a PriceSignal video to the Zetaris Demo Challenge.', to: '/p/pricesignal' },
  { when: 'Nov', text: 'Cheongdo vibe-coding hackathon (5th–6th), KIC AI Agent Contest (12th), Hyundai Motor Group in-vehicle app contest and AI Woowang-thon (15th).', stamp: 'planned' },
]
