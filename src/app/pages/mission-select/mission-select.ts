import { Component, computed, inject } from '@angular/core';
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
    return user?.handle || user?.username || 'FALCON-7';
  });

  protected readonly dispatchPhone = computed(() => {
    const user = this.userService.currentUser();
    return user?.phoneNumber || '+1 (555) 019-2834';
  });

  protected readonly selectedMissionId = this.missionService.selectedMissionId;
  protected readonly scenarios = this.missionService.scenarios;
  protected readonly isRunning = this.missionService.isRunning;
  protected readonly activeMission = this.missionService.activeMission;
  protected readonly missionClock = this.missionService.formattedElapsedTime;

  protected selectMission(id: string): void {
    this.missionService.selectMission(id);
  }

  protected launchMission(scenario: MissionScenario): void {
    this.missionService.startMission(scenario);
    this.router.navigate(['/active-mission']);
  }
}
