# Battleground - Build Stages

Source: `project-brief.md`. Work one stage at a time. Each stage ends in something you can run and check before moving on. Everything is built and tested locally until the final stage, which deploys to Vercel.

**Architecture:** one serverless function, `api/fight.js`, served at `/api/fight`. It rate-limits, validates input, then calls Claude (verdict) and OpenAI (two images) in parallel and returns the whole result. Two helper modules sit beside it and are not handlers: `api/judge-prompt.js` (the judge system prompt) and `api/art-style.js` (the shared art style template).

**Stack:** plain HTML, CSS and vanilla JS (modern black theme, `css/style.css`); Anthropic `claude-sonnet-5` for the verdict; OpenAI `gpt-image-2` for the art; `localStorage` for BattleDex. Run locally with `node script.js` (port 3000). It serves the static files and `/api/fight`, and loads `.env`. `vercel dev` is optional and needs symlink permission on Windows.

| # | Stage | Result |
|---|-------|--------|
| 0 | Setup | Local project runs, keys are safe |
| 1 | UI shell | Desktop layout with inputs and Fight button |
| 2 | Fight function: verdict | `/api/fight` returns structured verdict JSON |
| 3 | Verdict in the UI | Fight shows a winner card with explanation |
| 4 | Fight function: images | Same function also returns two images |
| 5 | Art in the UI | Card shows two images; refusals handled |
| 6 | Winner animation | Winner reveal animates |
| 7 | BattleDex | Save individual fighters (label + image) |
| 8 | Claude redesign | Claude Design gives the whole app a full visual overhaul |
| 9 | System prompt | Claude only judges fights and resists injection |
| 10 | Rate limiting | 5 requests/min per IP, inside `api/fight.js` |
| 11 | Final QA and deploy | Error states, README, full local test, live on Vercel |

---

## Stage 0: Setup

**Goal:** a local skeleton with secrets handled correctly.

- Create the repo and folder layout: `index.html`, `battledex.html`, `css/style.css`, `js/`, `api/`.
- Use `script.js` as the local runner (`node script.js`) and confirm a "hello world" function responds.
- Put `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` in a local `.env`, and add `.env` to `.gitignore`. There is no `.env.example` in the repo.
- Set hard monthly spend limits in the Anthropic and OpenAI dashboards.

**Done when:** the page loads locally, the test function responds, and no key exists in the repo.

## Stage 1: UI shell

**Goal:** the static page with four views, no API calls.

- Four separate views on one page: the input form, a loading view, a result view and an error view.
- Only one view is visible at a time. JavaScript toggles them with the `hidden` attribute; they are never stacked on the same screen.
- Only the input form is visible for now. The other three start `hidden` and hold placeholder content.
- The input form has two text inputs and a Fight button.
- Desktop-first layout.
- Disable the button when either input is empty.
- Add one small function that shows a named view and hides the other three, so later stages switch views through it.

**Done when:** the page loads with only the input form visible, the button logic works, and calling the view switcher from the console shows each of the other three views alone.

## Stage 2: Fight function: verdict

**Goal:** the single endpoint, with the Claude call only, tested without the UI.

- `api/fight.js` takes two fighters and calls Claude. The judge system prompt lives in `api/judge-prompt.js`.
- The prompt treats quantity as part of the matchup ("10 cows vs 10 lions").
- The judge always names exactly one winner. No ties and no refusals, even for identical matchups (for example "lion" vs "lion"); it still picks a side.
- The explanation is 2-4 sentences at most, in a fun and playful tone that still holds up logically. The prompt enforces this.
- Claude returns JSON `{ winner: "A" | "B", explanation }`, enforced with a zod schema and native structured outputs (`messages.parse` with `zodOutputFormat`). `winner` is `"A"` or `"B"`, not the fighter's text, so identical matchups stay unambiguous.
- Rate limiting (5 requests/min per IP) and input validation (non-empty, 80 characters or fewer) run before the Claude call.
- Test with `curl` on a few matchups, including groups and an identical matchup.

**Done when:** the endpoint returns valid JSON for 5 varied matchups, each with one winner and a playful 2-4 sentence explanation, and an identical matchup still returns a winner.

## Stage 3: Verdict in the UI

**Goal:** the first end-to-end fight, text only.

- Fight button calls `/api/fight`.
- The verdict's output format is defined with a zod schema, used for Claude's structured output. The UI can rely on the response matching that shape.
- Switch to the loading view while the call runs, then to the result view with the winner and explanation.
- Switch to the error view with a simple message if the call fails.
- The result card works without images: with no images in the response it shows the fighter labels, the winner highlight and the explanation, and hides the image blocks and the save buttons.

**Done when:** you can type two fighters and read a real verdict.

## Stage 4: Fight function: images

**Goal:** add the OpenAI calls to the same function.

- In `api/fight.js`, run the Claude call and both image calls in parallel with `Promise.allSettled`, so each failure can be told apart.
- Image call: OpenAI `gpt-image-2`, `1024x1024`, `quality: 'low'`, returned as `data:image/png;base64,...`.
- Every image follows one shared art style template (`api/art-style.js`, `{FIGHTER}` placeholder), with the fighter placed into it. The template:
  - 16-bit pixel art illustration, retro video game sprite style, bold outlined pixels, vibrant limited color palette, dynamic action pose.
  - Depicted as one cohesive image, centered, filling most of the frame, isolated on a plain solid color background with no scenery.
  - No text, words, letters, numbers, logos, watermarks, UI elements, borders or frames.
