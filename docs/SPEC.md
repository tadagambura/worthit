# WorthIt?: Spec

**Is your situationship worth it?** · #2 of 15 · Wave 1: Daily keepers · Used: Several times a week · Very easy · Revenue potential: Medium–high · Social, Play & Style · Source: Owner's idea

## One-liner

A non-conventional dating app that helps you build better relationships instead of just handing you more people. Phase 1 is private: keep notes on the people you're seeing (like a Notes app), rate each situationship with a short qualitative form, and see them ranked by how genuinely worth it they are. Ask the AI coach 'What's Jason worth?' and get a balanced take: his strengths, the concerns, how he complements you, and what to watch for. No public scores of real people, ever: it rates behaviours and how you feel, privately.

## Problem / audience

- **Who it's for:** 18–30s dating in the app era, especially anyone in, or just out of, a situationship.
- **The problem it solves:** People stay in situationships too long because they can't step back and judge them clearly. And when someone wants to commit, there's no way to know how they've treated the people they dated before.
- **Example:** A user keeps notes on two people they're seeing, rates both, and asks the coach 'What's Jason worth?'. It points out he's consistent and supportive but avoids plans, and suggests asking him directly. Later, in phase 2, they and Jason scan each other's QR codes, their profiles link, and when Jason asks 'what's your Worth It score?' they share it.

## MVP features (ship with only these)

1. Private people notes (nicknames only), kept on the device like a Notes app
2. Qualitative form: communication, consistency, effort, respect, how they make you feel, red and green flags, signs of a future
3. A Worth It score for each person, and a ranked list
4. AI coach: 'What's Jason worth?' gives a balanced view and questions to ask (premium)
5. Shareable result card ('My situationship scored 38/100. Not worth it.')

## Not in MVP

- Compatibility quizzes and self result cards (from AfterHours)
- Patterns across your own situationships over time
- Premium coach packs (attachment styles, red flags)

## Monetisation

| Model | Detail |
|---|---|
| Free | Notes and ranking for up to 3 people, with ads |
| Premium | £24.99/year (shown first) or £3.49/month: unlimited people, AI coach, deeper breakdowns, trends over time, premium cards |
| Phase 2 | Profile extras: score insights, verification badge |
| Ads | Never on the result or coach screens |

Prices are starting points; test before committing. **Portfolio premium promise:** free has ads; the moment you pay you get no ads, cloud backup and storage, and sync across your devices, plus this app's extras.

## Retention: The Progression Loop

| Stage | Design |
|---|---|
| Cue | Weekly 'how's it going?' check-in on each person |
| Tiny win | A 20-second check-in, or ask the coach a question |
| Progress | Score trends over time; the ranking shifts |
| Share | Result and ranking cards |
| Next step | When something ends: a 'what did you learn' recap and a fresh start |
| Cadence | Several times a week |

Follow the portfolio guardrails: no guilt-trip notifications, no fake urgency, progress is
never wiped, at most one notification a day by default.

## Animation and tone: five signature animations

**Full drama.** Duolingo-style theatrics: characters, big over-the-top reactions, sound effects. Thirsty's plant death is the only animation that takes over the full screen ('NOOOOOOO!!!! NOT CYPHICUS!!!!').

- Low score: red-flag sirens and the stickman ducks behind the sofa
- High score: wedding bells, and two stickmen do a slow-motion run at each other (and miss)
- Asking the coach: the coach sips its tea, then does a spit-take at a juicy answer
- Adding someone new: a detective stickman inspects a fingerprint with a magnifying glass
- Ending a situationship: the stickman dramatically shuts a door, then a tiny 'NEXT!' sign pops up

**Line we don't cross:** Comedy aims at the situation, never at the real person: no mocking names, looks or anything personal. Low scores are funny, not cruel.

## AI

**Core.** AI coach. Ask 'What's Jason worth?' and it reads your own notes and form answers about that person and gives a balanced view: their strengths, the concerns, how they complement you, and questions worth asking them. Nicknames only are sent, never real names. Premium-gated so the AI cost is covered. (Portfolio rule: plain code first, code does the maths,
cheapest model, shared budget cap, premium-gated.)

## Platform & data

- **Platform:** Expo app; notes on the device; a small shared AI proxy for the coach.
- **Data:** Phase 1: notes stay on the device; only nicknames and answers go to the AI, never real names. Phase 2: data about another person is only linked to their profile after they consent in person, by scanning or tapping.
- **Backend:** AI proxy for the coach (premium). Shared data for phase 2 linking. Premium backup and sync use the shared portfolio backend (see the master repo's HOSTING.md).
- **Stack:** shared portfolio foundation (Expo, PostHog, RevenueCat, AdMob, shared Progression Loop module).

## Growth engine

- **Content pillars:** Situationship red and green flags; 'Is it worth it?' scenarios; Dating in your 20s; Self-respect in dating
- **Shareable output:** Result and ranking cards

## Risks

Rating real people publicly is what got Peeple, Lulu and Tea into trouble and what Apple removes (guidelines 1.2, 5.1.1(viii), 5.1.2), so the QR 'Worth It Score' is cut. Notes stay private on the device; the AI coach gets nicknames only, from a provider that doesn't keep or train on data, and gives balanced views rather than verdicts.

## Launch checklist

- [ ] Name checked on the App Store, Play Store and a trademark search
- [ ] MVP features done and tested
- [ ] Progression Loop wired (cue, tiny win, progress, milestone, next step)
- [ ] Privacy policy and terms
- [ ] Landing page
- [ ] Analytics wired (D1/D7/D30 retention)
- [ ] Payments / ads wired
- [ ] Added to the Growth & Maintenance Engine as an app config
