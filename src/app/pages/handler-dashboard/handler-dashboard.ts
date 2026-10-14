import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { Checkpoint, Dossier, Stat } from '../../../../shared/models';
import { MissionService, topStat } from '../../services/mission.service';
import { UserService } from '../../services/user.service';

export interface Operative {
  /** The operative's `NpcSession` ID. */
  id: number;
  codename: string;
  bio: string;
  strengths: string[];
  weaknesses: string[];
}

export interface CheckpointStep {
  id: string;
  title: string;
  operativeName: string;
  status: 'cleared' | 'failed' | 'active' | 'pending';
  situation: string;
}

const STAT_SKILLS: Record<Stat, string> = {
  stealth: 'stealth (sneaking, moving unseen)',
  charm: 'charm (talking, persuasion, disguise)',
  muscle: 'muscle (climbing, lifting, physical feats)',
};

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
        ...describeStats(dossier),
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

  protected readonly inspectedOperative = signal<Operative | null>(null);

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

  protected inspectOperative(op: Operative): void {
    this.inspectedOperative.set(op);
  }

  protected closeDossier(): void {
    this.inspectedOperative.set(null);
  }

  protected async endMission(): Promise<void> {
    if (this.missionService.isRunning()) {
      await this.missionService.endMission();
    }
  }
}

/** Strengths and weaknesses from the operative's stats. */
function describeStats({ stats }: Dossier): Pick<Operative, 'strengths' | 'weaknesses'> {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const best = topStat(stats);
  for (const stat of Object.keys(stats) as Stat[]) {
    const value = stats[stat];
    if (stat === best || value >= 60) {
      strengths.push(`+ Excels at ${STAT_SKILLS[stat]}: ${value}%`);
    } else if (value > 40) {
      strengths.push(`+ Capable at ${STAT_SKILLS[stat]}: ${value}%`);
    } else {
      weaknesses.push(`! Weak at ${STAT_SKILLS[stat]}: ${value}%`);
    }
  }
  return { strengths, weaknesses };
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
    case 'pending':
      return {
        id: String(checkpoint.callId),
        title: `CHECKPOINT ${number} // ORDERS RECEIVED, AWAITING FIELD REPORT`,
        operativeName,
        status: 'pending',
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
