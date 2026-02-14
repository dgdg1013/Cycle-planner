import { FormEvent, MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Goal, Task, Work, WorkStatus } from '../types/models';
import { computeGoalProgress, computeGoalStatus, GOAL_STATUS_LABEL, isCompletedGoal, WORK_STATUS_LABEL } from '../utils/model';
import { WorkDetailPanel } from './WorkDetailPanel';

interface GoalListTabProps {
  goals: Goal[];
  works: Work[];
  tasks: Task[];
  hideCompleted: boolean;
  onHideCompletedChange: (value: boolean) => void;
  onCreateGoal: (payload: { title: string; startDate?: string; endDate?: string }) => void;
  onCreateWork: (payload: { title: string; goalId?: string; startDate?: string; endDate?: string; body?: string; status?: WorkStatus }) => void;
  onCreateTask: (payload: { title: string; workId: string; dueDate?: string }) => void;
  onChangeWorkStatus: (workId: string, status: WorkStatus) => void;
  onUpdateWork: (workId: string, patch: Partial<Pick<Work, 'title' | 'status' | 'startDate' | 'endDate' | 'body'>>) => void;
  onUpdateTask: (taskId: string, patch: Partial<Pick<Task, 'title' | 'dueDate'>>) => void;
  onToggleTask: (taskId: string) => void;
  onDeleteGoal: (goalId: string) => void;
  onDeleteWork: (workId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

type DeleteTarget = { kind: 'task'; id: string; title: string };
type ContextMenuTarget =
  | { kind: 'goal' | 'work'; id: string; title: string; x: number; y: number }
  | { kind: 'task'; id: string; workId: string; title: string; dueDate?: string; x: number; y: number };

function TaskDisplay({
  task,
  onToggle,
  onContextMenu,
  onDelete,
  hideCompleted
}: {
  task: Task;
  onToggle: (id: string) => void;
  onContextMenu: (event: MouseEvent, task: Task) => void;
  onDelete: (task: Task) => void;
  hideCompleted: boolean;
}) {
  if (hideCompleted && task.done) return null;
  const dateLabel = task.dueDate || '-';

  return (
    <label className={`task-item ${task.done ? 'done' : ''}`} onContextMenu={(e) => onContextMenu(e, task)}>
      <input type="checkbox" checked={task.done} onChange={() => onToggle(task.id)} />
      <span className="task-date">({dateLabel})</span>
      <span className="task-title">{task.title}</span>
      <button
        type="button"
        className="btn-delete-card"
        title="Task 삭제"
        aria-label="Task 삭제"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete(task);
        }}
      >
        x
      </button>
    </label>
  );
}

