import { useEffect, useMemo, useState } from 'react';
import { Goal, Task, Work, WorkStatus } from '../types/models';
import { computeGoalStatus } from '../utils/model';
import { WorkDetailPanel } from './WorkDetailPanel';

interface CalendarTabProps {
  goals: Goal[];
  works: Work[];
  tasks: Task[];
  onChangeWorkStatus: (workId: string, status: WorkStatus) => void;
  onUpdateWork: (workId: string, patch: Partial<Pick<Work, 'title' | 'status' | 'startDate' | 'endDate' | 'body'>>) => void;
  onToggleTask: (taskId: string) => void;
  onCreateTask: (payload: { title: string; workId: string; dueDate?: string }) => void;
  onDeleteTask: (taskId: string) => void;
}

interface CalendarItem {
  id: string;
  date: string;
  label: string;
  completed: boolean;
  kind: 'goal' | 'work' | 'task';
  workId?: string;
}

interface PublicHoliday {
  date: string;
  localName: string;
}

const FALLBACK_SOLAR_HOLIDAYS: Array<{ monthDay: string; name: string }> = [
  { monthDay: '01-01', name: '신정' },
  { monthDay: '03-01', name: '삼일절' },
  { monthDay: '05-05', name: '어린이날' },
  { monthDay: '06-06', name: '현충일' },
  { monthDay: '08-15', name: '광복절' },
  { monthDay: '10-03', name: '개천절' },
  { monthDay: '10-09', name: '한글날' },
  { monthDay: '12-25', name: '성탄절' }
];

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toDateKey(date?: string): string | null {
  if (!date) return null;
  return date;
}