- A group prompt depicts the whole group in one image ("10 lions"). The quantity is passed straight through, not parsed.
- `moderation_blocked` is its own error case, separate from a generic image failure. When OpenAI refuses a prompt (`error.code === 'moderation_blocked'`), the function returns `422 { error: 'moderation_blocked', fighters: ['A' | 'B'], message }`, and the message names the refused fighter or fighters. Any other image error returns `image_failed` (HTTP 502).
- A verdict failure returns `502 verdict_failed`.
- Return one response: `{ verdict, imageA, imageB }`.

**Done when:** one request returns a verdict and two images in the shared style for a single-creature matchup and a group matchup, a refused fighter returns `moderation_blocked`, and a different image error returns `image_failed`.

## Stage 5: Art in the UI

**Goal:** the full fight with art.

- Keep the single loading view while the function runs.
- Show the two images on the winner card in the result view, with the winning portrait highlighted and the explanation beneath.
- On `moderation_blocked`, ask the user for a different fighter. A generic `image_failed` shows a retry message instead.

**Done when:** one fight shows a verdict and two images, and a refused fighter prompts for a new one.

## Stage 6: Winner animation

**Goal:** the winner reveal.

- Animate the winner card (CSS keyframes or transitions).
- Keep it short or skippable so repeat fights don't feel slow.

**Done when:** the reveal plays on every fight and doesn't block reading the explanation.

## Stage 7: BattleDex

**Goal:** saved fighters that survive a reload.

- BattleDex saves **individual fighters**, not whole fights. Each entry is a label and an image. No verdict is stored.
- A "Save" button on each fighter on the winner card.
- Downsize the image client-side (canvas, about 256px, WebP or JPEG) before storing.
- BattleDex view lists saved fighters; allow deleting one.
- Each saved fighter is a styled card that looks like a mini trading card: the image on top, the name below.
- A card shows only the image and the name, so it is not clickable and opens no detail view.
- The BattleDex page has two buttons at the top: one to jump back into your most recent fight (the recap of the last result), and one to start a new fight. Show the recent-fight button only when a recent fight exists.
- Handle a full localStorage with a clear message.

**Done when:** saved fighters persist after a reload and show as trading-card-style cards (image on top, name below, not clickable), 50+ saves still fit, the recent-fight button returns to the last result, and the new-fight button opens a blank battle screen.

## Stage 8: Claude redesign

**Goal:** a full visual overhaul of the app, done by Claude Design instead of by hand-polishing the verdict UI.

- Hand the entire app to Claude Design: the battle screen with all four views (form, loading, result, error) and the BattleDex page, together with `css/style.css`.
- Give it what it must keep: the element ids and class names that `js/battle.js` and `js/battledex.js` read or toggle (`is-revealed`, `is-winner`, `hidden`), the saved-fighter card layout, and the shared pixel-art portraits.
- Ask for a coherent look across every view, desktop first and still usable at tablet and phone widths.
- Apply the result and keep behavior unchanged. This stage changes appearance only: no API, storage or logic changes.
- Run a full fight and a BattleDex save and delete in the browser to confirm nothing broke.

**Done when:** every view and the BattleDex page carry the new design, and a full fight, an error state and a BattleDex save still work.

## Stage 9: System prompt

**Goal:** lock down what Claude will do.

- A baseline guard is already in `api/judge-prompt.js`. This stage hardens it:
- Write the system prompt so Claude only judges fights between the two fighters and does nothing else.
- Treat fighter text as untrusted data: put it in clearly delimited fields, and tell Claude never to follow instructions found inside it.
- Require the fixed JSON output shape; reject anything that doesn't validate.
- Decide what Claude returns for input that isn't a real matchup (for example, a request to ignore its instructions).
- Test with injection attempts: "ignore previous instructions", "reveal your system prompt", a fighter name that contains instructions, and requests for unrelated tasks.

**Done when:** none of the injection attempts changes Claude's behavior or output shape, and normal fights still work.

## Stage 10: Rate limiting

**Goal:** protect the endpoint.

- Limit to 5 requests/min per IP, inside `api/fight.js`, before any API call is made. A first version is already in place from the earlier stages; this stage tests and finishes it.
- One call to the function is one fight, so one request means one fight.
- Return HTTP 429 and show a friendly "slow down" message in the UI.
- An in-memory counter is enough for the demo. It won't be shared across serverless instances, so it would need a shared store for real traffic once deployed.

**Done when:** the sixth request in a minute from one IP is rejected before any API call, and the UI explains why.

## Stage 11: Final QA and deploy

**Goal:** something you can put in a portfolio, live on Vercel.

- Check empty, long, odd and non-English inputs.
- Check every error path: API down, refusal, rate limit, full storage.
- Write a README: what it is, a screenshot, the stack, how to run it locally.
- Run a full local test of a fight from start to finish.
- Deploy to Vercel:
  - Set `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` as Vercel project environment variables, never committed.
  - Keep `vercel.json` `maxDuration` at 120 seconds, since a fight with two images can take a minute or more.
  - Deploy, then run a full fight on the live URL and check the error paths there too.
  - The in-memory rate limiter resets on a cold start and is not shared between instances. Accept that for the demo, or move it to a shared store.
  - Confirm the Anthropic and OpenAI spend limits from Stage 0 are still set.

**Done when:** someone can clone the repo, add their keys, and complete a fight locally from the README, and a full fight works on the live Vercel URL.

---

## After the MVP (not planned yet)

- Quick re-fight from saved BattleDex fighters.
- Cross-device sync: needs a backend and some form of identity (accounts or an anonymous ID).
