# WorthIt

**Is your situationship worth it?**

> #2 of 33 in the build order · Very easy · Revenue potential: Medium–high · Social, Play & Style
> **Owner's idea · phase 1 very easy, phase 2 harder**

## What it is

Phase 1: rank your situationships. Answer a short qualitative form about each one (communication, consistency, effort, respect, how they make you feel, red and green flags, signs of a future) and WorthIt scores and ranks them, so you can see which one is genuinely worth it. Phase 2: the Worth It Score, a consent-based digital dating identity. People who opt in get a profile, add friends, and connect with people they've actually dated; their score is built from feedback those confirmed connections submit. So when someone says 'I want to commit to you, but what's your Worth It score?', you can share it.

## Why it's in the portfolio

'Situationship' is one of the most talked-about relationship topics on TikTok, and a ranking with a shareable result card is made for that audience. Phase 1 is very easy to build (private, on the device, no accounts), spreads itself through share cards, and builds the audience for phase 2. Phase 2 turns it into a social identity with network effects: every user brings in the people they date and the friends they compare with.

## Who it's for

18–30s dating in the app era, especially anyone in, or just out of, a situationship.

**The problem:** People stay in situationships too long because they can't step back and judge them clearly. And when someone wants to commit, there's no way to know how they've treated the people they dated before.

## Version one

- Add situationships by nickname only (no real names or photos in phase 1)
- Qualitative form: communication, consistency, effort, respect, how they make you feel, red and green flags, signs of a future
- A Worth It score for each one, and a ranked list
- Shareable result card ('My situationship scored 38/100. Not worth it.')
- Re-check over time: is it getting better or worse?

**Example:** A user ranks three situationships, sees that the one they've been holding on to scores lowest on consistency and effort, and shares the card in the group chat. Later, in phase 2, someone asks 'what's your Worth It score?' before committing, and they share their verified score.

## Later

- Phase 2: opt-in profiles and friends
- Mutual confirmation: both people confirm they dated before either can rate the other
- Your Worth It Score, built only from confirmed connections and shown only after a minimum number of ratings, with outliers dampened
- Share your score like a credit score: private by default, you choose who sees it
- Right of reply, reporting, and moderated free text

## How it makes money

| Model | Detail |
|---|---|
| Free | Rank up to 3 situationships, with ads |
| Premium | £2.99/month: unlimited, deeper breakdowns, trends over time, premium cards |
| Phase 2 | Profile extras: score insights, verification badge |
| Ads | Never on the result screen |

## Why people come back

Built on **The Progression Loop**, the portfolio's shared retention framework
(streaks with forgiveness, visible progress, milestones, recaps, no guilt-trips).

| Stage | In WorthIt |
|---|---|
| Cue | Weekly 'how's it going?' check-in on each active situationship |
| Tiny win | A 20-second check-in |
| Progress | Score trend over time; the ranking shifts |
| Share | Result and ranking cards |
| Next step | When one ends: a 'what did you learn' recap and a fresh start |
| Cadence | Weekly |

## Watch-outs

Phase 2 is the riskiest feature in the portfolio. Scoring real people can be used for revenge ratings, harassment or defamation, and apps that tried versions of this (Peeple, Lulu, Tea) ran into backlash, app-store problems, legal threats or data breaches. So phase 2 must be consent-first: only people who opt in get a score; only mutually confirmed connections can rate; scores appear only after enough ratings, with outliers dampened; the rated person can see and respond; no ratings of appearance or sex; free text is moderated. It also needs ongoing moderation and support, which breaks the portfolio's low-maintenance rule, and a UK GDPR and app-store policy review before it's built. Phase 1 has none of these problems.

## Status

Planning. The build spec is in [`docs/SPEC.md`](docs/SPEC.md).

---

Part of a portfolio of 33 small consumer apps that share one codebase, one retention module
and one marketing system ([growth-engine](https://github.com/tadagambura/growth-engine)).
