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
npm run start:fake  # Same, but with fake ElevenLabs and Twilio: no real calls
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

  # Needed to place real calls (not with --fake-services). See "ElevenLabs setup".
  ELEVENLABS_API_KEY=
  ELEVENLABS_PHONE_NUMBER_ID=
  ELEVENLABS_WEBHOOK_SECRET=
  ELEVENLABS_TOOL_SECRET=
  ```
- After editing `server/db/schema.ts` (and `shared/models.ts`, which must match it), run
  `npm run db:reset`. This wipes all data. Stop the server first, since it holds a lock on the
  database file.
- `npm run typecheck` type-checks the server code.
- `npm run test:e2e` plays a whole game against a real server with fake services, and checks the
  rules along the way (`server/test/e2e.ts`).
- The server takes two flags (`npm run server -- <flags>`): `--fake-services` swaps ElevenLabs for
  `FakeElevenLabs`, which answers each call with a random order, and only logs Twilio hang-ups;
  `--no-scheduler` stops it placing calls on its own.
- The UI can subscribe to live updates at `GET /api/events` (Server-Sent Events).
- Webhooks from Twilio and ElevenLabs need a public URL. Run a tunnel (e.g.
  `tailscale funnel --bg 3000` or `ngrok http 3000`) and set `PUBLIC_URL` to the tunnel URL.
  Requests through the tunnel can only reach `/elevenlabs/*`; everything else
  (including `/api/*`, which has no auth) returns 404 (`server/public-access.ts`).

## Operative calls

Operatives always call the player; the player never calls them. Calls are placed by an ElevenLabs
agent through a Twilio number imported into ElevenLabs:

1. Calls are one at a time per session. Starting a session sets its `nextCallTime`, and every call
   that ends sets it again (`server/game/calls.ts` has the timing constants).
2. When `nextCallTime` passes, the scheduler (`server/game/scheduler.ts`) places a call
   (`placeNextCall`) for the operative `pickNextCaller` picks (`server/game/turn-order.ts`): a
   random one among those who have called the fewest times. So the player hears from every
   operative before anyone calls again, in a different order each round. The caller takes the
   mission's current node
   (`GameSession.decisionNodeId`). Every operative is played by the game's agent
   (`GameTemplate.agentId`); each call switches to the operative's `voiceId` and passes the node
   as dynamic variables.
3. During the call, the agent calls the `submit_decision` tool once the player picks a challenge.
   The calling operative rolls 1 to 100 against their own stat for that challenge (success if the
   roll is at most the stat), the roll is saved on the call, and the mission moves to the node's
   success or failure child. The agent isn't told the result; the next call's briefing reveals it.
   Only one order is accepted per call, and the server hangs up through Twilio 10 seconds later
   (after the agent acknowledges), in case the agent doesn't end the call itself.
4. After the call, the post-call webhook stores the summary and transcript. Every call about a
   choice node ends with a decision: if the player gave no order (a missed call, or no clear
   decision), the operative picks one of the two challenges by coin toss and rolls for it.
5. Every failed roll, coin tosses included, adds to the session's `failureCount`. The game is lost
   as soon as it passes the template's `allowedFailures`.
6. Reaching an ending node means the mission made it through. The next operative to call reports
   it, and when that call ends (answered or not), the game is won. Either way, once the game ends
   the operatives stop calling.

### Stats and decision trees

Every operative has three stats from 1 to 100, shown to the player in their dossier on the game
session page:

- **Stealth**: sneaking unseen, pickpocketing, moving quietly
- **Charm**: impersonation, persuasion, romancing
- **Muscle**: fighting, lifting, climbing, jumping, swimming

The mission's storyline is a single `DecisionTree` (see `shared/models.ts`), shared by the whole
team and stored as JSON on `GameTemplate`. Any operative can end up handling any node, so
situations are addressed to whoever is calling. Scenarios are written in `server/scenarios/`, one
per file exporting a `Scenario`. Seeding loads every file there (in filename order, which sets the
template IDs) and checks each with `validateScenario`.

- A tree has a `startNodeId` and a map of nodes keyed by readable IDs (`'office-door'`).
- A **choice** node has a `situation` (a briefing the agent explains in character), exactly two
  `choices`, each a challenge testing a different stat, and `onSuccess`/`onFailure` child nodes.
  The player's pick only sets the odds: either challenge leads to the same two children.
- `onFailure` is left out exactly where failing would pass `allowedFailures`, since the game ends
  there, so no unreachable content gets written. Seeding checks this.
- A challenge has an `id`, a `description` and its `stat`. The player is never told the stat:
  the description has to imply it through the action (sneaking, talking, climbing...), so it must
  not name the stat. Neither should the `id`, which the agent also sees.
- The tree is strict: every node except the start has exactly one parent outcome. So each
  situation starts by saying whether the team's previous attempt succeeded or failed, and what
  happens next builds on that. It shouldn't say which challenge was picked, since either could
  have been.
- An **ending** node has a `situation` the reporting operative tells the player.
- How many decisions the mission has is up to the scenario.

The example scenario, `captain-hanks.ts` ("Operation Golden Grill"), has the team working along
Captain Hanks's supply chain in Portland (spice supplier, delivery fleet, then test kitchen) to
steal the Tandori Halloumi recipe. It has four decisions and allows one failure. Each operative is
strong in one stat and weak in another, so the best order depends on who's calling:

| Operative | Stealth | Charm | Muscle |
|-----------|---------|-------|--------|
| Juniper   | 35      | 85    | 20     |
| Bishop    | 30      | 45    | 80     |
| Moss      | 85      | 25    | 55     |

### ElevenLabs setup

One agent plays every operative in a game, switching to each operative's voice per call. Agent
and voice IDs aren't secret: they're checked in as the scenario's `agentId` and each operative's
`voiceId` in `server/scenarios/`. While `agentId` is null, calls are logged instead of placed
(dry run). An operative whose `voiceId` is null speaks in the agent's own voice.

1. Buy a Twilio number and import it under **Agents → Phone Numbers**. Copy its phone number ID
   (not the number) to `ELEVENLABS_PHONE_NUMBER_ID`.
2. Create an agent and put its ID in the scenario as `agentId`, and each operative's voice ID as
   their `voiceId` (then run `npm run db:reset`). Its system prompt should use the
   dynamic variables the server sends: `{{npc_name}}`, `{{handle}}` (the player's handle),
   `{{persona}}`, `{{scenario}}`, `{{situation}}` and `{{choices}}` (one `- id: description` per line).
   `{{npc_session_id}}` and `{{npc_call_id}}` are also sent, for the tool. When `{{choices}}` is
   empty, the mission has ended: the prompt should tell the agent to report `{{situation}}` and
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
as ISO-8601 strings. GameTemplate and NpcTemplate rows are seeded from `server/scenarios/`.

| User        |        |                                                             |
|-------------|--------|-------------------------------------------------------------|
| id          | int    |                                                             |
| username    | string | unique                                                      |
| handle      | string | Sent to the agent as `{{handle}}`                           |
| phoneNumber | string | unique; E.164 (`+15555550100`). Operatives call this number |

| GameTemplate    |        |                                                                                                |
|-----------------|--------|------------------------------------------------------------------------------------------------|
| id              | int    |                                                                                                |
| title           | string |                                                                                                |
| scenario        | string | Mission briefing; sent to the agent as `{{scenario}}`                                          |
| agentId         | string | nullable; the ElevenLabs agent that plays every operative. Null = calls are logged, not placed |
| allowedFailures | int    | Default 0. How many failed rolls the team can afford: the game is lost on the next one         |
| decisionTree    | json   | The mission's `DecisionTree`; see "Stats and decision trees"                                   |

| NpcTemplate    |        |                                                                                                                     |
|----------------|--------|---------------------------------------------------------------------------------------------------------------------|
| id             | int    |                                                                                                                     |
| gameTemplateId | int    | → GameTemplate                                                                                                      |
| name           | string | Sent to the agent as `{{npc_name}}`; shown in the dossier                                                           |
| persona        | string | How the operative talks; sent as `{{persona}}` and shown as the dossier bio                                         |
| voiceId        | string | nullable; ElevenLabs voice ID, overriding the agent's voice on this operative's calls. Null = the agent's own voice |
| stats          | json   | `{stealth, charm, muscle}`, each 1 to 100; shown in the dossier. Sets the odds on their calls                       |

| GameSession    |          |                                                                                                                                                            |
|----------------|----------|------------------------------------------------------------------------------------------------------------------------------------------------------------|
| id             | int      |                                                                                                                                                            |
| userId         | int      | → User                                                                                                                                                     |
| gameTemplateId | int      | → GameTemplate                                                                                                                                             |
| startTime      | datetime |                                                                                                                                                            |
| endTime        | datetime | nullable; null = active. A user has at most one active session                                                                                             |
| status         | string   | `in-progress`, `success` or `failure`. Fails once `failureCount` passes `allowedFailures`; succeeds once the ending is reported. Ending early is a failure |
| nextCallTime   | datetime | nullable; when the next operative calls. Null during a call and once the session has ended                                                                 |
| decisionNodeId | string   | The mission's current node in the template's decision tree; starts at its `startNodeId`                                                                    |
| failureCount   | int      | Default 0. Failed rolls so far, coin tosses included                                                                                                       |

| NpcSession    |          |                                                                                                |
|---------------|----------|------------------------------------------------------------------------------------------------|
| id            | int      |                                                                                                |
| gameSessionId | int      | → GameSession                                                                                  |
| npcTemplateId | int      | → NpcTemplate                                                                                  |
| callCount     | int      | Default 0. Calls made so far; the next caller has the fewest, so everyone calls once per round |
| lastCommsTime | datetime | nullable; when the handler last picked a challenge on this operative's call                    |

| NpcCall        |          |                                                                                                                                                                                                                  |
|----------------|----------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| id             | int      |                                                                                                                                                                                                                  |
| npcSessionId   | int      | → NpcSession                                                                                                                                                                                                     |
| conversationId | string   | nullable, unique; ElevenLabs conversation ID, set once the call is placed                                                                                                                                        |
| callSid        | string   | nullable; Twilio call SID, set once the call is placed                                                                                                                                                           |
| nodeId         | string   | The decision tree node the operative called about; an ending makes it the report call                                                                                                                            |
| startTime      | datetime |                                                                                                                                                                                                                  |
| endTime        | datetime | nullable; null = in progress                                                                                                                                                                                     |
| outcome        | string   | nullable until the call ends; completed, busy, no-answer, failed, timeout, or dry-run                                                                                                                            |
| summary        | string   | nullable; ElevenLabs transcript summary                                                                                                                                                                          |
| transcript     | json     | nullable; `[{role, message}]`                                                                                                                                                                                    |
| decision       | json     | nullable; the challenge picked on this call and its roll: `{challengeId, pickedBy, stat, statValue, roll, succeeded}`. `pickedBy` is `operative` for a coin toss. Set on every finished call about a choice node |

## API

| GameService |                         |                                 |                                                                                                                                                                                              |
|-------------|-------------------------|---------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| POST        | /api/login              | {username, password}            | The user. During development any password is accepted. 404 unknown username                                                                                                                  |
| POST        | /api/users              | {username, handle, phoneNumber} | 201 with the user. 400 bad body or non-E.164 phone number, 409 username or phone number taken                                                                                                |
| GET         | /api/users/:id/sessions |                                 | The user's sessions, newest first. 404 unknown user                                                                                                                                          |
| GET         | /api/scenarios          |                                 | Every game template as a `ScenarioSummary` (title, briefing, allowedFailures, operative dossiers); decision trees stay hidden                                                                |
| GET         | /api/sessions           |                                 | All sessions, newest first                                                                                                                                                                   |
| POST        | /api/sessions           | {userId, gameTemplateId}        | 201 with the session; creates NpcSessions and schedules first calls. 400 bad body, 404 unknown user/template, 409 user already has an active session                                         |
| GET         | /api/sessions/:id       |                                 | Session plus `title`, `operatives` (each one's `dossier` and `npcSession`) and `checkpoints` (one per call: situation, status, and the roll as soon as the call ends). 404 if not found |
| POST        | /api/sessions/:id/end   |                                 | Abandons the session: sets `endTime` and `status: failure`. 404 if no active session with that ID                                                                                            |
| GET         | /api/events             |                                 | SSE stream: `session.created`, `session.ended` (also when the session succeeds or fails), `npc.updated`, `call.updated`, plus a `ping` every 15s                                             |

| Webhooks |                                   |                             |                                                                                                                                       |
|----------|-----------------------------------|-----------------------------|---------------------------------------------------------------------------------------------------------------------------------------|
| POST     | /elevenlabs/tools/submit-decision | {npc_session_id, choice_id} | Agent server tool; rolls the picked challenge. 401 bad `X-Tool-Secret`. Game errors are 200 with `{error}` so the agent can read them |
| POST     | /elevenlabs/webhooks              | ElevenLabs webhook          | Post-call transcript or call initiation failure. 401 bad signature                                                                    |
