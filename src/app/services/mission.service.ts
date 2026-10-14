import { HttpClient } from '@angular/common/http';
import { Service, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type {
  GameSession,
  GameSessionDetail,
  ScenarioSummary,
  Stat,
  Stats,
} from '../../../shared/models';
import { apiErrorMessage } from './user.service';

export interface OperativePreview {
  codename: string;
  role: string;
  stats?: Stats;
}

/** A scenario as shown on a mission card. */
export interface MissionScenario {
  id: number;
  code: string;
  name: string;
  briefing: string;
  intensity: string;
  operatives: OperativePreview[];
}

/** How often the active mission is refreshed while its dashboard is open. */
const POLL_MS = 2_000;
/** How often other pages re-check whether the user has an active mission. */
const WATCH_MS = 5_000;

@Service()
export class MissionService {
  private readonly http = inject(HttpClient);

  readonly scenarios = signal<MissionScenario[]>([]);
  readonly selectedMissionId = signal<number | null>(null);

  /** The signed-in user's session that hasn't ended, if any. */
  readonly activeSession = signal<GameSession | null>(null);
  /** The active (or just-ended) session's details, refreshed while the dashboard polls. */
  readonly sessionDetail = signal<GameSessionDetail | null>(null);

  readonly isRunning = computed(() => {
    const session = this.activeSession();
    return session !== null && session.endTime === null;
  });
  readonly activeMission = computed(() => {
    const session = this.activeSession();
    return this.scenarios().find((scenario) => scenario.id === session?.gameTemplateId) ?? null;
  });

  /** Set when the last refresh couldn't reach the server, cleared when one succeeds. */
  readonly isOffline = signal(false);

  private readonly now = signal(Date.now());
  private pollIntervalId: ReturnType<typeof setInterval> | null = null;
  private watchIntervalId: ReturnType<typeof setInterval> | null = null;

  /** Time since the active session started, until it ends. */
  readonly formattedElapsedTime = computed(() => {
    const session = this.sessionDetail() ?? this.activeSession();
    if (!session) {
      return '00:00';
    }
    const end = session.endTime ? Date.parse(session.endTime) : this.now();
    const totalSeconds = Math.max(0, Math.floor((end - Date.parse(session.startTime)) / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  });

  constructor() {
    setInterval(() => this.now.set(Date.now()), 1000);
  }

  async loadScenarios(): Promise<void> {
    const summaries = await firstValueFrom(this.http.get<ScenarioSummary[]>('/api/scenarios'));
    this.scenarios.set(summaries.map(toMissionScenario));
    if (this.selectedMissionId() === null && summaries.length > 0) {
      this.selectedMissionId.set(summaries[0].id);
    }
  }

  /** Finds the user's session that hasn't ended, if any. */
  async loadActiveSession(userId: number): Promise<void> {
    const sessions = await this.loadUserSessions(userId);
    this.setActiveSession(sessions.find((session) => session.endTime === null) ?? null);
  }

  /**
   * Sets the active session from a list of the user's sessions, so pages that already loaded them
   * don't need another request.
   */
  setActiveSessionFrom(sessions: GameSession[]): void {
    this.setActiveSession(sessions.find((session) => session.endTime === null) ?? null);
  }

  /**
   * Re-checks the user's active session every few seconds, so pages without the dashboard's
   * polling notice when a mission ends (or starts in another tab).
   */
  watchActiveSession(userId: number): void {
    this.stopWatching();
    this.watchIntervalId = setInterval(() => {
      this.loadActiveSession(userId).then(
        () => this.isOffline.set(false),
        () => this.isOffline.set(true),
      );
    }, WATCH_MS);
  }

  stopWatching(): void {
    if (this.watchIntervalId !== null) {
      clearInterval(this.watchIntervalId);
      this.watchIntervalId = null;
    }
  }

  /** Forgets everything about the current user's missions, e.g. on sign-out. */
  reset(): void {
    this.stopPolling();
    this.stopWatching();
    this.activeSession.set(null);
    this.sessionDetail.set(null);
    this.isOffline.set(false);
  }

  private setActiveSession(session: GameSession | null): void {
    this.activeSession.set(session);
    // Don't show details from a different session (e.g. a previous user's).
    if (this.sessionDetail()?.id !== session?.id) {
      this.sessionDetail.set(null);
    }
  }

  /** Loads all sessions for a user, newest first. */
  async loadUserSessions(userId: number): Promise<GameSession[]> {
    return firstValueFrom(
      this.http.get<GameSession[]>(`/api/users/${userId}/sessions`),
    );
  }

  selectMission(id: number): void {
    this.selectedMissionId.set(id);
  }

  /** Starts a session through `POST /api/sessions`, which schedules the first call. */
  async startMission(scenario: MissionScenario, userId: number): Promise<GameSession> {
    this.selectedMissionId.set(scenario.id);
    try {
      const session = await firstValueFrom(
        this.http.post<GameSession>('/api/sessions', { userId, gameTemplateId: scenario.id }),
      );
      this.activeSession.set(session);
      this.sessionDetail.set(null);
      return session;
    } catch (err: unknown) {
      throw new Error(apiErrorMessage(err, 'Dispatch failed.'));
    }
  }

  /**
   * Aborts the active session through `POST /api/sessions/:id/end`; it counts as a failure. If the
   * server says the game already ended, the active session is reloaded instead of reporting an
   * error.
   */
  async endMission(): Promise<void> {
    const session = this.activeSession();
    if (!session) {
      return;
    }
    this.stopPolling();
    try {
      const ended = await firstValueFrom(
        this.http.post<GameSession>(`/api/sessions/${session.id}/end`, {}),
      );
      this.activeSession.set(ended);
    } catch (err: unknown) {
      await this.loadActiveSession(session.userId).catch(() => undefined);
      if (this.activeSession()?.id === session.id && this.isRunning()) {
        throw new Error(apiErrorMessage(err, 'Could not abort mission.'));
      }
    }
  }

  /** Refreshes the active session's details every couple of seconds until it ends. */
  startPolling(): void {
    this.stopPolling();
    void this.refreshDetail();
    this.pollIntervalId = setInterval(() => void this.refreshDetail(), POLL_MS);
  }

  stopPolling(): void {
    if (this.pollIntervalId !== null) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
  }

  private async refreshDetail(): Promise<void> {
    const session = this.activeSession();
    if (!session) {
      return;
    }
    let detail: GameSessionDetail;
    try {
      detail = await firstValueFrom(
        this.http.get<GameSessionDetail>(`/api/sessions/${session.id}`),
      );
    } catch {
      // Keep polling: the server may just be restarting.
      this.isOffline.set(true);
      return;
    }
    this.isOffline.set(false);
    this.sessionDetail.set(detail);
    if (detail.endTime) {
      this.activeSession.set(detail);
      this.stopPolling();
    }
  }
}

const STAT_ROLES: Record<Stat, string> = {
  stealth: 'Stealth Specialist',
  charm: 'Social Engineering',
  muscle: 'Climbing / Heavy Work',
};

/** An operative's strongest stat. */
export function topStat(stats: Stats): Stat {
  return (Object.keys(stats) as Stat[]).reduce((best, stat) =>
    stats[stat] > stats[best] ? stat : best,
  );
}

function toMissionScenario(summary: ScenarioSummary): MissionScenario {
  const count = summary.operatives.length;
  return {
    id: summary.id,
    code: `SEC-ORD // ${String(summary.id).padStart(3, '0')}`,
    name: summary.title.toUpperCase(),
    briefing: summary.briefing,
    intensity:
      `${count} FIELD OPERATIVE${count === 1 ? '' : 'S'} // ` +
      `${summary.allowedFailures} MISTAKE${summary.allowedFailures === 1 ? '' : 'S'} ALLOWED`,
    operatives: summary.operatives.map((operative) => ({
      codename: operative.name.toUpperCase(),
      role: STAT_ROLES[topStat(operative.stats)],
      stats: operative.stats,
    })),
  };
}
