import { Task, Work } from '../types/models';

interface TodoTabProps {
  works: Work[];
  tasks: Task[];
  hideCompleted: boolean;
  onHideCompletedChange: (value: boolean) => void;
  onToggleTask: (taskId: string) => void;
}

export function TodoTab({ works, tasks, hideCompleted, onHideCompletedChange, onToggleTask }: TodoTabProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date();
  limit.setHours(23, 59, 59, 999);
  limit.setDate(today.getDate() + 30);

  const candidateTasks = tasks.filter((task) => {
    if (!task.dueDate) return false;
    const due = new Date(task.dueDate);
    const inRange = due >= today && due <= limit;
    if (!inRange) return false;
    if (hideCompleted && task.done) return false;
    return true;
  });

  const sortedTasks = [...candidateTasks].sort((a, b) => (
    new Date(a.dueDate as string).getTime() - new Date(b.dueDate as string).getTime()
  ));

  const groups = works
    .map((work) => ({
      work,
      tasks: sortedTasks.filter((task) => task.workId === work.id)
    }))
    .filter((group) => group.tasks.length > 0);

  const orphanTasks = sortedTasks.filter((task) => !works.some((work) => work.id === task.workId));

  if (orphanTasks.length > 0) {
    groups.push({
      work: { id: 'orphan', title: '미분류 Work', cycleId: '', status: 'NOT_STARTED' },
      tasks: orphanTasks
    });
  }

  return (
    <section className="tab-panel todo-tab">
      <div className="panel-controls todo-controls">
        <p className="todo-overview">다음 30일 내 일정: <strong>{sortedTasks.length}개</strong></p>
        <label className="todo-filter">
          <input
            type="checkbox"
            checked={hideCompleted}
            onChange={(event) => onHideCompletedChange(event.target.checked)}
          />
          완료된 항목 가리기
        </label>
      </div>

      {groups.length > 0 && (
        <div className="todo-work-grid">
          {groups.map((group) => (
            <article key={group.work.id} className="todo-work-card">
              <header className="todo-work-header">
                <h3>{group.work.title}</h3>
                <span className="todo-count">{group.tasks.length}</span>
              </header>
              <div className="todo-task-list">
                {group.tasks.map((task) => (
                  <label key={task.id} className={`todo-task-row ${task.done ? 'done' : ''}`}>
                    <input type="checkbox" checked={task.done} onChange={() => onToggleTask(task.id)} />
                    <span className="todo-task-title">{task.title}</span>
                    <span className="todo-task-date">{task.dueDate}</span>
                  </label>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}

      {sortedTasks.length === 0 && <p className="todo-empty">한 달 이내에 완료해야 하는 Task가 없습니다.</p>}
    </section>
  );
}