export function GoalListTab(props: GoalListTabProps) {
  const {
    goals,
    works,
    tasks,
    hideCompleted,
    onHideCompletedChange,
    onCreateGoal,
    onCreateWork,
    onCreateTask,
    onChangeWorkStatus,
    onUpdateWork,
    onUpdateTask,
    onToggleTask,
    onDeleteGoal,
    onDeleteWork,
    onDeleteTask
  } = props;

  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [addingWorkGoalId, setAddingWorkGoalId] = useState<string | null>(null);
  const [addingIndependentWork, setAddingIndependentWork] = useState(false);
  const [taskModal, setTaskModal] = useState<{ workId: string; mode: 'create' | 'edit'; taskId?: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [contextMenuTarget, setContextMenuTarget] = useState<ContextMenuTarget | null>(null);
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [openWorks, setOpenWorks] = useState<Record<string, boolean>>({});
  const newWorkBodyEditorRef = useRef<HTMLDivElement | null>(null);

  const [newGoalForm, setNewGoalForm] = useState({ title: '', startDate: '', endDate: '' });
  const [newWorkForm, setNewWorkForm] = useState({ title: '', status: 'NOT_STARTED' as WorkStatus, startDate: '', endDate: '', body: '' });
  const [newTaskForm, setNewTaskForm] = useState({ title: '', dueDate: '' });

  const normalizeBodyText = (html: string) => (
    html
      .replace(/<br\s*\/?>/gi, '')
      .replace(/&nbsp;/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim()
  );

  const execNewWorkEditor = (command: string, value?: string) => {
    if (!newWorkBodyEditorRef.current) return;
    newWorkBodyEditorRef.current.focus();
    document.execCommand(command, false, value);
    setNewWorkForm((p) => ({ ...p, body: newWorkBodyEditorRef.current?.innerHTML ?? '' }));
  };

  const insertNewWorkImage = () => {
    const src = window.prompt('이미지 URL을 입력하세요');
    if (!src) return;
    execNewWorkEditor('insertImage', src);
  };

  const insertNewWorkTable = () => {
    const rowInput = window.prompt('행 개수', '2');
    const colInput = window.prompt('열 개수', '2');
    const rows = Number(rowInput);
    const cols = Number(colInput);
    if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows <= 0 || cols <= 0) return;
    const bodyRows = Array.from({ length: rows })
      .map(() => `<tr>${Array.from({ length: cols }).map(() => '<td>&nbsp;</td>').join('')}</tr>`)
      .join('');
    execNewWorkEditor('insertHTML', `<table><tbody>${bodyRows}</tbody></table><p></p>`);
  };

  const workByGoal = useMemo(() => {
    return goals.reduce<Record<string, Work[]>>((acc, goal) => {
      acc[goal.id] = works.filter((work) => work.goalId === goal.id);
      return acc;
    }, {});
  }, [goals, works]);

  const taskByWork = useMemo(() => {
    return works.reduce<Record<string, Task[]>>((acc, work) => {
      acc[work.id] = tasks.filter((task) => task.workId === work.id);
      return acc;
    }, {});
  }, [works, tasks]);

  const selectedWork = useMemo(() => works.find((work) => work.id === selectedWorkId) ?? null, [works, selectedWorkId]);

  useEffect(() => {
    if (selectedWorkId && !works.some((work) => work.id === selectedWorkId)) {
      setSelectedWorkId(null);
    }
  }, [selectedWorkId, works]);

  const unassignedWorks = works.filter((work) => !work.goalId);

  const saveNewGoal = (e: FormEvent) => {
    e.preventDefault();
    if (!newGoalForm.title.trim()) return;
    onCreateGoal({
      title: newGoalForm.title.trim(),
      startDate: newGoalForm.startDate || undefined,
      endDate: newGoalForm.endDate || undefined
    });
    setNewGoalForm({ title: '', startDate: '', endDate: '' });
    setGoalModalOpen(false);
  };

  const saveNewWork = (e: FormEvent, goalId: string | undefined) => {
    e.preventDefault();
    if (!newWorkForm.title.trim()) return;
    const bodyHtml = newWorkBodyEditorRef.current?.innerHTML ?? newWorkForm.body;
    const body = normalizeBodyText(bodyHtml) ? bodyHtml : undefined;
    onCreateWork({
      title: newWorkForm.title.trim(),
      goalId,
      status: newWorkForm.status,
      startDate: newWorkForm.startDate || undefined,
      endDate: newWorkForm.endDate || undefined,
      body
    });
    setNewWorkForm({ title: '', status: 'NOT_STARTED', startDate: '', endDate: '', body: '' });
    setAddingWorkGoalId(null);
    setAddingIndependentWork(false);
  };

  const saveNewTask = (e: FormEvent, workId: string) => {
    e.preventDefault();
    if (!newTaskForm.title.trim()) return;
    if (taskModal?.mode === 'edit' && taskModal.taskId) {
      onUpdateTask(taskModal.taskId, { title: newTaskForm.title.trim(), dueDate: newTaskForm.dueDate || undefined });
    } else {
      onCreateTask({ title: newTaskForm.title.trim(), workId, dueDate: newTaskForm.dueDate || undefined });
    }
    setNewTaskForm({ title: '', dueDate: '' });
    setOpenWorks((p) => ({ ...p, [workId]: true }));
    setTaskModal(null);
  };

  const openAddWorkForGoal = (goalId: string) => {
    setAddingIndependentWork(false);
    setAddingWorkGoalId(goalId);
    setNewWorkForm({ title: '', status: 'NOT_STARTED', startDate: '', endDate: '', body: '' });
  };

  const openAddIndependentWork = () => {
    setAddingWorkGoalId(null);
    setAddingIndependentWork(true);
    setNewWorkForm({ title: '', status: 'NOT_STARTED', startDate: '', endDate: '', body: '' });
  };

  useEffect(() => {
    if (!newWorkBodyEditorRef.current) return;
    newWorkBodyEditorRef.current.innerHTML = newWorkForm.body;
  }, [addingWorkGoalId, addingIndependentWork]);

  const openTaskModal = (workId: string) => {
    setOpenWorks((p) => ({ ...p, [workId]: true }));
    setNewTaskForm({ title: '', dueDate: '' });
    globalThis.setTimeout(() => setTaskModal({ workId, mode: 'create' }), 0);
  };

  const openTaskEditModal = (task: Task) => {
    setOpenWorks((p) => ({ ...p, [task.workId]: true }));
    setNewTaskForm({ title: task.title, dueDate: task.dueDate || '' });
    globalThis.setTimeout(() => setTaskModal({ workId: task.workId, mode: 'edit', taskId: task.id }), 0);
  };

  const renderWorkCard = (work: Work) => {
    const workTasks = taskByWork[work.id] ?? [];
    const isTaskOpen = openWorks[work.id] ?? false;
    if (hideCompleted && work.status === 'DONE') return null;

    return (
      <div
        key={work.id}
        className={`work-card status-${work.status.toLowerCase()} ${selectedWorkId === work.id ? 'selected' : ''}`}
        onClick={() => setSelectedWorkId((prev) => (prev === work.id ? null : work.id))}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setContextMenuTarget({ kind: 'work', id: work.id, title: work.title, x: e.clientX, y: e.clientY });
        }}
      >
        <div className="work-top">
          <h4>{work.title}</h4>
          <select
            value={work.status}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onChangeWorkStatus(work.id, e.target.value as WorkStatus)}
          >
            <option value="NOT_STARTED">시작 전</option>
            <option value="IN_PROGRESS">진행 중</option>
            <option value="DONE">완료</option>
          </select>
        </div>
        <p>상태: {WORK_STATUS_LABEL[work.status]}</p>
        <p>목표 시작일: {work.startDate || '-'}</p>
        <p>목표 완료일: {work.endDate || '-'}</p>
        <div className="task-row">
          <button
            type="button"
            className="btn-text"
            onClick={(e) => {
              e.stopPropagation();
              setOpenWorks((p) => ({ ...p, [work.id]: !isTaskOpen }));
            }}
          >
            {isTaskOpen ? 'Hide Task' : 'Show Task'}
          </button>
          <button
            type="button"
            className="btn-add-task"
            title="Task 추가"
            onClick={(e) => {
              e.stopPropagation();
              openTaskModal(work.id);
            }}
          >
            <span className="plus-symbol">+</span>
          </button>
        </div>
        {isTaskOpen && (
          <div className="task-list task-list-card">
            {workTasks.map((task) => (
              <TaskDisplay
                key={task.id}
                task={task}
                onToggle={onToggleTask}
                onContextMenu={(event, target) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setContextMenuTarget({
                    kind: 'task',
                    id: target.id,
                    workId: target.workId,
                    title: target.title,
                    dueDate: target.dueDate,
                    x: event.clientX,
                    y: event.clientY
                  });
                }}
                onDelete={(target) => setDeleteTarget({ kind: 'task', id: target.id, title: target.title })}
                hideCompleted={hideCompleted}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="tab-panel">
      <div className="panel-controls">
        <div className="panel-controls-left">
          <button type="button" className="btn btn-primary" onClick={() => setGoalModalOpen(true)}>
            Goal 생성
          </button>
        </div>
        <div className="panel-controls-right">
          <label>
            <input
              type="checkbox"
              checked={hideCompleted}
              onChange={(e) => onHideCompletedChange(e.target.checked)}
            />
            완료된 항목들 가리기
          </label>
        </div>
      </div>

      {goalModalOpen && (
        <div className="modal-backdrop" onClick={() => setGoalModalOpen(false)} role="presentation">
          <div className="modal-box" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3>Goal 생성</h3>
            <form onSubmit={saveNewGoal}>
              <label>
                Goal 제목
                <input
                  type="text"
                  value={newGoalForm.title}
                  onChange={(e) => setNewGoalForm((p) => ({ ...p, title: e.target.value }))}
                  autoFocus
                />
              </label>
              <label>
                목표 시작일 (선택)
                <input type="date" value={newGoalForm.startDate} onChange={(e) => setNewGoalForm((p) => ({ ...p, startDate: e.target.value }))} />
              </label>
              <label>
                목표 완료일 (선택)
                <input type="date" value={newGoalForm.endDate} onChange={(e) => setNewGoalForm((p) => ({ ...p, endDate: e.target.value }))} />
              </label>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setGoalModalOpen(false)}>취소</button>
                <button type="submit" className="btn-submit">추가</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {taskModal && (() => {
        const work = works.find((w) => w.id === taskModal.workId);
        if (!work) return null;
        return (
          <div className="modal-backdrop" onClick={() => setTaskModal(null)} role="presentation">
            <div className="modal-box" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
              <h3>{taskModal.mode === 'edit' ? 'Task 수정' : 'Task 추가'} - {work.title}</h3>
              <form onSubmit={(e) => saveNewTask(e, work.id)}>
                <label>
                  Task 제목
                  <input
                    type="text"
                    value={newTaskForm.title}
                    onChange={(e) => setNewTaskForm((p) => ({ ...p, title: e.target.value }))}
                    autoFocus
                  />
                </label>
                <label>
                  목표 완료일 (선택)
                  <input type="date" value={newTaskForm.dueDate} onChange={(e) => setNewTaskForm((p) => ({ ...p, dueDate: e.target.value }))} />
                </label>
                <div className="modal-actions">
                  <button type="button" className="btn-cancel" onClick={() => setTaskModal(null)}>취소</button>
                  <button type="submit" className="btn-submit">{taskModal.mode === 'edit' ? '저장' : '추가'}</button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {deleteTarget && (
        <div className="modal-backdrop" onClick={() => setDeleteTarget(null)} role="presentation">
          <div className="modal-box" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3>삭제 확인</h3>
            <p>
              {`"${deleteTarget.title}" Task를 삭제할까요?`}
            </p>
            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setDeleteTarget(null)}>취소</button>
              <button
                type="button"
                className="btn-submit"
                onClick={() => {
                  onDeleteTask(deleteTarget.id);
                  setDeleteTarget(null);
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {contextMenuTarget && (
        <div className="context-menu-backdrop" onClick={() => setContextMenuTarget(null)} onContextMenu={(e) => e.preventDefault()} role="presentation">
          <div
            className="context-menu"
            style={{ top: contextMenuTarget.y, left: contextMenuTarget.x }}
            onClick={(e) => e.stopPropagation()}
            role="menu"
          >
            {contextMenuTarget.kind === 'goal' && (
              <button
                type="button"
                className="context-menu-item"
                onClick={() => {
                  openAddWorkForGoal(contextMenuTarget.id);
                  setContextMenuTarget(null);
                }}
              >
                [{contextMenuTarget.title}] Work 생성
              </button>
            )}
            {contextMenuTarget.kind === 'task' && (
              <button
                type="button"
                className="context-menu-item"
                onClick={() => {
                  const targetTask = tasks.find((task) => task.id === contextMenuTarget.id);
                  if (targetTask) openTaskEditModal(targetTask);
                  setContextMenuTarget(null);
                }}
              >
                [{contextMenuTarget.title}] Task 수정
              </button>
            )}
            <button
              type="button"
              className="context-menu-item danger"
              onClick={() => {
                if (contextMenuTarget.kind === 'goal') onDeleteGoal(contextMenuTarget.id);
                if (contextMenuTarget.kind === 'work') onDeleteWork(contextMenuTarget.id);
                if (contextMenuTarget.kind === 'task') onDeleteTask(contextMenuTarget.id);
                setContextMenuTarget(null);
              }}
            >
              [{contextMenuTarget.title}] {contextMenuTarget.kind === 'goal' ? 'Goal' : contextMenuTarget.kind === 'work' ? 'Work' : 'Task'} 삭제
            </button>
          </div>
        </div>
      )}

      <div className={`goal-detail-layout ${selectedWork ? 'detail-open' : ''}`}>
        <div className="goal-detail-main">
          <div className="goal-list">
            {goals.map((goal) => {
              const relatedWorks = workByGoal[goal.id] ?? [];
              const goalDone = isCompletedGoal(relatedWorks);
              if (hideCompleted && goalDone) return null;

              const status = computeGoalStatus(relatedWorks);
              const progress = computeGoalProgress(relatedWorks);
              const isAddingWork = addingWorkGoalId === goal.id;

              return (
                <article
                  className={`card goal-card ${goalDone ? 'goal-card-done' : ''}`}
                  key={goal.id}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenuTarget({ kind: 'goal', id: goal.id, title: goal.title, x: e.clientX, y: e.clientY });
                  }}
                >
                  <div className="goal-card-header-row">
                    <header>
                      <h3>{goal.title}</h3>
                      <span className={`badge ${status.toLowerCase()}`}>{GOAL_STATUS_LABEL[status]}</span>
                    </header>
                  </div>
                  <div className="goal-progress" aria-label={`진행률 ${progress}%`}>
                    <div className="goal-progress-bar" style={{ width: `${progress}%` }} />
                    <span className={`goal-progress-text ${progress > 0 ? 'on-fill' : 'on-track'}`}>{progress}%</span>
                  </div>
                  <p>목표 시작일: {goal.startDate || '-'}</p>
                  <p>목표 완료일: {goal.endDate || '-'}</p>

                  <div className="work-list">
                    {isAddingWork && (
                      <form className="work-form-card" onSubmit={(e) => saveNewWork(e, goal.id)}>
                        <div className="work-form-row work-form-title-row">
                          <input
                            type="text"
                            className="work-form-input"
                            placeholder="Work 제목"
                            value={newWorkForm.title}
                            onChange={(e) => setNewWorkForm((p) => ({ ...p, title: e.target.value }))}
                            autoFocus
                          />
                          <select
                            className="work-form-select"
                            value={newWorkForm.status}
                            onChange={(e) => setNewWorkForm((p) => ({ ...p, status: e.target.value as WorkStatus }))}
                          >
                            <option value="NOT_STARTED">시작 전</option>
                            <option value="IN_PROGRESS">진행 중</option>
                            <option value="DONE">완료</option>
                          </select>
                        </div>
                        <div className="work-form-dates">
                          <label className="work-form-field">
                            <span className="work-form-label">목표 시작일</span>
                            <input type="date" className="work-form-input" value={newWorkForm.startDate} onChange={(e) => setNewWorkForm((p) => ({ ...p, startDate: e.target.value }))} />
                          </label>
                          <label className="work-form-field">
                            <span className="work-form-label">목표 완료일</span>
                            <input type="date" className="work-form-input" value={newWorkForm.endDate} onChange={(e) => setNewWorkForm((p) => ({ ...p, endDate: e.target.value }))} />
                          </label>
                        </div>
                        <label className="work-form-field">
                          <span className="work-form-label">본문 (선택)</span>
                          <div className="work-form-rich">
                            <div className="rich-toolbar">
                              <button type="button" onClick={() => execNewWorkEditor('bold')}>B</button>
                              <button type="button" onClick={() => execNewWorkEditor('italic')}>I</button>
                              <button type="button" onClick={() => execNewWorkEditor('underline')}>U</button>
                              <button type="button" onClick={() => execNewWorkEditor('insertUnorderedList')}>• List</button>
                              <button type="button" onClick={() => execNewWorkEditor('insertOrderedList')}>1. List</button>
                              <button type="button" onClick={insertNewWorkImage}>Image</button>
                              <button type="button" onClick={insertNewWorkTable}>Table</button>
                            </div>
                            <div
                              ref={newWorkBodyEditorRef}
                              className="rich-editor work-form-rich-editor"
                              contentEditable
                              suppressContentEditableWarning
                              onInput={(e) => setNewWorkForm((p) => ({ ...p, body: (e.target as HTMLDivElement).innerHTML }))}
                            />
                          </div>
                        </label>
                        <div className="work-form-actions">
                          <button type="button" className="work-form-btn-cancel" onClick={() => setAddingWorkGoalId(null)}>취소</button>
                          <button type="submit" className="work-form-btn-submit">저장</button>
                        </div>
                      </form>
                    )}
                    {relatedWorks.map((work) => renderWorkCard(work))}
                  </div>
                </article>
              );
            })}
          </div>

          <div className="independent-section">
            <h3 className="section-title">독립 Work</h3>
            <button type="button" className="btn-add-independent-work" onClick={openAddIndependentWork}>
              독립 Work 생성
            </button>

            {addingIndependentWork && (
              <form className="work-form-card" onSubmit={(e) => saveNewWork(e, undefined)}>
                <div className="work-form-row work-form-title-row">
                  <input
                    type="text"
                    className="work-form-input"
                    placeholder="Work 제목"
                    value={newWorkForm.title}
                    onChange={(e) => setNewWorkForm((p) => ({ ...p, title: e.target.value }))}
                    autoFocus
                  />
                  <select
                    className="work-form-select"
                    value={newWorkForm.status}
                    onChange={(e) => setNewWorkForm((p) => ({ ...p, status: e.target.value as WorkStatus }))}
                  >
                    <option value="NOT_STARTED">시작 전</option>
                    <option value="IN_PROGRESS">진행 중</option>
                    <option value="DONE">완료</option>
                  </select>
                </div>
                <div className="work-form-dates">
                  <label className="work-form-field">
                    <span className="work-form-label">목표 시작일</span>
                    <input type="date" className="work-form-input" value={newWorkForm.startDate} onChange={(e) => setNewWorkForm((p) => ({ ...p, startDate: e.target.value }))} />
                  </label>
                  <label className="work-form-field">
                    <span className="work-form-label">목표 완료일</span>
                    <input type="date" className="work-form-input" value={newWorkForm.endDate} onChange={(e) => setNewWorkForm((p) => ({ ...p, endDate: e.target.value }))} />
                  </label>
                </div>
                <label className="work-form-field">
                  <span className="work-form-label">본문 (선택)</span>
                  <div className="work-form-rich">
                    <div className="rich-toolbar">
                      <button type="button" onClick={() => execNewWorkEditor('bold')}>B</button>
                      <button type="button" onClick={() => execNewWorkEditor('italic')}>I</button>
                      <button type="button" onClick={() => execNewWorkEditor('underline')}>U</button>
                      <button type="button" onClick={() => execNewWorkEditor('insertUnorderedList')}>• List</button>
                      <button type="button" onClick={() => execNewWorkEditor('insertOrderedList')}>1. List</button>
                      <button type="button" onClick={insertNewWorkImage}>Image</button>
                      <button type="button" onClick={insertNewWorkTable}>Table</button>
                    </div>
                    <div
                      ref={newWorkBodyEditorRef}
                      className="rich-editor work-form-rich-editor"
                      contentEditable
                      suppressContentEditableWarning
                      onInput={(e) => setNewWorkForm((p) => ({ ...p, body: (e.target as HTMLDivElement).innerHTML }))}
                    />
                  </div>
                </label>
                <div className="work-form-actions">
                  <button type="button" className="work-form-btn-cancel" onClick={() => setAddingIndependentWork(false)}>취소</button>
                  <button type="submit" className="work-form-btn-submit">저장</button>
                </div>
              </form>
            )}

            <div className="work-cards">
              {unassignedWorks.map((work) => renderWorkCard(work))}
            </div>
          </div>
        </div>

        {selectedWork && (
          <WorkDetailPanel
            work={selectedWork}
            tasks={taskByWork[selectedWork.id] ?? []}
            onClose={() => setSelectedWorkId(null)}
            onToggleTask={onToggleTask}
            onCreateTask={onCreateTask}
            onRequestDeleteTask={(task) => setDeleteTarget({ kind: 'task', id: task.id, title: task.title })}
            onUpdateWork={onUpdateWork}
            onChangeWorkStatus={onChangeWorkStatus}
          />
        )}
      </div>
    </section>
  );
}
