import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UserService } from '../../services/user.service';
import { MissionService } from '../../services/mission.service';
import type { GameSession } from '../../../../shared/models';

export interface HistoryEntry {
  session: GameSession;
  missionName: string;
  formattedDate: string;
  outcomeClass: 'success' | 'failure' | 'in-progress';
  outcomeLabel: string;
}

@Component({
  selector: 'app-mission-history',
  imports: [RouterLink],
  templateUrl: './mission-history.html',
  styleUrl: './mission-history.scss',
})
export class MissionHistoryComponent {
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);
  protected readonly missionService = inject(MissionService);

  protected readonly isLoading = signal(true);
  protected readonly sessions = signal<GameSession[]>([]);

  protected readonly handlerCodename = computed(() => {
    const user = this.userService.currentUser();
    return user?.handle || user?.username || '';
  });

  protected readonly isRunning = this.missionService.isRunning;

  protected readonly historyEntries = computed<HistoryEntry[]>(() => {
    const scenarios = this.missionService.scenarios();
    return this.sessions().map((session) => {
      const scenario = scenarios.find((s) => s.id === session.gameTemplateId);
      const missionName = scenario?.name ?? `OPERATION // ID ${session.gameTemplateId}`;

      let outcomeClass: 'success' | 'failure' | 'in-progress' = 'failure';
      let outcomeLabel = '[ COMPROMISED // FAILED ]';

      if (session.status === 'success') {
        outcomeClass = 'success';
        outcomeLabel = '[ ACCOMPLISHED // CLEARED ]';
      } else if (session.status === 'in-progress' && !session.endTime) {
        outcomeClass = 'in-progress';
        outcomeLabel = '[ ACTIVE // FREQUENCY ENGAGED ]';
      } else if (session.status === 'failure' && session.endTime) {
        outcomeClass = 'failure';
        outcomeLabel = '[ ABORTED / COMPROMISED ]';
      }

      const dateObj = new Date(session.startTime);
      const formattedDate = !isNaN(dateObj.getTime())
        ? `${dateObj.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }).toUpperCase()} // ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} HRS`
        : session.startTime;

      return {
        session,
        missionName,
        formattedDate,
        outcomeClass,
        outcomeLabel,
      };
    });
  });

  constructor() {
    const user = this.userService.currentUser();
    if (!user) {
      void this.router.navigate(['/']);
      return;
    }

    void this.loadHistory(user.id);
    this.missionService.watchActiveSession(user.id);
    inject(DestroyRef).onDestroy(() => this.missionService.stopWatching());
  }

  protected async signOut(): Promise<void> {
    this.missionService.reset();
    this.userService.signOut();
    await this.router.navigate(['/']);
  }

  private async loadHistory(userId: number): Promise<void> {
    this.isLoading.set(true);
    try {
      if (this.missionService.scenarios().length === 0) {
        await this.missionService.loadScenarios();
      }
      const userSessions = await this.missionService.loadUserSessions(userId);
      this.sessions.set(userSessions);
      this.missionService.setActiveSessionFrom(userSessions);
    } catch {
      this.sessions.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }
}
