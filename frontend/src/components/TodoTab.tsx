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

  return (
    <section className="tab-panel">
      <div className="panel-controls">
        <label>
          <input
            type="checkbox"
            checked={hideCompleted}
            onChange={(event) => onHideCompletedChange(event.target.checked)}
          />
          완료된 항목들 가리기
        </label>
      </div>

      {works.map((work) => {
        const linkedTasks = candidateTasks.filter((task) => task.workId === work.id);
        if (linkedTasks.length === 0) return null;

        return (
          <article className="card" key={work.id}>
            <h3>{work.title}</h3>
            <div className="task-list">
              {linkedTasks.map((task) => (
                <label key={task.id} className="task-item">
                  <input type="checkbox" checked={task.done} onChange={() => onToggleTask(task.id)} />
                  {task.title} (완료일: {task.dueDate})
                </label>
              ))}
            </div>
          </article>
        );
      })}

      {candidateTasks.length === 0 && <p>한 달 이내에 완료해야 하는 Task가 없습니다.</p>}
    </section>
  );
}
