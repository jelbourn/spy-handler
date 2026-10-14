# SpyHandler

This is a prototype, demo type of application, not serious production code.

This app is a game where the user plays the role of Handler for a team of covert operatives. The
operatives are very needy, though, and need to keep calling their handler (the player) for
instructions.

The operatives are actually AI agents that call and text the player, built on top of Twilio for
phone/text service, and ElevenLabs for AI character voices.

## Development

The Angular app is in `src/`. The server in `server/` is Node + TypeScript (run with `tsx`) using
Hono for HTTP and SQLite (`better-sqlite3` + Drizzle ORM). Entity types shared by both sides are in
`shared/models.ts`.

```sh
npm install
npm run db:reset  # (re)creates data/app.db from the schema and inserts demo data
npm start         # Angular on :4200 (proxies /api to :3000) + API server on :3000
```

- Configuration and secrets go in a `.env` file at the repo root (gitignored, never commit it). All
  values are optional for local development:
  ```sh
  PORT=3000
  DB_PATH=data/app.db

  # Public tunnel URL (ngrok/cloudflared) that Twilio and ElevenLabs send webhooks to,
  # e.g. https://abc123.ngrok.app
  PUBLIC_URL=
  TWILIO_ACCOUNT_SID=
  TWILIO_AUTH_TOKEN=
  TWILIO_PHONE_NUMBER=

  # Without these, operative calls are logged ("dry run") instead of placed. See "ElevenLabs setup".
  ELEVENLABS_API_KEY=
  ELEVENLABS_PHONE_NUMBER_ID=
  ELEVENLABS_WEBHOOK_SECRET=
  ELEVENLABS_TOOL_SECRET=

  # Phone number for the seeded demo user, so operatives call/text you
  SEED_PHONE_NUMBER=
  ```
- After editing `server/db/schema.ts` (and `shared/models.ts`, which must match it), run
  `npm run db:reset`. This wipes all data. Stop the server first, since it holds a lock on the
  database file.
- `npm run typecheck` type-checks the server code.
- The UI can subscribe to live updates at `GET /api/events` (Server-Sent Events).
- Webhooks from Twilio and ElevenLabs need a public URL. Run a tunnel (e.g.
  `tailscale funnel --bg 3000` or `ngrok http 3000`) and set `PUBLIC_URL` to the tunnel URL.
  Requests through the tunnel can only reach `/elevenlabs/*` and `/twilio/*`; everything else
  (including `/api/*`, which has no auth) returns 404 (`server/public-access.ts`).

## Operative calls

Operatives always call the player; the player never calls them. Calls are placed by an ElevenLabs
agent through a Twilio number imported into ElevenLabs:

1. Starting a session gives each operative a `deadline` for its first call
   (`server/game/calls.ts` has the timing constants).
2. The scheduler (`server/game/scheduler.ts`) polls for passed deadlines and places one call at a
   time per session. Every operative is played by the game's agent (`GameTemplate.agentId`); each
   call switches to the operative's `voiceId` and passes the current decision tree node as dynamic
   variables.
3. During the call, the agent calls the `submit_decision` tool once the player picks a challenge.
   The operative rolls 1 to 100 against the challenge's stat (success if the roll is at most the
   stat), the roll is saved on the call, and the operative moves to the success or failure node.
   The agent isn't told the result; the next call's briefing reveals it. Only one order is
   accepted per call, and the server hangs up through Twilio 10 seconds later (after the agent
   acknowledges), in case the agent doesn't end the call itself.
4. After the call, the post-call webhook stores the summary and transcript. If no decision was made
   (or the call failed), the operative calls back after a minute, or acts on their own once the
   node's `ifNoDecision` limit is reached.
5. Reaching an ending, either way, triggers one last call where the operative reports how it went.
   When that call ends (answered or not), the operative's `status` becomes the ending's `result`.
6. The game session fails as soon as any operative fails, and succeeds once every operative has
   succeeded. Either way it ends, and the remaining operatives stop calling.

### Stats and decision trees

Every operative has three stats from 1 to 100, shown to the player in their dossier on the game
session page:

- **Stealth**: sneaking unseen, pickpocketing, moving quietly
- **Charm**: impersonation, persuasion, romancing
- **Muscle**: fighting, lifting, climbing, jumping, swimming

Each operative's storyline is a `DecisionTree` (see `shared/models.ts`), stored as JSON on
`NpcTemplate`. Scenarios are written in `server/db/scenarios/` and checked by
`validateOperatives` when seeding.

