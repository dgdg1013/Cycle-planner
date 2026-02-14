import { GoalStatus, Work, WorkStatus } from '../types/models';

export const WORK_STATUS_LABEL: Record<WorkStatus, string> = {
  NOT_STARTED: '시작 전',
  IN_PROGRESS: '진행 중',
  DONE: '완료'
};

export const GOAL_STATUS_LABEL: Record<GoalStatus, string> = {
  NOT_STARTED: '시작 전',
  IN_PROGRESS: '진행 중',
  DONE: '완료'
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
