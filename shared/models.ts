// Entity types shared between the Angular app and the server. Keep this file free of imports so
// it can be consumed by both sides. Datetimes are ISO-8601 strings, matching what goes over JSON.

export interface User {
  id: number;
  username: string;
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
  decisionTree: DecisionTree;
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
 * An operative's branching storyline. On each call the handler picks one of two challenges. The
 * operative rolls 1 to 100 against the challenge's stat and moves to its success or failure node.
 */
export interface DecisionTree {
  startNodeId: string;
  nodes: Record<string, DecisionNode>;
}

export type DecisionNode = ChoiceNode | EndingNode;

/** A moment where the operative needs the handler to pick a challenge. */
export interface ChoiceNode {
  type: 'choice';
  /**
   * Briefing for the agent, addressed to the operative ("You're in..."): how the last attempt went,
   * what's happening now, and what they need from the handler. The agent explains it in character.
   */
  situation: string;
  /** Two challenges testing different stats. */
  choices: [Challenge, Challenge];
  /** Seconds after reaching this node before the operative calls. Defaults to 120. */
  callDelaySecs?: number;
  /** If the handler hasn't decided after this many calls, the operative acts on their own. */
  ifNoDecision?: { afterCalls: number; nextNodeId: string };
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
  onSuccess: string;
  onFailure: string;
}

/** The end of an operative's storyline. */
export interface EndingNode {
  type: 'ending';
  /** What the operative reports to the handler on their final call. */
  situation: string;
  result: 'success' | 'failure';
}

/**
 * An operative's status settles when their ending is reported to the handler. A game session fails
 * as soon as any operative fails, and succeeds once every operative has succeeded.
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
}

export interface NpcSession {
  id: number;
  gameSessionId: number;
  npcTemplateId: number;
  decisionNodeId: string;
  /** Calls in a row that ended without a decision; reset when the operative moves on. */
  callsWithoutDecision: number;
  /** When the player last made a decision for this operative. */
  lastCommsTime: string | null;
  /** When the operative will next call. Null during a call, and after the ending is reported. */
  deadline: string | null;
  status: SessionStatus;
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
  /** The challenge the handler picked on this call, if any, and how the roll went. */
  decision: ChallengeRoll | null;
}

export interface ChallengeRoll {
  challengeId: string;
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
  operatives: { dossier: Dossier; npcSession: NpcSession }[];
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