- A tree has a `startNodeId` and a map of nodes keyed by readable IDs (`'captains-office'`).
- A **choice** node has a `situation` (a briefing the agent explains in character) and exactly two
  `choices`, each a challenge testing a different stat. It also has an optional `callDelaySecs`
  before the operative calls about it (default 120), and an optional `ifNoDecision` (after N calls
  without a decision, move to a node with no roll).
- A challenge has an `id`, a `description`, its `stat`, and `onSuccess`/`onFailure` nodes. The
  player is never told the stat: the description has to imply it through the action (sneaking,
  talking, climbing...), so it must not name the stat. Neither should the `id`, which the agent
  also sees.
- Since several paths can lead to the same node, a situation should only describe where the
  operative is now, not which challenge got them there.
- An **ending** node has a `situation` the operative reports and a `result`, either `success` or
  `failure`.

The example scenario, `captain-hanks.ts` ("Operation Golden Grill"), has three operatives
infiltrating Captain Hanks's supply chain to steal the Tandori Halloumi recipe. Each is strong in
one stat and weak in another:

| Operative | Target                        | Stealth | Charm | Muscle |
|-----------|-------------------------------|---------|-------|--------|
| Juniper   | Spice supplier (masala blend) | 35      | 85    | 20     |
| Bishop    | Delivery fleet (marinade)     | 30      | 45    | 80     |
| Moss      | Test kitchen (recipe binder)  | 85      | 25    | 55     |

### ElevenLabs setup

One agent plays every operative in a game, switching to each operative's voice per call. Agent
and voice IDs aren't secret: they're checked in as the scenario's `agentId` and each operative's
`voiceId` in `server/db/scenarios/`. While `agentId` is null, calls are logged instead of placed
(dry run). An operative whose `voiceId` is null speaks in the agent's own voice.

1. Buy a Twilio number and import it under **Agents → Phone Numbers**. Copy its phone number ID
   (not the number) to `ELEVENLABS_PHONE_NUMBER_ID`.
2. Create an agent and put its ID in the scenario as `agentId`, and each operative's voice ID as
   their `voiceId` (then run `npm run db:reset`). Its system prompt should use the
   dynamic variables the server sends: `{{npc_name}}`, `{{persona}}`, `{{scenario}}`,
   `{{situation}}` and `{{choices}}` (one `- id: description` per line).
   `{{npc_session_id}}` and `{{npc_call_id}}` are also sent, for the tool. When `{{choices}}` is
   empty, the storyline has ended: the prompt should tell the agent to report `{{situation}}` and
   hang up.
3. In the agent's **Settings**, under **Security**, enable the overrides for **voice**, **speed** and
   **first message**, then publish.
4. Add a webhook server tool named `submit_decision`:
   - `POST {PUBLIC_URL}/elevenlabs/tools/submit-decision`, with header `X-Tool-Secret` set to
     `ELEVENLABS_TOOL_SECRET`.
   - Body parameters: `npc_session_id` (value from the `npc_session_id` dynamic variable) and
     `choice_id` (filled in by the LLM from the IDs in `{{choices}}`).
   - The response has `instructions` for the agent (acknowledge and hang up), or an `error` to relay.
5. Add a post-call webhook (transcription, plus call initiation failures) pointing at
   `{PUBLIC_URL}/elevenlabs/webhooks`, and copy its secret to `ELEVENLABS_WEBHOOK_SECRET`. The
   webhook is set once for the workspace; select it as the agent's post-call webhook.

## Entities

Source of truth is `server/db/schema.ts` (columns are snake_case in SQLite). Datetimes are stored
as ISO-8601 strings. GameTemplate and NpcTemplate rows are seeded from `server/db/scenarios/`.

| User        |        |                                                             |
|-------------|--------|-------------------------------------------------------------|
| id          | int    |                                                             |
| username    | string | unique                                                      |
| phoneNumber | string | unique; E.164 (`+15555550100`). Operatives call this number |

| GameTemplate |        |                                                                                                |
|--------------|--------|------------------------------------------------------------------------------------------------|
| id           | int    |                                                                                                |
| title        | string |                                                                                                |
| scenario     | string | Mission briefing; sent to the agent as `{{scenario}}`                                          |
| agentId      | string | nullable; the ElevenLabs agent that plays every operative. Null = calls are logged, not placed |

