# WorthIt

**Is your situationship worth it?**

> #2 of 32 · Wave 1: Daily keepers · Used: Several times a week · Very easy · Revenue potential: Medium–high · Social, Play & Style
> **Owner's idea · phase 1 very easy, phase 2 harder**

## What it is

A non-conventional dating app that helps you build better relationships instead of just handing you more people. Phase 1 is private: keep notes on the people you're seeing (like a Notes app), rate each situationship with a short qualitative form, and see them ranked by how genuinely worth it they are. Ask the AI coach 'What's Jason worth?' and get a balanced take: his strengths, the concerns, how he complements you, and what to watch for. Phase 2 links real people with consent: two people scan each other's QR code (or tap phones where supported), their profiles link, and the ratings each has written about the other attach to the linked profile. That builds a Worth It Score you can share when someone asks 'what's your Worth It score?'

## Why it's in the portfolio

'Situationship' is one of the most talked-about relationship topics on TikTok, and a ranking with a shareable result card is made for that audience. Phase 1 is easy to build and costs almost nothing to run (private notes on the device, AI only for premium users). The AI coach is the strongest use of AI in the portfolio, because a thoughtful second opinion is exactly what people want here. Phase 2 adds network effects: every link brings in a new person.

## Who it's for

18–30s dating in the app era, especially anyone in, or just out of, a situationship.

**The problem:** People stay in situationships too long because they can't step back and judge them clearly. And when someone wants to commit, there's no way to know how they've treated the people they dated before.

## Version one

- Private people notes (nicknames only), kept on the device like a Notes app
- Qualitative form: communication, consistency, effort, respect, how they make you feel, red and green flags, signs of a future
- A Worth It score for each person, and a ranked list
- AI coach: 'What's Jason worth?' gives a balanced view and questions to ask (premium)
- Shareable result card ('My situationship scored 38/100. Not worth it.')

**Example:** A user keeps notes on two people they're seeing, rates both, and asks the coach 'What's Jason worth?'. It points out he's consistent and supportive but avoids plans, and suggests asking him directly. Later, in phase 2, they and Jason scan each other's QR codes, their profiles link, and when Jason asks 'what's your Worth It score?' they share it.

## Later

- Phase 2: profiles, linked by scanning each other's QR code (NFC tap where the phone allows it)
- On linking, both people consent, and the ratings each wrote about the other attach to the linked profile
- Worth It Score shown only after a minimum number of linked ratings, with outliers dampened
- Private notes stay private unless the author chooses to share them; the linked person can see what's attached and respond
- Share your score like a credit score: private by default, you choose who sees it

## How it makes money

| Model | Detail |
|---|---|
| Free | Notes and ranking for up to 3 people, with ads |
| Premium | £3.99/month: unlimited people, AI coach, deeper breakdowns, trends over time, premium cards |
| Phase 2 | Profile extras: score insights, verification badge |
| Ads | Never on the result or coach screens |

**Portfolio premium promise:** free has ads; the moment you pay you get no ads, cloud backup and storage, and sync across your devices, plus this app's extras.

## Why people come back

Built on **The Progression Loop**, the portfolio's shared retention framework
(streaks with forgiveness, visible progress, milestones, recaps, no guilt-trips).

| Stage | In WorthIt |
|---|---|
| Cue | Weekly 'how's it going?' check-in on each person |
| Tiny win | A 20-second check-in, or ask the coach a question |
| Progress | Score trends over time; the ranking shifts |
| Share | Result and ranking cards |
| Next step | When something ends: a 'what did you learn' recap and a fresh start |
| Cadence | Several times a week |

## Animation and tone: five signature animations

**Full drama.** Duolingo-style theatrics: characters, big over-the-top reactions, sound effects. Thirsty's plant death is the only animation that takes over the full screen ('NOOOOOOO!!!! NOT CYPHICUS!!!!').

- Low score: red-flag sirens and the stickman ducks behind the sofa
- High score: wedding bells, and two stickmen do a slow-motion run at each other (and miss)
- Asking the coach: the coach sips its tea, then does a spit-take at a juicy answer
- Adding someone new: a detective stickman inspects a fingerprint with a magnifying glass
- Ending a situationship: the stickman dramatically shuts a door, then a tiny 'NEXT!' sign pops up

**Line we don't cross:** Comedy aims at the situation, never at the real person: no mocking names, looks or anything personal. Low scores are funny, not cruel.

## AI

**Core.** AI coach. Ask 'What's Jason worth?' and it reads your own notes and form answers about that person and gives a balanced view: their strengths, the concerns, how they complement you, and questions worth asking them. Nicknames only are sent, never real names. Premium-gated so the AI cost is covered.

## Watch-outs

Phase 1 is low-risk: it's private note-taking. The AI coach must send nicknames only, use a provider that doesn't keep or train on the data, and give balanced views rather than verdicts on real people. Phase 2 is much safer with in-person QR consent, but still needs: a way for the linked person to see and respond to what's attached, a minimum number of ratings before any score shows, protection against an ex rating in bad faith after linking, moderation of anything shared publicly, and a UK GDPR and app-store review before launch. Phone-to-phone NFC between iPhones is limited for third-party apps, so QR codes come first.

## Status

Planning. The build spec is in [`docs/SPEC.md`](docs/SPEC.md).

---

Part of a portfolio of 32 small consumer apps that share one codebase, one retention module
and one marketing and upkeep system ([growth-maintenance-engine](https://github.com/tadagambura/growth-maintenance-engine)).
