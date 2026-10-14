// End-to-end test: plays a whole game of the first scenario against a real server, with
// `FakeElevenLabs` standing in for calls and the player. Twilio and ElevenLabs credentials are left
// unset, so nothing reaches either service (hang-ups are only logged).
//
// Run with `npm run test:e2e`. Uses its own database (kept for inspection) and port, so it can run
// next to `npm start`.
// The server runs with `--fake-services --no-scheduler`, and this script plays the scheduler's
// part with `placeNextCall`: it waits for each call to end, then places the next one right away
// instead of waiting for `nextCallTime`.

import { spawn, type ChildProcess } from 'node:child_process';
import type {
  GameSession,
  GameTemplate,
  NpcCall,
  NpcSession,
  NpcTemplate,
} from '../../shared/models.ts';

const PORT = '3100';
const DB_PATH = 'data/e2e.db';
const CALL_TIMEOUT_MS = 15_000;

// Set before importing server modules, which read them when loaded.
Object.assign(process.env, {
  PORT,
  DB_PATH,
  ELEVENLABS_TOOL_SECRET: 'e2e-tool-secret',
  ELEVENLABS_WEBHOOK_SECRET: 'e2e-webhook-secret',
});
for (const name of ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'ELEVENLABS_API_KEY']) {
  delete process.env[name];
}

// Reset before opening the database: the reset deletes the file.
await runNode('server/db/reset.ts');

const { eq } = await import('drizzle-orm');
const { db } = await import('../db/index.ts');
const { gameSessions, gameTemplates, npcCalls, npcSessions, npcTemplates } =
  await import('../db/schema.ts');
const { FakeElevenLabs } = await import('../elevenlabs/fake-elevenlabs.ts');
const { getNode } = await import('../game/decision-tree.ts');
const { placeNextCall } = await import('../game/calls.ts');

const failures: string[] = [];
function check(condition: boolean, message: string): void {
  if (!condition) {
    failures.push(message);
    console.log(`  ✗ ${message}`);
  }
}

// The test places calls itself, so the server's scheduler stays off.
const serverArgs = ['--import', 'tsx', 'server/index.ts', '--fake-services', '--no-scheduler'];
const server = spawn(process.execPath, serverArgs, {
  env: process.env,
  stdio: ['ignore', 'ignore', 'inherit'],
});
try {
  await waitForServer();
  const session = await startSession();
  console.log(`Started game session ${session.id}\n`);
  await playGame(session.id);
  checkGameOutcome(session.id);
} finally {
  server.kill();
}

if (failures.length > 0) {
  console.log(`\nFAILED: ${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('\nPASSED');

/** Places calls until the game ends, checking each one. */
async function playGame(gameSessionId: number): Promise<void> {
  const fake = new FakeElevenLabs({ decisionDelayMs: 200, hangUpDelayMs: 100 });
  /** Calls per operative, counted here rather than trusted from `callCount`. */
  const callsMade = new Map<number, number>();

  for (let turn = 1; !getSession(gameSessionId).endTime; turn++) {
    const before = getSession(gameSessionId);
    const call = await placeNextCall(gameSessionId, fake);
    if (!call) {
      check(false, 'No operative to call, but the game has not ended');
      return;
    }
    const caller = getNpcSession(call.npcSessionId);
    checkTurnOrder(gameSessionId, caller, callsMade);
    callsMade.set(caller.id, (callsMade.get(caller.id) ?? 0) + 1);

    const finished = await waitForCallToEnd(call.id);
    const after = getSession(gameSessionId);
    console.log(`${turn}. ${getOperative(caller).name} @ ${before.decisionNodeId}`);
    console.log(`   ${describeResult(finished, after)}`);
    checkCall(caller, before, finished, after);
  }
}

/** Everyone calls once before anyone calls again. */
function checkTurnOrder(gameSessionId: number, caller: NpcSession, callsMade: Map<number, number>) {
  const operatives = db
    .select()
    .from(npcSessions)
    .where(eq(npcSessions.gameSessionId, gameSessionId))
    .all();
  const fewest = Math.min(...operatives.map((npcSession) => callsMade.get(npcSession.id) ?? 0));
  check(
    (callsMade.get(caller.id) ?? 0) === fewest,
    `Operative ${caller.id} called again before everyone else had called`,
  );
}

/**
 * A call about a choice rolls the caller's stat and moves the mission on, or counts a failure,
 * which may lose the game. A call about the ending wins it.
 */
function checkCall(caller: NpcSession, before: GameSession, call: NpcCall, after: GameSession) {
  const template = getTemplate(before);
  const node = getNode(template.decisionTree, before.decisionNodeId);
  check(call.outcome === 'completed', `Call ${call.id} ended as ${call.outcome}`);
  check(call.transcript !== null && call.summary !== null, `Call ${call.id} has no transcript`);
  if (node.type === 'ending') {
    check(after.status === 'success', `Reporting the ending should win, not ${after.status}`);
    return;
  }
  if (!call.decision) {
    check(false, `Call ${call.id} about "${before.decisionNodeId}" has no decision`);
    return;
  }

  const { stat, statValue, roll, succeeded } = call.decision;
  check(
    statValue === getOperative(caller).stats[stat],
    `Call ${call.id} rolled against ${statValue} ${stat}, not the caller's`,
  );
  check(succeeded === roll <= statValue, `Call ${call.id}'s roll doesn't match its result`);
  if (succeeded) {
    check(after.failureCount === before.failureCount, `A success counted as a failure`);
    check(
      after.decisionNodeId === node.onSuccess,
      `Mission moved to "${after.decisionNodeId}", expected "${node.onSuccess}"`,
    );
  } else if (after.failureCount > template.allowedFailures) {
    check(after.status === 'failure', `Game should be lost after ${after.failureCount} failures`);
  } else {
    check(after.failureCount === before.failureCount + 1, `A failure wasn't counted`);
    check(
      after.decisionNodeId === node.onFailure,
      `Mission moved to "${after.decisionNodeId}", expected "${node.onFailure}"`,
    );
  }
}

