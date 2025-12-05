export type SchedulePattern = "continuous" | "burst" | "scheduled";

interface ScheduleWindow {
  start: number;
  end: number;
}

export class Scheduler {
  private pattern: SchedulePattern;
  private burstInterval: number;
  private schedule: ScheduleWindow[];
  private burstActive = false;
  private burstTimer: ReturnType<typeof setInterval> | null = null;
  private startTime: number;

  constructor(
    pattern: SchedulePattern = "continuous",
    burstInterval = 5000,
    schedule: ScheduleWindow[] = [],
  ) {
    this.pattern = pattern;
    this.burstInterval = burstInterval;
    this.schedule = schedule;
    this.startTime = Date.now();
  }

  isActive(): boolean {
    switch (this.pattern) {
      case "continuous":
        return true;
      case "burst":
        return this.burstActive;
      case "scheduled":
        return this.isInScheduledWindow();
    }
  }

  start(): void {
    this.startTime = Date.now();
    if (this.pattern === "burst") {
      this.startBurstCycle();
    }
  }

  stop(): void {
    if (this.burstTimer) {
      clearInterval(this.burstTimer);
      this.burstTimer = null;
    }
    this.burstActive = false;
  }

  setPattern(pattern: SchedulePattern): void {
    this.stop();
    this.pattern = pattern;
    if (pattern === "burst") {
      this.startBurstCycle();
    }
  }

  private startBurstCycle(): void {
    this.burstActive = true;
    this.burstTimer = setInterval(() => {
      this.burstActive = !this.burstActive;
    }, this.burstInterval);
  }

  private isInScheduledWindow(): boolean {
    const elapsed = Date.now() - this.startTime;
    return this.schedule.some((w) => elapsed >= w.start && elapsed <= w.end);
  }
}
