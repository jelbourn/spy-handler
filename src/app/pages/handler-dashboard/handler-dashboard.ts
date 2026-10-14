import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MissionService } from '../../services/mission.service';

export interface Operative {
  id: string;
  codename: string;
  role: string;
  strengths: string[];
  weaknesses: string[];
}

export interface CheckpointStep {
  id: string;
  title: string;
  operativeName: string;
  status: 'cleared' | 'active' | 'pending';
  situation: string;
  handlerIntel: string;
}

@Component({
  selector: 'app-handler-dashboard',
  imports: [RouterLink],
  templateUrl: './handler-dashboard.html',
  styleUrl: './handler-dashboard.scss',
})
export class HandlerDashboardComponent {
  private readonly missionService = inject(MissionService);

  protected readonly missionClock = this.missionService.formattedElapsedTime;
  protected readonly missionCodename = signal('OPERATION: COLD BREEZE');

  // Green light indicator: true only when the handler is on a call
  protected readonly isOnCall = signal(false);

  protected readonly inspectedOperative = signal<Operative | null>(null);
  protected readonly showIntelFor = signal<Record<string, boolean>>({});

  protected readonly operatives = signal<Operative[]>([
    {
      id: 'falcon',
      codename: 'OPERATIVE: FALCON',
      role: 'Infiltration / Locksmith',
      strengths: ['+ Master locksmith', '+ Fluent in German', '+ Calm under surveillance'],
      weaknesses: ['! Impulsive under direct fire', '! Limited extraction window'],
    },
    {
      id: 'viper',
      codename: 'OPERATIVE: VIPER',
      role: 'Surveillance / Wiretap',
      strengths: ['+ Radio frequency intercept', '+ Silent reconnaissance'],
      weaknesses: ['! Vulnerable in close-quarters firearm engagements'],
    },
  ]);

  protected readonly checkpoints = signal<CheckpointStep[]>([
    {
      id: 'chk-1',
      title: 'CHECKPOINT 1 // PERIMETER SECURED',
      operativeName: 'FALCON',
      status: 'cleared',
      situation: 'Avoided exterior spotlight patrol. Picked gate padlock.',
      handlerIntel: 'Gate guards change shifts on the half-hour.',
    },
    {
      id: 'chk-2',
      title: 'CHECKPOINT 2 // COMMUNICATIONS RELAY (LIVE)',
      operativeName: 'FALCON',
      status: 'active',
      situation: 'Stasi relay located. Safe has mercury tilt sensor. Needs bypass protocol.',
      handlerIntel: 'Safe code series begins with reverse port code [9-4-1]. Do NOT sever green wire.',
    },
    {
      id: 'chk-3',
      title: 'CHECKPOINT 3 // EXTRACTION POINT',
      operativeName: 'FALCON',
      status: 'pending',
      situation: 'Rendezvous at tram terminal with courier.',
      handlerIntel: 'Recognition signal: flash pocket torch three times.',
    },
  ]);

  constructor() {
    const active = this.missionService.activeMission();
    if (active) {
      this.missionCodename.set(active.name);
    }
  }

  /**
   * Stub to connect to a backend service (e.g. SSE /api/events or WebSocket)
   * that toggles or updates whether the handler is currently on a live call.
   */
  protected toggleCallStatus(active?: boolean): void {
    // TODO: Connect to backend service (e.g. gameSessionService.callUpdates$ or SSE)
    this.isOnCall.update((current) => (active !== undefined ? active : !current));
  }

  protected inspectOperative(op: Operative): void {
    this.inspectedOperative.set(op);
  }

  protected closeDossier(): void {
    this.inspectedOperative.set(null);
  }

  protected toggleIntel(checkpointId: string): void {
    this.showIntelFor.update((current) => ({
      ...current,
      [checkpointId]: !current[checkpointId],
    }));
  }

  protected endMission(): void {
    this.missionService.stopTimer();
  }
}