| NpcTemplate    |        |                                                                                                                     |
|----------------|--------|---------------------------------------------------------------------------------------------------------------------|
| id             | int    |                                                                                                                     |
| gameTemplateId | int    | → GameTemplate                                                                                                      |
| name           | string | Sent to the agent as `{{npc_name}}`; shown in the dossier                                                           |
| persona        | string | How the operative talks; sent as `{{persona}}` and shown as the dossier bio                                         |
| voiceId        | string | nullable; ElevenLabs voice ID, overriding the agent's voice on this operative's calls. Null = the agent's own voice |
| stats          | json   | `{stealth, charm, muscle}`, each 1 to 100; shown in the dossier                                                     |
| decisionTree   | json   | `DecisionTree`; see "Stats and decision trees"                                                                      |

| GameSession    |          |                                                                                                                             |
|----------------|----------|-----------------------------------------------------------------------------------------------------------------------------|
| id             | int      |                                                                                                                             |
| userId         | int      | → User                                                                                                                      |
| gameTemplateId | int      | → GameTemplate                                                                                                              |
| startTime      | datetime |                                                                                                                             |
| endTime        | datetime | nullable; null = active. A user has at most one active session                                                              |
| status         | string   | `in-progress`, `success` or `failure`. Fails when any operative fails; succeeds when all succeed. Ending early is a failure |

| NpcSession           |          |                                                                                                     |
|----------------------|----------|-----------------------------------------------------------------------------------------------------|
| id                   | int      |                                                                                                     |
| gameSessionId        | int      | → GameSession                                                                                       |
| npcTemplateId        | int      | → NpcTemplate                                                                                       |
| decisionNodeId       | string   | Current node in the decision tree; starts at its `startNodeId`                                      |
| callsWithoutDecision | int      | Default 0. Calls in a row with no decision, for `ifNoDecision`                                      |
| lastCommsTime        | datetime | nullable; when the handler last picked a challenge                                                  |
| deadline             | datetime | nullable; when the operative next calls. Null during a call, and after the ending has been reported |
| status               | string   | `in-progress`, `success` or `failure`; set to the ending's result once it's reported                |

| NpcCall        |          |                                                                                                |
|----------------|----------|------------------------------------------------------------------------------------------------|
| id             | int      |                                                                                                |
| npcSessionId   | int      | → NpcSession                                                                                   |
| conversationId | string   | nullable, unique; ElevenLabs conversation ID, set once the call is placed                      |
| callSid        | string   | nullable; Twilio call SID, set once the call is placed                                         |
| nodeId         | string   | The decision tree node the operative called about; an ending makes it the report call          |
| startTime      | datetime |                                                                                                |
| endTime        | datetime | nullable; null = in progress                                                                   |
| outcome        | string   | nullable until the call ends; completed, busy, no-answer, failed, timeout, or dry-run          |
| summary        | string   | nullable; ElevenLabs transcript summary                                                        |
| transcript     | json     | nullable; `[{role, message}]`                                                                  |
| decision       | json     | nullable; the challenge picked on this call: `{challengeId, stat, statValue, roll, succeeded}` |

## API

| GameService |                       |                          |                                                                                                                                                      |
|-------------|-----------------------|--------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------|
| GET         | /api/sessions         |                          | All sessions, newest first                                                                                                                           |
| POST        | /api/sessions         | {userId, gameTemplateId} | 201 with the session; creates NpcSessions and schedules first calls. 400 bad body, 404 unknown user/template, 409 user already has an active session |
| GET         | /api/sessions/:id     |                          | Session plus `operatives`: each one's `dossier` (name, bio, stats) and `npcSession`. 404 if not found                                                |
| POST        | /api/sessions/:id/end |                          | Abandons the session: sets `endTime` and `status: failure`. 404 if no active session with that ID                                                    |
| GET         | /api/events           |                          | SSE stream: `session.created`, `session.ended` (also when the session succeeds or fails), `npc.updated`, `call.updated`, plus a `ping` every 15s     |

| Webhooks |                                   |                             |                                                                                                                                       |
|----------|-----------------------------------|-----------------------------|---------------------------------------------------------------------------------------------------------------------------------------|
| POST     | /elevenlabs/tools/submit-decision | {npc_session_id, choice_id} | Agent server tool; rolls the picked challenge. 401 bad `X-Tool-Secret`. Game errors are 200 with `{error}` so the agent can read them |
| POST     | /elevenlabs/webhooks              | ElevenLabs webhook          | Post-call transcript or call initiation failure. 401 bad signature                                                                    |
| POST     | /twilio/sms                       | Twilio webhook              | Inbound SMS; responds with TwiML. 403 bad signature                                                                                   |
