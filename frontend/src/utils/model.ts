import { GoalStatus, Work, WorkStatus } from '../types/models';

export const WORK_STATUS_LABEL: Record<WorkStatus, string> = {
  NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress',
  DONE: 'Done'
};

export const GOAL_STATUS_LABEL: Record<GoalStatus, string> = {
  NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress',
  DONE: 'Done'
};

export function computeGoalStatus(goalWorkList: Work[]): GoalStatus {
  if (goalWorkList.length === 0) return 'NOT_STARTED';
  if (goalWorkList.every((work) => work.status === 'NOT_STARTED')) return 'NOT_STARTED';
  if (goalWorkList.every((work) => work.status === 'DONE')) return 'DONE';
  return 'IN_PROGRESS';
}

export function computeGoalProgress(goalWorkList: Work[]): number {
  if (goalWorkList.length === 0) return 0;
  const doneCount = goalWorkList.filter((work) => work.status === 'DONE').length;
  return Math.round((doneCount / goalWorkList.length) * 100);
}

export function isCompletedGoal(goalWorkList: Work[]): boolean {
  return goalWorkList.length > 0 && goalWorkList.every((work) => work.status === 'DONE');
}

export function uid(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}
