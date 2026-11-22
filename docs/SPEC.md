# WorthIt: Spec

**Is your situationship worth it?** · #2 of 33 in the build order · Very easy · Revenue potential: Medium–high · Social, Play & Style · Source: Owner's idea

## One-liner

Phase 1: rank your situationships. Answer a short qualitative form about each one (communication, consistency, effort, respect, how they make you feel, red and green flags, signs of a future) and WorthIt scores and ranks them, so you can see which one is genuinely worth it. Phase 2: the Worth It Score, a consent-based digital dating identity. People who opt in get a profile, add friends, and connect with people they've actually dated; their score is built from feedback those confirmed connections submit. So when someone says 'I want to commit to you, but what's your Worth It score?', you can share it.

## Problem / audience

- **Who it's for:** 18–30s dating in the app era, especially anyone in, or just out of, a situationship.
- **The problem it solves:** People stay in situationships too long because they can't step back and judge them clearly. And when someone wants to commit, there's no way to know how they've treated the people they dated before.
- **Example:** A user ranks three situationships, sees that the one they've been holding on to scores lowest on consistency and effort, and shares the card in the group chat. Later, in phase 2, someone asks 'what's your Worth It score?' before committing, and they share their verified score.

## MVP features (ship with only these)

1. Add situationships by nickname only (no real names or photos in phase 1)
2. Qualitative form: communication, consistency, effort, respect, how they make you feel, red and green flags, signs of a future
3. A Worth It score for each one, and a ranked list
4. Shareable result card ('My situationship scored 38/100. Not worth it.')
5. Re-check over time: is it getting better or worse?

## Not in MVP

- Phase 2: opt-in profiles and friends
- Mutual confirmation: both people confirm they dated before either can rate the other
- Your Worth It Score, built only from confirmed connections and shown only after a minimum number of ratings, with outliers dampened
- Share your score like a credit score: private by default, you choose who sees it
- Right of reply, reporting, and moderated free text

## Monetisation

| Model | Detail |
|---|---|
| Free | Rank up to 3 situationships, with ads |
| Premium | £2.99/month: unlimited, deeper breakdowns, trends over time, premium cards |
| Phase 2 | Profile extras: score insights, verification badge |
| Ads | Never on the result screen |

Prices are starting points; test before committing.

## Retention: The Progression Loop

| Stage | Design |
|---|---|
| Cue | Weekly 'how's it going?' check-in on each active situationship |
| Tiny win | A 20-second check-in |
| Progress | Score trend over time; the ranking shifts |
| Share | Result and ranking cards |
| Next step | When one ends: a 'what did you learn' recap and a fresh start |
| Cadence | Weekly |

Follow the portfolio guardrails: no guilt-trip notifications, no fake urgency, progress is
never wiped, at most one notification a day by default.

## Platform & data

- **Platform:** Phase 1: Expo app plus web share links, no accounts. Phase 2: accounts, a backend (Supabase), verification and moderation.
- **Data:** Phase 1: on the device only, nicknames only. Phase 2: holds personal data about other people, so it needs consent, verification and a privacy review.
- **Stack:** shared portfolio foundation (Expo, PostHog, RevenueCat, AdMob, shared Progression Loop module).

## Growth engine

- **Content pillars:** Situationship red and green flags; 'Is it worth it?' scenarios; Dating in your 20s; Self-respect in dating
- **Shareable output:** Result and ranking cards

## Risks

Phase 2 is the riskiest feature in the portfolio. Scoring real people can be used for revenge ratings, harassment or defamation, and apps that tried versions of this (Peeple, Lulu, Tea) ran into backlash, app-store problems, legal threats or data breaches. So phase 2 must be consent-first: only people who opt in get a score; only mutually confirmed connections can rate; scores appear only after enough ratings, with outliers dampened; the rated person can see and respond; no ratings of appearance or sex; free text is moderated. It also needs ongoing moderation and support, which breaks the portfolio's low-maintenance rule, and a UK GDPR and app-store policy review before it's built. Phase 1 has none of these problems.

## Launch checklist

- [ ] Name checked on the App Store, Play Store and a trademark search
- [ ] MVP features done and tested
- [ ] Progression Loop wired (cue, tiny win, progress, milestone, next step)
- [ ] Privacy policy and terms
- [ ] Landing page
- [ ] Analytics wired (D1/D7/D30 retention)
- [ ] Payments / ads wired
- [ ] Added to growth-engine as an app config
