// End-to-end test: plays a whole game of the first scenario against a real server, with
// `FakeElevenLabs` standing in for calls and the player. Twilio and ElevenLabs credentials are left
// unset, so nothing reaches either service (hang-ups are only logged).
//
// Run with `npm run test:e2e`. Uses its own database (kept for inspection) and port, so it can run
// next to `npm start`.
// There's no scheduler yet, so this script plays its part: it waits for each call to end, then has
// the next operative call right away instead of waiting for `nextCallTime`.

import { spawn, type ChildProcess } from 'node:child_process';
import type { GameSession, NpcCall, NpcSession } from '../../shared/models.ts';

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
const { pickNextCaller } = await import('../game/turn-order.ts');

const failures: string[] = [];
function check(condition: boolean, message: string): void {
  if (!condition) {
    failures.push(message);
    console.log(`  ✗ ${message}`);
  }
}

const server = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], {
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
  const names = new Map(
    db
      .select()
      .from(npcTemplates)
      .all()
      .map((npc) => [npc.id, npc.name]),
  );
  /** Calls per operative, counted here rather than trusted from `callCount`. */
  const callsMade = new Map<number, number>();

  for (let turn = 1; !getSession(gameSessionId).endTime; turn++) {
    const caller = pickNextCaller(gameSessionId);
    if (!caller) {
      check(false, 'No operative left to call, but the game has not ended');
      return;
    }
    checkTurnOrder(gameSessionId, caller, callsMade);
    callsMade.set(caller.id, (callsMade.get(caller.id) ?? 0) + 1);

    const call = await placeFakeCall(fake, caller);
    const finished = await waitForCallToEnd(call.id);
    const after = getNpcSession(caller.id);
    console.log(`${turn}. ${names.get(caller.npcTemplateId)} @ ${caller.decisionNodeId}`);
    console.log(`   ${describeResult(finished, after)}`);
    checkCall(caller, finished, after);
  }
}

/** Records a call and has the fake "place" it, like the scheduler will. */
async function placeFakeCall(fake: InstanceType<typeof FakeElevenLabs>, caller: NpcSession) {
  const { npc, game } = db
    .select({ npc: npcTemplates, game: gameTemplates })
    .from(npcTemplates)
    .innerJoin(gameTemplates, eq(npcTemplates.gameTemplateId, gameTemplates.id))
    .where(eq(npcTemplates.id, caller.npcTemplateId))
    .get()!;
  const node = getNode(npc.decisionTree, caller.decisionNodeId);
  const call = db
    .insert(npcCalls)
    .values({
      npcSessionId: caller.id,
      nodeId: caller.decisionNodeId,
      startTime: new Date().toISOString(),
    })
    .returning()
    .get();

  const placed = await fake.outboundCall({
    agentId: 'e2e-agent',
    agentPhoneNumberId: 'e2e-phone',
    toNumber: '+15555550100',
    conversationInitiationClientData: {
      dynamicVariables: {
        npc_name: npc.name,
        persona: npc.persona,
        scenario: game.scenario,
        situation: node.situation,
        choices:
          node.type === 'choice'
            ? node.choices.map((choice) => `- ${choice.id}: ${choice.description}`).join('\n')
            : '',
        npc_session_id: caller.id,
        npc_call_id: call.id,
      },
    },
  });
  db.update(npcCalls)
    .set({ conversationId: placed.conversationId, callSid: placed.callSid })
    .where(eq(npcCalls.id, call.id))
    .run();
  return call;
}

/** Everyone calls once before anyone calls again. */
function checkTurnOrder(gameSessionId: number, caller: NpcSession, callsMade: Map<number, number>) {
  const active = db
    .select()
    .from(npcSessions)
    .where(eq(npcSessions.gameSessionId, gameSessionId))
    .all()
    .filter((npcSession) => npcSession.status === 'in-progress');
  const fewest = Math.min(...active.map((npcSession) => callsMade.get(npcSession.id) ?? 0));
  check(
    (callsMade.get(caller.id) ?? 0) === fewest,
    `Operative ${caller.id} called again before everyone else had called`,
  );
}

/** A call about a choice settles it; a call about an ending settles the operative. */
function checkCall(before: NpcSession, call: NpcCall, after: NpcSession): void {
  const npc = db
    .select()
    .from(npcTemplates)
    .where(eq(npcTemplates.id, before.npcTemplateId))
    .get()!;
  const node = getNode(npc.decisionTree, before.decisionNodeId);
  check(call.outcome === 'completed', `Call ${call.id} ended as ${call.outcome}`);
  check(call.transcript !== null && call.summary !== null, `Call ${call.id} has no transcript`);
  if (node.type === 'ending') {
    check(after.status === node.result, `Operative ${before.id} should be ${node.result}`);
    return;
  }
  if (!call.decision) {
    check(false, `Call ${call.id} about "${before.decisionNodeId}" has no decision`);
    return;
  }
  const expected = call.decision.succeeded ? node.onSuccess : node.onFailure;
  check(
    after.decisionNodeId === expected,
    `Operative ${before.id} moved to "${after.decisionNodeId}", expected "${expected}"`,
  );
  check(
    call.decision.succeeded === call.decision.roll <= call.decision.statValue,
    `Call ${call.id}'s roll doesn't match its result`,
  );
}

/** Fails as soon as any operative fails, succeeds once all have succeeded. */
function checkGameOutcome(gameSessionId: number): void {
  const session = getSession(gameSessionId);
  const statuses = db
    .select()
    .from(npcSessions)
    .where(eq(npcSessions.gameSessionId, gameSessionId))
    .all()
    .map((npcSession) => npcSession.status);
  const expected = statuses.includes('failure') ? 'failure' : 'success';
  console.log(`\nGame ${session.status}; operatives: ${statuses.join(', ')}`);
  check(session.status === expected, `Game ended as ${session.status}, expected ${expected}`);
  check(session.nextCallTime === null, 'Ended game still has a next call scheduled');
  if (expected === 'success') {
    check(
      statuses.every((status) => status === 'success'),
      'Game succeeded before every operative did',
    );
  }
}

function describeResult(call: NpcCall, after: NpcSession): string {
  if (!call.decision) {
    return `reported ending: ${after.status}`;
  }
  const { pickedBy, challengeId, stat, statValue, roll, succeeded } = call.decision;
  return (
    `${pickedBy} picked ${challengeId} (${stat} ${statValue}, rolled ${roll}: ` +
    `${succeeded ? 'success' : 'failure'}) → ${after.decisionNodeId}`
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
