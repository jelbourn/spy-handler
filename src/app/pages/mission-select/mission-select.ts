import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  MissionScenario,
  MissionService,
  OperativePreview,
} from '../../services/mission.service';
import { UserService } from '../../services/user.service';

export type { OperativePreview, MissionScenario };

@Component({
  selector: 'app-mission-select',
  imports: [RouterLink],
  templateUrl: './mission-select.html',
  styleUrl: './mission-select.scss',
})
export class MissionSelectComponent {
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);
  protected readonly missionService = inject(MissionService);

  protected readonly handlerCodename = computed(() => {
    const user = this.userService.currentUser();
    return user?.handle || user?.username || '';
  });

  protected readonly rawPhone = computed(
    () => this.userService.currentUser()?.phoneNumber?.trim() ?? '',
  );

  protected readonly revealPhone = signal(false);

  protected readonly dispatchPhone = computed(() => {
    const raw = this.rawPhone();
    if (!raw) return '';
    if (this.revealPhone()) {
      return raw;
    }
    return '[••••••••••]';
  });

  protected togglePhoneReveal(): void {
    this.revealPhone.update((v) => !v);
  }

  protected readonly scenarios = this.missionService.scenarios;
  protected readonly isRunning = this.missionService.isRunning;
  protected readonly activeMission = this.missionService.activeMission;
  protected readonly missionClock = this.missionService.formattedElapsedTime;
  protected readonly isLaunching = signal(false);
  protected readonly isEnding = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    const user = this.userService.currentUser();
    if (!user) {
      void this.router.navigate(['/']);
      return;
    }
    Promise.all([
      this.missionService.loadScenarios(),
      this.missionService.loadActiveSession(user.id),
    ]).catch(() => this.errorMessage.set('Could not reach the dispatch office.'));
    // Notice when the active mission ends, so the mission buttons unlock without a reload.
    this.missionService.watchActiveSession(user.id);
    inject(DestroyRef).onDestroy(() => this.missionService.stopWatching());
  }

  protected async signOut(): Promise<void> {
    this.missionService.reset();
    this.userService.signOut();
    await this.router.navigate(['/']);
  }

  protected async launchMission(scenario: MissionScenario): Promise<void> {
    const user = this.userService.currentUser();
    if (!user || this.isLaunching()) {
      return;
    }
    this.isLaunching.set(true);
    this.errorMessage.set(null);
    try {
      await this.missionService.startMission(scenario, user.id);
      await this.router.navigate(['/active-mission']);
    } catch (err: unknown) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Dispatch failed.');
    } finally {
      this.isLaunching.set(false);
    }
  }

  protected async abandonMission(): Promise<void> {
    if (this.isEnding()) {
      return;
    }
    this.isEnding.set(true);
    this.errorMessage.set(null);
    try {
      await this.missionService.endMission();
    } catch (err: unknown) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Could not abort mission.');
    } finally {
      this.isEnding.set(false);
    }
  }
}