export function CalendarTab({
  goals,
  works,
  tasks,
  onChangeWorkStatus,
  onUpdateWork,
  onToggleTask,
  onCreateTask,
  onDeleteTask
}: CalendarTabProps) {
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [deleteTaskTarget, setDeleteTaskTarget] = useState<Task | null>(null);
  const [holidayMap, setHolidayMap] = useState<Record<string, string>>({});

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDay.getDay();

  useEffect(() => {
    let mounted = true;

    const loadKoreanHolidays = async () => {
      try {
        const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/KR`);
        if (!res.ok) throw new Error('holiday api failed');
        const data = (await res.json()) as PublicHoliday[];
        if (!mounted) return;

        const nextMap: Record<string, string> = {};
        data.forEach((holiday) => {
          nextMap[holiday.date] = holiday.localName;
        });
        setHolidayMap(nextMap);
      } catch {
        if (!mounted) return;
        const nextMap: Record<string, string> = {};
        FALLBACK_SOLAR_HOLIDAYS.forEach((holiday) => {
          nextMap[`${year}-${holiday.monthDay}`] = holiday.name;
        });
        setHolidayMap(nextMap);
      }
    };

    void loadKoreanHolidays();
    return () => {
      mounted = false;
    };
  }, [year]);

  const itemsByDay: Record<string, CalendarItem[]> = {};

  goals.forEach((goal) => {
    const status = computeGoalStatus(works.filter((work) => work.goalId === goal.id));
    [
      { date: goal.startDate, suffix: '시작일' },
      { date: goal.endDate, suffix: '완료일' }
    ].forEach(({ date, suffix }) => {
      const key = toDateKey(date);
      if (!key) return;
      itemsByDay[key] = itemsByDay[key] ?? [];
      itemsByDay[key].push({ id: `${goal.id}-${suffix}`, date: key, label: `[Goal] ${goal.title} ${suffix}`, completed: status === 'DONE', kind: 'goal' });
    });
  });

  works.forEach((work) => {
    [
      { date: work.startDate, suffix: '시작일' },
      { date: work.endDate, suffix: '완료일' }
    ].forEach(({ date, suffix }) => {
      const key = toDateKey(date);
      if (!key) return;
      itemsByDay[key] = itemsByDay[key] ?? [];
      itemsByDay[key].push({
        id: `${work.id}-${suffix}`,
        date: key,
        label: `[Work] ${work.title} ${suffix}`,
        completed: work.status === 'DONE',
        kind: 'work',
        workId: work.id
      });
    });
  });

  tasks.forEach((task) => {
    const key = toDateKey(task.dueDate);
    if (!key) return;
    itemsByDay[key] = itemsByDay[key] ?? [];
    itemsByDay[key].push({ id: task.id, date: key, label: `[Task] ${task.title} 완료일`, completed: task.done, kind: 'task' });
  });

  const dayCells: Array<number | null> = [];
  for (let i = 0; i < startWeekday; i += 1) dayCells.push(null);
  for (let date = 1; date <= lastDate; date += 1) dayCells.push(date);

  const selectedWork = useMemo(() => works.find((work) => work.id === selectedWorkId) ?? null, [works, selectedWorkId]);
  const selectedWorkTasks = useMemo(() => {
    if (!selectedWorkId) return [];
    return tasks.filter((task) => task.workId === selectedWorkId);
  }, [tasks, selectedWorkId]);

  return (
    <section className="tab-panel">
      {deleteTaskTarget && (
        <div className="modal-backdrop" onClick={() => setDeleteTaskTarget(null)} role="presentation">
          <div className="modal-box" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3>삭제 확인</h3>
            <p>{`"${deleteTaskTarget.title}" Task를 삭제할까요?`}</p>
            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setDeleteTaskTarget(null)}>취소</button>
              <button
                type="button"
                className="btn-submit"
                onClick={() => {
                  onDeleteTask(deleteTaskTarget.id);
                  setDeleteTaskTarget(null);
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`goal-detail-layout ${selectedWork ? 'detail-open' : ''}`}>
        <div className="goal-detail-main calendar-detail-main">
          <div className="calendar-header">
            <h2>{year}년 {month + 1}월</h2>
            <div className="calendar-nav">
              <button type="button" onClick={() => setViewDate(new Date(year, month - 1, 1))} title="이전 달">◀</button>
              <button type="button" onClick={() => setViewDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))} title="오늘">today</button>
              <button type="button" onClick={() => setViewDate(new Date(year, month + 1, 1))} title="다음 달">▶</button>
            </div>
          </div>
          <div className="calendar-grid">
            {['일', '월', '화', '수', '목', '금', '토'].map((name, idx) => (
              <div key={name} className={`week-header ${idx === 0 || idx === 6 ? 'weekend' : ''}`}>{name}</div>
            ))}
            {dayCells.map((date, idx) => {
              if (!date) return <div key={`empty-${idx}`} className="calendar-cell empty" />;

              const currentDate = new Date(year, month, date);
              const key = formatDateKey(currentDate);
              const dayOfWeek = currentDate.getDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
              const isHoliday = Boolean(holidayMap[key]);
              const dayItems = itemsByDay[key] ?? [];

              return (
                <div key={key} className={`calendar-cell ${isWeekend || isHoliday ? 'holiday' : ''}`}>
                  <strong className={isWeekend || isHoliday ? 'calendar-date holiday' : 'calendar-date'}>{date}</strong>
                  <div className="calendar-items">
                    {dayItems.map((item) => (
                      item.workId ? (
                        <button
                          key={item.id}
                          type="button"
                          className={`calendar-item calendar-item-${item.kind} calendar-item-btn ${item.completed ? 'done' : 'active'} ${selectedWorkId === item.workId ? 'selected' : ''}`}
                          onClick={() => setSelectedWorkId(item.workId as string)}
                        >
                          {item.label}
                        </button>
                      ) : (
                        <div key={item.id} className={`calendar-item calendar-item-${item.kind} ${item.completed ? 'done' : 'active'}`}>
                          {item.label}
                        </div>
                      )
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {selectedWork && (
          <WorkDetailPanel
            work={selectedWork}
            tasks={selectedWorkTasks}
            onClose={() => setSelectedWorkId(null)}
            onToggleTask={onToggleTask}
            onCreateTask={onCreateTask}
            onRequestDeleteTask={setDeleteTaskTarget}
            onUpdateWork={onUpdateWork}
            onChangeWorkStatus={onChangeWorkStatus}
          />
        )}
      </div>
    </section>
  );
}