/** Lost exactly when failures pass `allowedFailures`, otherwise won at the ending. */
function checkGameOutcome(gameSessionId: number): void {
  const session = getSession(gameSessionId);
  const { allowedFailures, decisionTree } = getTemplate(session);
  console.log(
    `\nGame ${session.status} with ${session.failureCount} failure(s), ${allowedFailures} allowed`,
  );
  check(session.nextCallTime === null, 'Ended game still has a next call scheduled');
  if (session.status === 'failure') {
    check(
      session.failureCount === allowedFailures + 1,
      `Game lost with ${session.failureCount} failure(s), ${allowedFailures} allowed`,
    );
  } else {
    check(session.failureCount <= allowedFailures, 'Game won despite too many failures');
    check(
      getNode(decisionTree, session.decisionNodeId).type === 'ending',
      `Game won at "${session.decisionNodeId}", which isn't an ending`,
    );
  }
}

function describeResult(call: NpcCall, after: GameSession): string {
  if (!call.decision) {
    return `reported the ending: game ${after.status}`;
  }
  const { pickedBy, challengeId, stat, statValue, roll, succeeded } = call.decision;
  return (
    `${pickedBy} picked ${challengeId} (${stat} ${statValue}, rolled ${roll}: ` +
    `${succeeded ? 'success' : 'failure'}) → ` +
    (after.endTime ? `game ${after.status}` : after.decisionNodeId)
  );
}

async function startSession(): Promise<GameSession> {
  const response = await fetch(`http://localhost:${PORT}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 1, gameTemplateId: 1 }),
  });
  if (response.status !== 201) {
    throw new Error(`Couldn't start a session: ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as GameSession;
}

async function waitForCallToEnd(callId: number): Promise<NpcCall> {
  const deadline = Date.now() + CALL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const call = db.select().from(npcCalls).where(eq(npcCalls.id, callId)).get()!;
    if (call.endTime) {
      return call;
    }
    await sleep(50);
  }
  throw new Error(`Call ${callId} didn't end within ${CALL_TIMEOUT_MS / 1000} seconds`);
}

async function waitForServer(): Promise<void> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      await fetch(`http://localhost:${PORT}/api/sessions`);
      return;
    } catch {
      await sleep(100);
    }
  }
  throw new Error(`Server didn't start on port ${PORT}`);
}

function getSession(id: number): GameSession {
  return db.select().from(gameSessions).where(eq(gameSessions.id, id)).get()!;
}

function getNpcSession(id: number): NpcSession {
  return db.select().from(npcSessions).where(eq(npcSessions.id, id)).get()!;
}

function getOperative(npcSession: NpcSession): NpcTemplate {
  return db.select().from(npcTemplates).where(eq(npcTemplates.id, npcSession.npcTemplateId)).get()!;
}

function getTemplate(session: GameSession): GameTemplate {
  return db.select().from(gameTemplates).where(eq(gameTemplates.id, session.gameTemplateId)).get()!;
}

function runNode(script: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child: ChildProcess = spawn(process.execPath, ['--import', 'tsx', script], {
      env: process.env,
      stdio: ['ignore', 'ignore', 'inherit'],
    });
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`${script} exited with ${code}`)),
    );
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
