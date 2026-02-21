import { useEffect, useRef, useState } from 'react';
import { CalendarTab } from './components/CalendarTab';
import { CycleSelector } from './components/CycleSelector';
import { DesktopWindowChrome } from './components/DesktopWindowChrome';
import { GoalListTab } from './components/GoalListTab';
import { TabBar } from './components/TabBar';
import { TodoTab } from './components/TodoTab';
import { AppIndex, CycleData, Goal, Task, Work, WorkStatus } from './types/models';
import { uid } from './utils/model';
import {
  closeDesktopWindow,
  createCycle,
  getDesktopAlwaysOnTopState,
  getDesktopCalendarModeState,
  getDesktopWindowOpacity,
  getDesktopPostItModeState,
  importCycle,
  isDesktopRuntime,
  loadCycleData,
  loadIndex,
  minimizeDesktopWindow,
  pickFolder,
  saveCycleData,
  selectCycle,
  startDesktopWindowDragging,
  setDesktopWindowOpacity,
  toggleDesktopAlwaysOnTop,
  toggleDesktopCalendarMode,
  toggleDesktopPostItMode,
  toggleMaximizeDesktopWindow
} from './utils/storage';

type AppTab = 'goals' | 'calendar' | 'todo';

const WINDOW_OPACITY_MIN = 0.5;
const WINDOW_OPACITY_MAX = 1;

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

function parentDirFromPath(path: string): string {
  const split = path.replace(/\\/g, '/').split('/');
  split.pop();
  return split.join('/');
}

function normalizeCycleData(cycleId: string, cycleData: CycleData): CycleData {
  return {
    ...cycleData,
    id: cycleId,
    goals: cycleData.goals.map((goal) => ({ ...goal, cycleId })),
    works: cycleData.works.map((work) => ({ ...work, cycleId })),
    tasks: cycleData.tasks.map((task) => ({ ...task, cycleId }))
  };
}

