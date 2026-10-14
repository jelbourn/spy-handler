import { Component, DestroyRef, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { Checkpoint, Stats } from '../../../../shared/models';
import { MissionService } from '../../services/mission.service';
import { UserService } from '../../services/user.service';

export interface Operative {
  /** The operative's `NpcSession` ID. */
  id: number;
  codename: string;
  bio: string;
  stats: Stats;
}

export interface CheckpointStep {
  id: string;
  title: string;
  operativeName: string;
  status: 'cleared' | 'failed' | 'active' | 'pending';
  situation: string;
}

@Component({
  selector: 'app-handler-dashboard',
  imports: [RouterLink],
  templateUrl: './handler-dashboard.html',
  styleUrl: './handler-dashboard.scss',
})
export class HandlerDashboardComponent {
  private readonly router = inject(Router);
  private readonly missionService = inject(MissionService);
  private readonly userService = inject(UserService);
  private readonly detail = this.missionService.sessionDetail;

  protected readonly missionClock = this.missionService.formattedElapsedTime;
  protected readonly isRunning = this.missionService.isRunning;
  protected readonly missionCodename = computed(() => this.detail()?.title.toUpperCase() ?? '');
  protected readonly missionStatus = computed(() => {
    switch (this.detail()?.status) {
      case 'success':
        return 'MISSION ACCOMPLISHED';
      case 'failure':
        return 'MISSION FAILED';
      default:
        return 'FREQUENCY ACTIVE';
    }
  });

  /** The operative currently on the phone with the player, if any. */
  private readonly callerId = computed(
    () => this.detail()?.checkpoints.find((checkpoint) => checkpoint.status === 'live')?.npcSessionId,
  );
  protected readonly isOnCall = computed(() => this.callerId() !== undefined);

  protected readonly operatives = computed<Operative[]>(
    () =>
      this.detail()?.operatives.map(({ dossier, npcSession }) => ({
        id: npcSession.id,
        codename: `OPERATIVE: ${dossier.name.toUpperCase()}`,
        bio: dossier.bio,
        stats: dossier.stats,
      })) ?? [],
  );

  protected readonly checkpoints = computed<CheckpointStep[]>(() => {
    const detail = this.detail();
    if (!detail) {
      return [];
    }
    const names = new Map(
      detail.operatives.map(({ dossier, npcSession }) => [npcSession.id, dossier.name.toUpperCase()]),
    );
    const steps = detail.checkpoints.map((checkpoint, i) =>
      toStep(checkpoint, i + 1, names.get(checkpoint.npcSessionId) ?? ''),
    );
    if (!detail.endTime && !detail.checkpoints.some((checkpoint) => checkpoint.status === 'live')) {
      steps.push({
        id: 'next',
        title: `CHECKPOINT ${steps.length + 1} // AWAITING NEXT TRANSMISSION`,
        operativeName: '—',
        status: 'pending',
        situation: 'CLASSIFIED // LEVEL 4',
      });
    }
    return steps;
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.missionService.stopPolling());
    void this.start();
  }

  /** Finds the user's active mission (e.g. after a reload) and starts polling it. */
  private async start(): Promise<void> {
    const user = this.userService.currentUser();
    if (!user) {
      await this.router.navigate(['/']);
      return;
    }
    if (!this.missionService.activeSession()) {
      await this.missionService.loadActiveSession(user.id);
    }
    if (!this.missionService.activeSession()) {
      await this.router.navigate(['/missions']);
      return;
    }
    this.missionService.startPolling();
  }

  protected isCalling(op: Operative): boolean {
    return this.callerId() === op.id;
  }

  protected async endMission(): Promise<void> {
    if (this.missionService.isRunning()) {
      await this.missionService.endMission();
    }
  }
}

function toStep(checkpoint: Checkpoint, number: number, operativeName: string): CheckpointStep {
  const { decision } = checkpoint;
  const order = decision
    ? `${decision.pickedBy === 'handler' ? 'ORDER' : 'NO ORDER, OPERATIVE CHOSE'}: ` +
      `${decision.challengeId.toUpperCase()} (ROLLED ${decision.roll} VS ` +
      `${decision.stat.toUpperCase()} ${decision.statValue})`
    : null;
  switch (checkpoint.status) {
    case 'live':
      return {
        id: String(checkpoint.callId),
        title: `CHECKPOINT ${number} // ON THE LINE`,
        operativeName,
        status: 'active',
        situation: checkpoint.situation,
      };
    default:
      return {
        id: String(checkpoint.callId),
        title: order ? `CHECKPOINT ${number} // ${order}` : `CHECKPOINT ${number} // MISSION REPORT`,
        operativeName,
        status: checkpoint.status,
        situation: checkpoint.situation,
      };
  }
}
