// Entity types shared between the Angular app and the server. Keep this file free of imports so
// it can be consumed by both sides. Datetimes are ISO-8601 strings, matching what goes over JSON.

export interface User {
  id: number;
  username: string;
  handle: string;
  /** E.164 format, e.g. +15555550100. Operatives call and text this number. */
  phoneNumber: string;
}

export interface GameTemplate {
  id: number;
  title: string;
  scenario: string;
  /**
   * ElevenLabs agent that plays every operative in this game, switching voice per operative. Null
   * until the agent is set up: calls are then logged instead of placed (dry run).
   */
  agentId: string | null;
  /** How many failed rolls the team can afford: the game is lost on the next one. */
  allowedFailures: number;
  decisionTree: DecisionTree;
}

export interface NpcTemplate {
  id: number;
  gameTemplateId: number;
  name: string;
  /**
   * How the operative talks and behaves. Given to the agent as `{{persona}}`, and shown to the
   * player as the dossier bio.
   */
  persona: string;
  /** ElevenLabs voice for this operative, overriding the agent's. Null = the agent's own voice. */
  voiceId: string | null;
  stats: Stats;
}

/**
 * What a challenge tests:
 * - stealth: sneaking unseen, pickpocketing, moving quietly
 * - charm: impersonation, persuasion, romancing
 * - muscle: fighting, lifting, climbing, jumping, swimming
 */
export type Stat = 'stealth' | 'charm' | 'muscle';

/** Each stat is 1 to 100: the chance, in percent, that the operative passes a challenge. */
export type Stats = Record<Stat, number>;

/** The player-facing summary of an operative, shown on the game session page. */
export interface Dossier {
  name: string;
  bio: string;
  stats: Stats;
}

/**
 * The mission's branching storyline, shared by the whole team. Each call, the calling operative
 * takes the current node and the handler picks one of its two challenges, which only decides the
 * odds: the operative rolls 1 to 100 against that challenge's stat, and the mission moves to the
 * node's success or failure child either way.
 *
 * It's a strict tree: every node except the start is reached from exactly one parent outcome, so
 * each briefing can say how the previous attempt went.
 */
export interface DecisionTree {
  startNodeId: string;
  nodes: Record<string, DecisionNode>;
}

export type DecisionNode = ChoiceNode | EndingNode;

/** A moment where the team needs the handler to pick a challenge. */
export interface ChoiceNode {
  type: 'choice';
  /**
   * Briefing for the agent, addressed to whichever operative is calling ("You're at..."): whether
   * the team's previous attempt succeeded or failed, what's happening now, and what they need from
   * the handler. The agent explains it in character.
   */
  situation: string;
  /** Two challenges testing different stats. */
  choices: [Challenge, Challenge];
  onSuccess: string;
  /** Omitted where failing would pass the scenario's `allowedFailures`, since the game ends. */
  onFailure?: string;
}

export interface Challenge {
  /** Short kebab-case ID the agent submits with the `submit_decision` tool. */
  id: string;
  /**
   * The order, as the handler might phrase it. Never names the stat: the player infers it from the
   * action (sneaking, talking, climbing...).
   */
  description: string;
  /** Hidden from the player and the agent. */
  stat: Stat;
}

/** The end of the mission. Reaching one wins the game, since too many failures would have ended it. */
export interface EndingNode {
  type: 'ending';
  /** What the next operative to call reports to the handler: how the mission wrapped up. */
  situation: string;
}

/**
 * A game session fails as soon as its failed rolls pass `allowedFailures`, and succeeds once the
 * mission's ending has been reported.
 */
export type SessionStatus = 'in-progress' | 'success' | 'failure';

