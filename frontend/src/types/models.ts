export type WorkStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE';
export type GoalStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE';

export interface Goal {
  id: string;
  cycleId: string;
  title: string;
  startDate?: string;
  endDate?: string;
}

export interface Work {
  id: string;
  cycleId: string;
  goalId?: string;
  title: string;
  status: WorkStatus;
  startDate?: string;
  endDate?: string;
  body?: string;
}

export interface Task {
  id: string;
  cycleId: string;
  workId: string;
  title: string;
  done: boolean;
  dueDate?: string;
}

export interface Cycle {
  id: string;
  name: string;
  createdAt: string;
  folderPath?: string;
}

export interface AppIndex {
  cycles: Cycle[];
  selectedCycleId?: string;
}

export interface CycleData {
  id: string;
  name: string;
  createdAt: string;
  goals: Goal[];
  works: Work[];
  tasks: Task[];
}
