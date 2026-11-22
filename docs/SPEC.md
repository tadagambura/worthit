# WorthIt: Spec

**Rank in portfolio:** #1 of 15 (easiest → hardest) · **Difficulty:** Very easy

## One-liner

Is it worth it? Price-per-unit, cost-per-use and monthly-vs-annual calculators.

## Problem / audience

- **Who it's for:** Shoppers comparing pack sizes, people weighing a big purchase, anyone choosing a monthly vs annual plan.
- **The problem it solves:** Supermarket unit prices are confusing, and it's hard to tell whether a £200 item used 3 times a week beats a £60 one.

## MVP features (ship with only these)

1. Price-per-unit comparison (2–4 items, mixed units g/kg/ml/l/each)
2. Cost-per-use calculator (price ÷ expected uses over lifetime)
3. Monthly vs annual plan comparison (break-even month, total saving)
4. Discount calculator (% off, multi-buy deals like 3-for-2)
5. Shareable result card ("The 1kg bag is 23% cheaper")

## Not in MVP

- Saved comparison history (premium)
- Purchase tracking
- Deal affiliate links

## Monetisation

| Model | Detail |
|---|---|
| Free | All calculators, with ads |
| Paid | Premium: history + no ads, one-off £2.99 |
| Ads | AdSense on web, AdMob in app |
| Affiliate | Deal links where relevant, clearly labelled |

Prices are starting points from the portfolio brief; test before committing.

## Platform & stack

- **Platform:** Web first (each calculator is its own SEO landing page), then Expo app.
- **Stack:** shared portfolio foundation (Expo, PostHog, RevenueCat, AdMob). See the portfolio roadmap.
- **Data:** None needed. Calculations run in the browser; history stored on the device only.

## Growth engine hooks

- **Shareable output:** Comparison result cards.
- **Content pillars:** Supermarket unit-price traps; Cost-per-use thinking; Subscription maths; Deal myths (multi-buys that aren't)

## Notes

Each calculator page targets a search query ("price per kg calculator", "cost per wear"). Good test bed for the shared foundation: landing page, analytics, ads, deploy.

## Launch checklist

- [ ] Name checked on App Store / Play Store / trademark search
- [ ] MVP features done and tested
- [ ] Privacy policy + terms
- [ ] Landing page
- [ ] Analytics wired
- [ ] Payments / ads wired
- [ ] Added to growth-engine as an app config