function clampWindowOpacity(opacity: number): number {
  return Math.min(WINDOW_OPACITY_MAX, Math.max(WINDOW_OPACITY_MIN, opacity));
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = window.localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [index, setIndex] = useState<AppIndex>(emptyIndex);
  const [cycleData, setCycleData] = useState<CycleData>(emptyCycleData);
  const [tab, setTab] = useState<AppTab>('goals');
  const [hideCompletedGoalTab, setHideCompletedGoalTab] = useState(false);
  const [hideCompletedTodoTab, setHideCompletedTodoTab] = useState(false);
  const [cycleParentDir, setCycleParentDir] = useState('');
  const [loading, setLoading] = useState(true);
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);
  const [postItMode, setPostItMode] = useState(false);
  const [calendarMode, setCalendarMode] = useState(false);
  const [windowOpacity, setWindowOpacity] = useState(1);
  const [opacityPanelOpen, setOpacityPanelOpen] = useState(false);
  const opacityPanelRef = useRef<HTMLDivElement>(null);
  const isDesktop = isDesktopRuntime();

  const selectedCycleId = index.selectedCycleId;
  const selectedCycleName = index.cycles.find((cycle) => cycle.id === selectedCycleId)?.name;

  const runWithErrorAlert = async (fallbackMessage: string, task: () => Promise<void>) => {
    try {
      await task();
    } catch (error) {
      showError(error, fallbackMessage);
    }
  };

  const showError = (error: unknown, fallbackMessage: string) => {
    const message = error instanceof Error ? error.message : fallbackMessage;
    window.alert(message);
  };

  const loadAndSetCycle = async (cycleId: string) => {
    const data = await loadCycleData(cycleId);
    setCycleData(normalizeCycleData(cycleId, data));
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!isDesktop) return;
    const syncDesktopWindowState = async () => {
      try {
        const [pinState, postItState, calendarState, opacityState] = await Promise.all([
          getDesktopAlwaysOnTopState(),
          getDesktopPostItModeState(),
          getDesktopCalendarModeState(),
          getDesktopWindowOpacity()
        ]);
        setAlwaysOnTop(pinState);
        setPostItMode(postItState);
        setCalendarMode(calendarState);
        setWindowOpacity(clampWindowOpacity(opacityState));
      } catch {
        setAlwaysOnTop(false);
        setPostItMode(false);
        setCalendarMode(false);
        setWindowOpacity(WINDOW_OPACITY_MAX);
      }
    };
    void syncDesktopWindowState();
  }, [isDesktop]);

  useEffect(() => {
    if (!opacityPanelOpen) return;
    const onDocMouseDown = (event: MouseEvent) => {
      if (!opacityPanelRef.current) return;
      if (opacityPanelRef.current.contains(event.target as Node)) return;
      setOpacityPanelOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [opacityPanelOpen]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const nextIndex = await loadIndex();
        setIndex(nextIndex);

        if (nextIndex.selectedCycleId) {
          await loadAndSetCycle(nextIndex.selectedCycleId);
          const selectedCycle = nextIndex.cycles.find((cycle) => cycle.id === nextIndex.selectedCycleId);
          if (selectedCycle?.folderPath) {
            setCycleParentDir(parentDirFromPath(selectedCycle.folderPath));
          }
        }
      } catch (error) {
        showError(error, 'An error occurred during initial loading.');
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, []);

  const createCycleWithFolder = async (name: string) => {
    const parentDir = cycleParentDir || await pickFolder();
    if (!parentDir) return;

    await runWithErrorAlert('Failed to create Cycle.', async () => {
      const nextIndex = await createCycle(name, parentDir);
      setIndex(nextIndex);
      setCycleParentDir(parentDir);

      const activeId = nextIndex.selectedCycleId ?? nextIndex.cycles[nextIndex.cycles.length - 1]?.id;
      if (!activeId) return;
      await loadAndSetCycle(activeId);
    });
  };

  const chooseParentFolder = async () => {
    const picked = await pickFolder();
    if (picked) setCycleParentDir(picked);
  };

  const importCycleFromFolder = async () => {
    const folder = await pickFolder();
    if (!folder) return;

    await runWithErrorAlert('Failed to import Cycle.', async () => {
      const nextIndex = await importCycle(folder);
      setIndex(nextIndex);

      const selected = nextIndex.selectedCycleId;
      if (selected) {
        await loadAndSetCycle(selected);
      }
      setCycleParentDir(parentDirFromPath(folder));
    });
  };

  const onSelectCycle = async (cycleId: string) => {
    await runWithErrorAlert('Failed to switch Cycle.', async () => {
      const nextIndex = await selectCycle(cycleId);
      setIndex(nextIndex);
      await loadAndSetCycle(cycleId);
    });
  };

  const persistCycleData = async (next: CycleData) => {
    const cycleId = index.selectedCycleId;
    if (!cycleId) return;
    setCycleData(next);
    await saveCycleData(cycleId, next);
  };

  const applyCycleDataUpdate = async (updater: (data: CycleData) => CycleData) => {
    await persistCycleData(updater(cycleData));
  };

  const createGoal = async (payload: { title: string; startDate?: string; endDate?: string }) => {
    if (!selectedCycleId) return;
    const goal: Goal = { id: uid('goal'), cycleId: selectedCycleId, ...payload };
    await applyCycleDataUpdate((data) => ({ ...data, goals: [...data.goals, goal] }));
  };

  const createWork = async (payload: { title: string; goalId?: string; startDate?: string; endDate?: string; body?: string; status?: WorkStatus }) => {
    if (!selectedCycleId) return;
    const work: Work = { id: uid('work'), cycleId: selectedCycleId, status: payload.status ?? 'NOT_STARTED', ...payload };
    await applyCycleDataUpdate((data) => ({ ...data, works: [work, ...data.works] }));
  };

  const createTask = async (payload: { title: string; workId: string; dueDate?: string }) => {
    if (!selectedCycleId) return;
    const task: Task = { id: uid('task'), cycleId: selectedCycleId, done: false, ...payload };
    await applyCycleDataUpdate((data) => ({ ...data, tasks: [...data.tasks, task] }));
  };

  const changeWorkStatus = async (workId: string, status: WorkStatus) => {
    await applyCycleDataUpdate((data) => ({
      ...data,
      works: data.works.map((work) => (work.id === workId ? { ...work, status } : work))
    }));
  };

  const updateWork = async (workId: string, patch: Partial<Pick<Work, 'title' | 'status' | 'startDate' | 'endDate' | 'body'>>) => {
    await applyCycleDataUpdate((data) => ({
      ...data,
      works: data.works.map((work) => (work.id === workId ? { ...work, ...patch } : work))
    }));
  };

  const toggleTaskDone = async (taskId: string) => {
    await applyCycleDataUpdate((data) => ({
      ...data,
      tasks: data.tasks.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task))
    }));
  };

  const updateTask = async (taskId: string, patch: Partial<Pick<Task, 'title' | 'dueDate'>>) => {
    await applyCycleDataUpdate((data) => ({
      ...data,
      tasks: data.tasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task))
    }));
  };

  const deleteTask = async (taskId: string) => {
    await applyCycleDataUpdate((data) => ({
      ...data,
      tasks: data.tasks.filter((task) => task.id !== taskId)
    }));
  };

  const deleteWork = async (workId: string) => {
    await applyCycleDataUpdate((data) => ({
      ...data,
      works: data.works.filter((work) => work.id !== workId),
      tasks: data.tasks.filter((task) => task.workId !== workId)
    }));
  };

  const deleteGoal = async (goalId: string) => {
    await applyCycleDataUpdate((data) => {
      const childWorkIds = new Set(data.works.filter((work) => work.goalId === goalId).map((work) => work.id));
      return {
        ...data,
        goals: data.goals.filter((goal) => goal.id !== goalId),
        works: data.works.filter((work) => work.goalId !== goalId),
        tasks: data.tasks.filter((task) => !childWorkIds.has(task.workId))
      };
    });
  };

  const togglePostItWindowMode = async () => {
    await runWithErrorAlert('Failed to toggle post-it mode.', async () => {
      const nextPostItMode = await toggleDesktopPostItMode();
      setPostItMode(nextPostItMode);
      if (nextPostItMode) {
        setCalendarMode(false);
      }

      if (nextPostItMode) {
        setAlwaysOnTop(true);
      } else {
        const pinState = await getDesktopAlwaysOnTopState();
        setAlwaysOnTop(pinState);
      }
    });
  };

  const toggleCalendarWindowMode = async () => {
    await runWithErrorAlert('Failed to toggle calendar mode.', async () => {
      const nextCalendarMode = await toggleDesktopCalendarMode();
      setCalendarMode(nextCalendarMode);
      if (nextCalendarMode) {
        setPostItMode(false);
        setTab('calendar');
      }
    });
  };

  const onChangeWindowOpacity = async (value: number) => {
    await runWithErrorAlert('Failed to set window opacity.', async () => {
      const next = await setDesktopWindowOpacity(value);
      setWindowOpacity(next);
    });
  };

  const hasCycle = index.cycles.length > 0 && Boolean(selectedCycleId);

  return (
    <div className={`app-shell ${isDesktop ? 'desktop-shell' : ''}`}>
      {isDesktop && (
        <DesktopWindowChrome
          postItMode={postItMode}
          calendarMode={calendarMode}
          alwaysOnTop={alwaysOnTop}
          opacityPanelOpen={opacityPanelOpen}
          windowOpacityPercent={Math.round(windowOpacity * 100)}
          opacityPanelRef={opacityPanelRef}
          onTogglePostIt={() => void togglePostItWindowMode()}
          onToggleCalendar={() => void toggleCalendarWindowMode()}
          onToggleOpacityPanel={() => setOpacityPanelOpen((prev) => !prev)}
          onChangeOpacity={(value) => void onChangeWindowOpacity(value)}
          onStartDrag={() => void startDesktopWindowDragging()}
          onToggleAlwaysOnTop={() => void toggleDesktopAlwaysOnTop().then(setAlwaysOnTop)}
          onMinimize={() => void minimizeDesktopWindow()}
          onToggleMaximize={() => void toggleMaximizeDesktopWindow()}
          onClose={() => void closeDesktopWindow()}
        />
      )}

      <header className="top-bar">
        <div className="top-bar-head">
          <h1>Cycle</h1>
          <button
            type="button"
            className="theme-toggle"
            onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
            aria-label="Toggle theme"
            title="Toggle light/dark mode"
          >
            {theme === 'light' ? 'Dark' : 'Light'}
          </button>
        </div>
        <CycleSelector
          cycles={index.cycles}
          selectedCycleId={selectedCycleId}
          currentCycleName={selectedCycleName}
          onSelect={(cycleId) => void onSelectCycle(cycleId)}
          onCreate={(name) => void createCycleWithFolder(name)}
          parentDir={cycleParentDir}
          onPickParentDir={() => void chooseParentFolder()}
          onImportCycle={() => void importCycleFromFolder()}
        />
      </header>

      <main className="content">
        {loading && <p className="loading-state">Loading data...</p>}
        {!loading && !hasCycle && <p className="empty-state">Create or import a Cycle above.</p>}

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
