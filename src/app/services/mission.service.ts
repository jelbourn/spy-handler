import { Service, computed, signal } from '@angular/core';

export interface OperativePreview {
  codename: string;
  role: string;
  avatarSeed: string;
}

export interface MissionScenario {
  id: string;
  code: string;
  name: string;
  theater: string;
  year: string;
  threatLevel: 'DEFCON 3' | 'DEFCON 2' | 'DEFCON 1';
  briefing: string;
  intensity: string;
  operatives: OperativePreview[];
}

@Service()
export class MissionService {
  readonly scenarios = signal<MissionScenario[]>([
    {
      id: 'cold-breeze',
      code: 'SEC-ORD // 64-019',
      name: 'OPERATION: COLD BREEZE',
      theater: 'EAST BERLIN',
      year: '1964',
      threatLevel: 'DEFCON 2',
      briefing:
        'Infiltrate Stasi communications relay at Friedrichstraße. Intercept magnetic telemetry tape before 0200 curfew. Counter-surveillance is active.',
      intensity: 'HIGH // 2 CONCURRENT FIELD OPERATIVES',
      operatives: [
        { codename: 'FALCON', role: 'Infiltration / Locksmith', avatarSeed: 'falcon' },
        { codename: 'VIPER', role: 'Surveillance / Wiretap', avatarSeed: 'viper' },
      ],
    },
    {
      id: 'black-canary',
      code: 'SEC-ORD // 62-088',
      name: 'OPERATION: BLACK CANARY',
      theater: 'HAVANA SECTOR',
      year: '1962',
      threatLevel: 'DEFCON 1',
      briefing:
        'Secure naval freight manifest from port authority office. Intercept naval officer before transport arrives at guarded pier.',
      intensity: 'CRITICAL // 1 FIELD OPERATIVE',
      operatives: [
        { codename: 'ECHO', role: 'Counter-Intelligence', avatarSeed: 'echo' },
      ],
    },
    {
      id: 'iron-embassy',
      code: 'SEC-ORD // 65-104',
      name: 'OPERATION: IRON EMBASSY',
      theater: 'PRAGUE',
      year: '1965',
      threatLevel: 'DEFCON 3',
      briefing:
        'Diplomatic reception infiltration. Plant audio transmitter inside ambassadorial private study and retrieve cipher codebook.',
      intensity: 'MODERATE // 2 FIELD OPERATIVES',
      operatives: [
        { codename: 'SABLE', role: 'Social Engineering', avatarSeed: 'sable' },
        { codename: 'TALON', role: 'Extraction Specialist', avatarSeed: 'talon' },
      ],
    },
    {
      id: 'shadow-courier',
      code: 'SEC-ORD // 63-042',
      name: 'OPERATION: SHADOW COURIER',
      theater: 'VIENNA STATION',
      year: '1963',
      threatLevel: 'DEFCON 2',
      briefing:
        'Intercept defector contact at tram terminal. Verify authentic identity token before hostile tracking assets establish visual lock.',
      intensity: 'HIGH // 1 FIELD OPERATIVE',
      operatives: [
        { codename: 'RAVEN', role: 'Tactical Recon', avatarSeed: 'raven' },
      ],
    },
  ]);

  readonly selectedMissionId = signal<string>('cold-breeze');
  readonly activeMission = signal<MissionScenario | null>(null);

  readonly elapsedSeconds = signal<number>(0);
  readonly isRunning = signal<boolean>(false);

  private timerIntervalId: ReturnType<typeof setInterval> | null = null;

  readonly formattedElapsedTime = computed(() => {
    const totalSeconds = this.elapsedSeconds();
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  });

  selectMission(id: string): void {
    this.selectedMissionId.set(id);
  }

  startMission(mission: MissionScenario): void {
    this.selectedMissionId.set(mission.id);
    this.activeMission.set(mission);
    this.startTimer();
  }

  startTimer(): void {
    this.stopTimer();
    this.elapsedSeconds.set(0);
    this.isRunning.set(true);

    this.timerIntervalId = setInterval(() => {
      this.elapsedSeconds.update((seconds) => seconds + 1);
    }, 1000);
  }

  stopTimer(): void {
    if (this.timerIntervalId !== null) {
      clearInterval(this.timerIntervalId);
      this.timerIntervalId = null;
    }
    this.isRunning.set(false);
  }

  resetTimer(): void {
    this.stopTimer();
    this.elapsedSeconds.set(0);
  }
}
