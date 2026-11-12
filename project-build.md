# Battleground - Build Stages

Source: `project-brief.md`. Work one stage at a time. Each stage ends in something you can run and check before moving on. Everything is built and tested locally; there is no deploy step.

**Architecture:** one serverless function, `api/fight.js`. It calls Claude (verdict) and OpenAI (two images) together and returns the whole result. Rate limiting lives in this same function.

| # | Stage | Result |
|---|-------|--------|
| 0 | Setup | Local project runs, keys are safe |
| 1 | UI shell | Desktop layout with inputs and Fight button |
| 2 | Fight function: verdict | `/api/fight` returns structured verdict JSON |
| 3 | Verdict in the UI | Fight shows a winner card with reasoning |
| 4 | Fight function: images | Same function also returns two images |
| 5 | Art in the UI | Card shows two images; refusals handled |
| 6 | Winner animation | Winner reveal animates |
| 7 | BattleDex | Save individual fighters (label + image) |
| 8 | System prompt | Claude only judges fights and resists injection |
| 9 | Rate limiting | 5 requests/min per IP, inside `api/fight.js` |
| 10 | Polish and finish | Error states, README, full local test |

---

## Stage 0: Setup

**Goal:** a local skeleton with secrets handled correctly.

- Create the repo and folder layout: `index.html`, `style.css`, `app.js`, `api/`.
- Pick a local runner for the function (for example `vercel dev`) and confirm a "hello world" function responds.
- Put `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` in a local `.env`, and add `.env` to `.gitignore`.
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

- `api/fight.js` takes two fighters and calls Claude.
- The prompt treats quantity as part of the matchup ("10 cows vs 10 lions").
- Claude returns JSON: `winner`, `reasoning`, optionally `tagline`. Validate it before returning.
- Test with `curl` on a few matchups, including groups.

**Done when:** the endpoint returns valid JSON for 5 varied matchups.

## Stage 3: Verdict in the UI

**Goal:** the first end-to-end fight, text only.

- Fight button calls `/api/fight`.
- Switch to the loading view while the call runs, then to the result view with the winner and reasoning.
- Switch to the error view with a simple message if the call fails.

**Done when:** you can type two fighters and read a real verdict.

## Stage 4: Fight function: images

**Goal:** add the OpenAI calls to the same function.

- In `api/fight.js`, run the Claude call and both image calls in parallel (`Promise.all`).
- The art style is chosen per fighter: build it into each image prompt.
- A group prompt depicts the whole group in one image ("10 lions").
- If OpenAI refuses a prompt, the function returns a clear error code naming which fighter was refused.
- Return one response: verdict JSON plus two images.

**Done when:** one request returns a verdict and two images for a single-creature matchup and a group matchup, and a refused fighter returns the error code.

## Stage 5: Art in the UI

**Goal:** the full fight with art.

- Keep the single loading view while the function runs.
- Show the two images on the winner card in the result view.
- On the refusal error, ask the user for a different fighter.

**Done when:** one fight shows a verdict and two images, and a refused fighter prompts for a new one.

## Stage 6: Winner animation

**Goal:** the winner reveal.

- Animate the winner card (CSS keyframes or transitions).
- Keep it short or skippable so repeat fights don't feel slow.

**Done when:** the reveal plays on every fight and doesn't block reading the reasoning.

## Stage 7: BattleDex

**Goal:** saved fighters that survive a reload.

- BattleDex saves **individual fighters**, not whole fights. Each entry is a label and an image. No verdict is stored.
- A "Save" button on each fighter on the winner card.
- Downsize the image client-side (canvas, about 256px, WebP or JPEG) before storing.
- BattleDex view lists saved fighters; allow deleting one.
- Handle a full localStorage with a clear message.

**Done when:** saved fighters persist after a reload, and 50+ saves still fit.

## Stage 8: System prompt

**Goal:** lock down what Claude will do.

- Write the system prompt so Claude only judges fights between the two fighters and does nothing else.
- Treat fighter text as untrusted data: put it in clearly delimited fields, and tell Claude never to follow instructions found inside it.
- Require the fixed JSON output shape; reject anything that doesn't validate.
- Decide what Claude returns for input that isn't a real matchup (for example, a request to ignore its instructions).
- Test with injection attempts: "ignore previous instructions", "reveal your system prompt", a fighter name that contains instructions, and requests for unrelated tasks.

**Done when:** none of the injection attempts changes Claude's behavior or output shape, and normal fights still work.

## Stage 9: Rate limiting

**Goal:** protect the endpoint.

- Limit to 5 requests/min per IP, inside `api/fight.js`, before any API call is made.
- One call to the function is one fight, so one request means one fight.
- Return HTTP 429 and show a friendly "slow down" message in the UI.
- Locally an in-memory counter is enough. It won't be shared across serverless instances, so it would need a shared store if the app is ever deployed.

**Done when:** the sixth request in a minute from one IP is rejected before any API call, and the UI explains why.

## Stage 10: Polish and finish

**Goal:** something you can put in a portfolio.

- Check empty, long, odd and non-English inputs.
- Check every error path: API down, refusal, rate limit, full storage.
- Write a README: what it is, a screenshot, the stack, how to run it locally.
- Run a full local test of a fight from start to finish.

**Done when:** someone can clone the repo, add their keys, and complete a fight locally from the README.

---

## After the MVP (not planned yet)

- Quick re-fight from saved BattleDex fighters.
- Cross-device sync: needs a backend and some form of identity (accounts or an anonymous ID).