export interface GameSession {
  id: number;
  userId: number;
  gameTemplateId: number;
  startTime: string;
  /** Null while the session is active. */
  endTime: string | null;
  status: SessionStatus;
  /**
   * When the next operative calls. Calls are one at a time per session, so this is null during a
   * call and after the session ends.
   */
  nextCallTime: string | null;
  /** The mission's current node in the template's decision tree. */
  decisionNodeId: string;
  /** Failed rolls so far, including coin tosses. The game is lost once this passes `allowedFailures`. */
  failureCount: number;
}

export interface NpcSession {
  id: number;
  gameSessionId: number;
  npcTemplateId: number;
  /**
   * Calls this operative has made. The next caller is picked from the operatives with the fewest,
   * so everyone calls once before anyone calls again.
   */
  callCount: number;
  /** When the player last made a decision on this operative's call. */
  lastCommsTime: string | null;
}

export type NpcCallOutcome =
  | 'completed'
  | 'busy'
  | 'no-answer'
  | 'failed'
  | 'timeout'
  /** No ElevenLabs credentials configured, so the call was only logged. */
  | 'dry-run';

/** One phone call from an operative to the player. */
export interface NpcCall {
  id: number;
  npcSessionId: number;
  /** ElevenLabs conversation ID, set once the call is placed. */
  conversationId: string | null;
  /** Twilio call SID, set once the call is placed. */
  callSid: string | null;
  /** The decision tree node the operative called about. An ending node makes this a report call. */
  nodeId: string;
  startTime: string;
  /** Null while the call is in progress. */
  endTime: string | null;
  outcome: NpcCallOutcome | null;
  summary: string | null;
  transcript: NpcCallTranscriptTurn[] | null;
  /**
   * The challenge picked on this call and how the roll went. Every call about a choice node ends
   * with one: if the handler didn't give an order, the operative picks by coin toss.
   */
  decision: ChallengeRoll | null;
}

export interface ChallengeRoll {
  challengeId: string;
  /** `operative` when the handler gave no order (missed call, or no clear decision). */
  pickedBy: 'handler' | 'operative';
  stat: Stat;
  /** The operative's stat at the time of the roll. */
  statValue: number;
  /** 1 to 100. The challenge succeeds if this is at most `statValue`. */
  roll: number;
  succeeded: boolean;
}

export interface NpcCallTranscriptTurn {
  role: 'agent' | 'user';
  message: string;
}

export interface GameSessionDetail extends GameSession {
  /** The game template's title. */
  title: string;
  operatives: { dossier: Dossier; npcSession: NpcSession }[];
  /** One per call so far, oldest first. */
  checkpoints: Checkpoint[];
}

/**
 * A call as the player sees it on the mission timeline. A roll's result stays hidden (`pending`)
 * until the next call starts or the game ends, since the next briefing is what reveals it.
 */
export interface Checkpoint {
  callId: number;
  npcSessionId: number;
  /** The briefing the operative gave on this call. */
  situation: string;
  /** `live` while the call is in progress. A call reporting the ending is `cleared` once over. */
  status: 'live' | 'pending' | 'cleared' | 'failed';
  /** The order and its roll, once revealed. */
  decision: ChallengeRoll | null;
  startTime: string;
}

/** A game template as shown on the mission list. The decision tree stays hidden. */
export interface ScenarioSummary {
  id: number;
  title: string;
  /** The mission briefing (`GameTemplate.scenario`). */
  briefing: string;
  allowedFailures: number;
  operatives: Dossier[];
}

/** During development, any password is accepted. */
export interface LoginRequest {
  username: string;
  password: string;
}

export interface CreateUserRequest {
  username: string;
  handle: string;
  /** E.164 format, e.g. +15555550100. */
  phoneNumber: string;
}

export interface CreateGameSessionRequest {
  userId: number;
  gameTemplateId: number;
}

/** Events pushed to the UI over Server-Sent Events at `/api/events`. */
export type ServerEvent =
  | { type: 'session.created'; session: GameSession }
  | { type: 'session.ended'; session: GameSession }
  | { type: 'npc.updated'; npcSession: NpcSession }
  | { type: 'call.updated'; call: NpcCall };
