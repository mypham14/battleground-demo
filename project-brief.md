# Battleground - Project Brief
## 1. What are we actually building? (Scope)

A web app where you type in two fighters and get an AI generated verdict on who'd win, plus AI generated character art for both.

A fighter is a side, not necessarily a single creature. "10 cows vs 10 lions" is a valid matchup: quantity is part of the verdict, and each side gets one image depicting the whole group.

## 2. What's the smallest, simplest version worth shipping (MVP)?

- Two text inputs and a Fight button.
- A loading state while we wait on the APIs.
- A winner card with an animation and the reasoning for the win.
- One generated image per fighter (two images per fight).
- A basic BattleDex saved to localStorage. It saves individual fighters, each with a label and an image. Type two fighters, get a real result, save either fighter if you want.
- A system prompt that scopes Claude to judging fights and resists prompt injection (see section 5).
- Rate limiting on the fight function (see section 5).
- Desktop-first layout.

### Verdict format

Claude returns structured JSON (winner, reasoning, optionally a one-line tagline). The winner card renders from that data. The verdict is not saved.

### Image storage

Images are downsized client-side before saving (canvas resize to roughly 256px, exported as WebP or JPEG) to conserve localStorage space.

## 3. What are we building this with (tech stack)?

HTML, CSS, and vanilla JS for the frontend. A single serverless function (`api/fight.js`) that calls both APIs together. Claude's API for the verdict. OpenAI's image API for the character art. localStorage for saving BattleDex.

The project is built and tested locally, then deployed to Vercel in the final QA stage. Locally, `node script.js` serves the pages and the function (`vercel dev` also works where symlinks are allowed).

API keys stay server-side in the function, loaded from a local `.env` that is never committed.

## 4. What's the long-term vision, beyond just the MVP?

I would eventually like a real backend where BattleDex fighters sync across devices instead of just living in localStorage. I'd also want a quick re-fight option using fighters already saved in the BattleDex, instead of typing two new ones every time.

Cross-device sync needs some form of identity (accounts or an anonymous ID), so it is its own phase.

## 5. Protection (part of the MVP)

- **System prompt.** Claude only judges fights between the two fighters. Fighter text is treated as untrusted data, never as instructions. Output must match the fixed JSON shape.
- **Rate limiting.** 5 requests/min per IP, enforced inside `api/fight.js` before any API call. One request is one fight (one call to the function).
- **Spend protection.** No budget ceiling for now. Set a hard monthly spend limit in the OpenAI and Anthropic dashboards.

## 6. Decisions

- **Goal:** portfolio project.
- **Art style:** chosen per fighter, so the two images may differ in style.
- **Refused input:** if the image API refuses a fighter (real people, copyrighted characters, unsafe input), the app asks the user for a different fighter.
- **Layout:** desktop first.
- **Hosting:** built locally, deployed to Vercel at the end (final QA stage).
- **Deadline:** none for now.
- **Architecture:** one function calls both APIs, and rate limiting lives in that same function.
- **BattleDex contents:** individual fighters (label and image), not whole fights.

## 7. Open questions

None right now.
