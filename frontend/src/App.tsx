import { useEffect, useState } from 'react';
import { CalendarTab } from './components/CalendarTab';
import { CycleSelector } from './components/CycleSelector';
import { GoalListTab } from './components/GoalListTab';
import { TabBar } from './components/TabBar';
import { TodoTab } from './components/TodoTab';
import { AppIndex, CycleData, Goal, Task, Work, WorkStatus } from './types/models';
import { uid } from './utils/model';
import {
  closeDesktopWindow,
  createCycle,
  importCycle,
  isDesktopRuntime,
  loadCycleData,
  loadIndex,
  minimizeDesktopWindow,
  pickFolder,
  saveCycleData,
  selectCycle,
  startDesktopWindowDragging,
  toggleMaximizeDesktopWindow
} from './utils/storage';

const emptyIndex: AppIndex = {
  cycles: [],
  selectedCycleId: undefined
};

const emptyCycleData: CycleData = {
  id: '',
  name: '',
  createdAt: '',
  goals: [],
  works: [],
  tasks: []
};

function normalizeCycleData(cycleId: string, cycleData: CycleData): CycleData {
  return {
    ...cycleData,
    id: cycleId,
    goals: cycleData.goals.map((goal) => ({ ...goal, cycleId })),
    works: cycleData.works.map((work) => ({ ...work, cycleId })),
    tasks: cycleData.tasks.map((task) => ({ ...task, cycleId }))
  };
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = window.localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [index, setIndex] = useState<AppIndex>(emptyIndex);
  const [cycleData, setCycleData] = useState<CycleData>(emptyCycleData);
  const [tab, setTab] = useState<'goals' | 'calendar' | 'todo'>('goals');
  const [hideCompletedGoalTab, setHideCompletedGoalTab] = useState(false);
  const [hideCompletedTodoTab, setHideCompletedTodoTab] = useState(false);
  const [cycleParentDir, setCycleParentDir] = useState('');
  const [loading, setLoading] = useState(true);
  const isDesktop = isDesktopRuntime();

  const selectedCycleId = index.selectedCycleId;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const nextIndex = await loadIndex();
        setIndex(nextIndex);

        if (nextIndex.selectedCycleId) {
          const data = await loadCycleData(nextIndex.selectedCycleId);
          setCycleData(normalizeCycleData(nextIndex.selectedCycleId, data));
          const selectedCycle = nextIndex.cycles.find((cycle) => cycle.id === nextIndex.selectedCycleId);
          if (selectedCycle?.folderPath) {
            const split = selectedCycle.folderPath.replace(/\\/g, '/').split('/');
            split.pop();
            setCycleParentDir(split.join('/'));
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '초기 로딩 중 오류가 발생했습니다.';
        window.alert(message);
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, []);

  const createCycleWithFolder = async (name: string) => {
    const parentDir = cycleParentDir || await pickFolder();
    if (!parentDir) return;

    try {
      const nextIndex = await createCycle(name, parentDir);
      setIndex(nextIndex);
      setCycleParentDir(parentDir);

      const activeId = nextIndex.selectedCycleId ?? nextIndex.cycles[nextIndex.cycles.length - 1]?.id;
      if (!activeId) return;

      const data = await loadCycleData(activeId);
      setCycleData(normalizeCycleData(activeId, data));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cycle 생성에 실패했습니다.';
      window.alert(message);
    }
  };

  const chooseParentFolder = async () => {
    const picked = await pickFolder();
    if (picked) setCycleParentDir(picked);
  };

  const importCycleFromFolder = async () => {
    const folder = await pickFolder();
    if (!folder) return;

    try {
      const nextIndex = await importCycle(folder);
      setIndex(nextIndex);

      const selected = nextIndex.selectedCycleId;
      if (selected) {
        const data = await loadCycleData(selected);
        setCycleData(normalizeCycleData(selected, data));
      }

      const split = folder.replace(/\\/g, '/').split('/');
      split.pop();
      setCycleParentDir(split.join('/'));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cycle 불러오기에 실패했습니다.';
      window.alert(message);
    }
  };

  const onSelectCycle = async (cycleId: string) => {
    try {
      const nextIndex = await selectCycle(cycleId);
      setIndex(nextIndex);
      const data = await loadCycleData(cycleId);
      setCycleData(normalizeCycleData(cycleId, data));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cycle 변경에 실패했습니다.';
      window.alert(message);
    }
  };

  const persistCycleData = async (next: CycleData) => {
    const cycleId = index.selectedCycleId;
    if (!cycleId) return;
    setCycleData(next);
    await saveCycleData(cycleId, next);
  };

  const createGoal = async (payload: { title: string; startDate?: string; endDate?: string }) => {
    if (!selectedCycleId) return;
    const goal: Goal = { id: uid('goal'), cycleId: selectedCycleId, ...payload };
    await persistCycleData({ ...cycleData, goals: [...cycleData.goals, goal] });
  };

  const createWork = async (payload: { title: string; goalId?: string; startDate?: string; endDate?: string; body?: string; status?: WorkStatus }) => {
    if (!selectedCycleId) return;
    const work: Work = { id: uid('work'), cycleId: selectedCycleId, status: payload.status ?? 'NOT_STARTED', ...payload };
    await persistCycleData({ ...cycleData, works: [work, ...cycleData.works] });
  };

  const createTask = async (payload: { title: string; workId: string; dueDate?: string }) => {
    if (!selectedCycleId) return;
    const task: Task = { id: uid('task'), cycleId: selectedCycleId, done: false, ...payload };
    await persistCycleData({ ...cycleData, tasks: [...cycleData.tasks, task] });
  };

  const changeWorkStatus = async (workId: string, status: WorkStatus) => {
    await persistCycleData({
      ...cycleData,
      works: cycleData.works.map((work) => (work.id === workId ? { ...work, status } : work))
    });
  };

  const updateWork = async (workId: string, patch: Partial<Pick<Work, 'title' | 'status' | 'startDate' | 'endDate' | 'body'>>) => {
    await persistCycleData({
      ...cycleData,
      works: cycleData.works.map((work) => (work.id === workId ? { ...work, ...patch } : work))
    });
  };

  const toggleTaskDone = async (taskId: string) => {
    await persistCycleData({
      ...cycleData,
      tasks: cycleData.tasks.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task))
    });
  };

  const updateTask = async (taskId: string, patch: Partial<Pick<Task, 'title' | 'dueDate'>>) => {
    await persistCycleData({
      ...cycleData,
      tasks: cycleData.tasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task))
    });
  };

  const deleteTask = async (taskId: string) => {
    await persistCycleData({
      ...cycleData,
      tasks: cycleData.tasks.filter((task) => task.id !== taskId)
    });
  };

  const deleteWork = async (workId: string) => {
    await persistCycleData({
      ...cycleData,
      works: cycleData.works.filter((work) => work.id !== workId),
      tasks: cycleData.tasks.filter((task) => task.workId !== workId)
    });
  };

  const deleteGoal = async (goalId: string) => {
    const childWorkIds = new Set(cycleData.works.filter((work) => work.goalId === goalId).map((work) => work.id));
    await persistCycleData({
      ...cycleData,
      goals: cycleData.goals.filter((goal) => goal.id !== goalId),
      works: cycleData.works.filter((work) => work.goalId !== goalId),
      tasks: cycleData.tasks.filter((task) => !childWorkIds.has(task.workId))
    });
  };

  const hasCycle = index.cycles.length > 0 && Boolean(selectedCycleId);

  return (
    <div className={`app-shell ${isDesktop ? 'desktop-shell' : ''}`}>
      {isDesktop && (
        <div className="window-chrome">
          <div className="window-drag-region" onMouseDown={() => void startDesktopWindowDragging()} />
          <div className="window-controls">
            <button type="button" className="window-control-btn" onClick={() => void minimizeDesktopWindow()} aria-label="최소화">_</button>
            <button type="button" className="window-control-btn maximize" onClick={() => void toggleMaximizeDesktopWindow()} aria-label="최대화/복원">□</button>
            <button type="button" className="window-control-btn close" onClick={() => void closeDesktopWindow()} aria-label="닫기">x</button>
          </div>
        </div>
      )}

      <header className="top-bar">
        <div className="top-bar-head">
          <h1>Cycle</h1>
          <button
            type="button"
            className="theme-toggle"
            onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
            aria-label="테마 전환"
            title="라이트/다크 모드 전환"
          >
            {theme === 'light' ? 'Dark' : 'Light'}
          </button>
        </div>
        <CycleSelector
          cycles={index.cycles}
          selectedCycleId={selectedCycleId}
          onSelect={(cycleId) => void onSelectCycle(cycleId)}
          onCreate={(name) => void createCycleWithFolder(name)}
          parentDir={cycleParentDir}
          onPickParentDir={() => void chooseParentFolder()}
          onImportCycle={() => void importCycleFromFolder()}
        />
      </header>

      <main className="content">
        {loading && <p className="loading-state">데이터 로딩 중...</p>}
        {!loading && !hasCycle && <p className="empty-state">위에서 Cycle을 생성하거나 불러오세요.</p>}

        {hasCycle && tab === 'goals' && (
          <GoalListTab
            goals={cycleData.goals}
            works={cycleData.works}
            tasks={cycleData.tasks}
            hideCompleted={hideCompletedGoalTab}
            onHideCompletedChange={setHideCompletedGoalTab}
            onCreateGoal={(payload) => void createGoal(payload)}
            onCreateWork={(payload) => void createWork(payload)}
            onCreateTask={(payload) => void createTask(payload)}
            onChangeWorkStatus={(workId, status) => void changeWorkStatus(workId, status)}
            onUpdateWork={(workId, patch) => void updateWork(workId, patch)}
            onUpdateTask={(taskId, patch) => void updateTask(taskId, patch)}
            onToggleTask={(taskId) => void toggleTaskDone(taskId)}
            onDeleteGoal={(goalId) => void deleteGoal(goalId)}
            onDeleteWork={(workId) => void deleteWork(workId)}
            onDeleteTask={(taskId) => void deleteTask(taskId)}
          />
        )}

        {hasCycle && tab === 'calendar' && (
          <CalendarTab
            goals={cycleData.goals}
            works={cycleData.works}
            tasks={cycleData.tasks}
            onChangeWorkStatus={(workId, status) => void changeWorkStatus(workId, status)}
            onUpdateWork={(workId, patch) => void updateWork(workId, patch)}
            onToggleTask={(taskId) => void toggleTaskDone(taskId)}
            onCreateTask={(payload) => void createTask(payload)}
            onDeleteTask={(taskId) => void deleteTask(taskId)}
          />
        )}

        {hasCycle && tab === 'todo' && (
          <TodoTab
            works={cycleData.works}
            tasks={cycleData.tasks}
            hideCompleted={hideCompletedTodoTab}
            onHideCompletedChange={setHideCompletedTodoTab}
            onToggleTask={(taskId) => void toggleTaskDone(taskId)}
          />
        )}
      </main>

      <TabBar tab={tab} onChange={setTab} />
    </div>
  );
}
