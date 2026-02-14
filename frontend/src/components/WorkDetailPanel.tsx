import { FormEvent, useEffect, useRef, useState } from 'react';
import { Task, Work, WorkStatus } from '../types/models';

interface WorkDetailPanelProps {
  work: Work;
  tasks: Task[];
  onClose: () => void;
  onToggleTask: (taskId: string) => void;
  onCreateTask: (payload: { title: string; workId: string; dueDate?: string }) => void;
  onRequestDeleteTask: (task: Task) => void;
  onUpdateWork: (workId: string, patch: Partial<Pick<Work, 'title' | 'status' | 'startDate' | 'endDate' | 'body'>>) => void;
  onChangeWorkStatus: (workId: string, status: WorkStatus) => void;
}

export function WorkDetailPanel({
  work,
  tasks,
  onClose,
  onToggleTask,
  onCreateTask,
  onRequestDeleteTask,
  onUpdateWork,
  onChangeWorkStatus
}: WorkDetailPanelProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [isEditingBody, setIsEditingBody] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');

  useEffect(() => {
    setIsEditingBody(false);
  }, [work.id, work.body]);

  useEffect(() => {
    if (!isEditingBody || !editorRef.current) return;
    editorRef.current.innerHTML = work.body ?? '';
  }, [isEditingBody, work.id, work.body]);

  const exec = (command: string, value?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
  };

  const insertImage = () => {
    const src = window.prompt('이미지 URL을 입력하세요');
    if (!src) return;
    exec('insertImage', src);
  };

  const insertTable = () => {
    const rowInput = window.prompt('행 개수', '2');
    const colInput = window.prompt('열 개수', '2');
    const rows = Number(rowInput);
    const cols = Number(colInput);
    if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows <= 0 || cols <= 0) return;

    const bodyRows = Array.from({ length: rows })
      .map(() => `<tr>${Array.from({ length: cols }).map(() => '<td>&nbsp;</td>').join('')}</tr>`)
      .join('');
    const html = `<table><tbody>${bodyRows}</tbody></table><p></p>`;
    exec('insertHTML', html);
  };

  const saveBody = () => {
    const body = editorRef.current?.innerHTML ?? '';
    onUpdateWork(work.id, { body: body.trim() ? body : '' });
    setIsEditingBody(false);
  };

  const createTaskInDetail = (e: FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    onCreateTask({ title: taskTitle.trim(), workId: work.id, dueDate: taskDueDate || undefined });
    setTaskTitle('');
    setTaskDueDate('');
  };

  return (
    <aside className="work-detail-panel">
      <div className="work-detail-header">
        <h3>Work 상세</h3>
        <button type="button" className="btn-text" onClick={onClose}>닫기</button>
      </div>

      <div className="work-detail-meta">
        <div className="work-detail-field">
          <span>Work 제목</span>
          <input
            type="text"
            value={work.title}
            onChange={(e) => onUpdateWork(work.id, { title: e.target.value })}
          />
        </div>

        <div className="work-detail-field">
          <span>상태</span>
          <select
            value={work.status}
            onChange={(e) => {
              const status = e.target.value as WorkStatus;
              onChangeWorkStatus(work.id, status);
            }}
          >
            <option value="NOT_STARTED">시작 전</option>
            <option value="IN_PROGRESS">진행 중</option>
            <option value="DONE">완료</option>
          </select>
        </div>

        <div className="work-detail-field">
          <span>목표 시작일</span>
          <input
            type="date"
            value={work.startDate || ''}
            onChange={(e) => onUpdateWork(work.id, { startDate: e.target.value || undefined })}
          />
        </div>

        <div className="work-detail-field">
          <span>목표 완료일</span>
          <input
            type="date"
            value={work.endDate || ''}
            onChange={(e) => onUpdateWork(work.id, { endDate: e.target.value || undefined })}
          />
        </div>
      </div>

      <div className="work-detail-body">
        <div className="work-detail-body-header">
          <h4>본문</h4>
          {!isEditingBody && (
            <button type="button" className="btn" onClick={() => setIsEditingBody(true)}>
              {work.body ? '수정' : '생성'}
            </button>
          )}
        </div>

        {!isEditingBody && !work.body && <p className="empty-state">본문이 없습니다.</p>}

        {!isEditingBody && work.body && (
          <div className="rich-output" dangerouslySetInnerHTML={{ __html: work.body }} />
        )}

        {isEditingBody && (
          <div className="rich-editor-wrap">
            <div className="rich-toolbar">
              <button type="button" onClick={() => exec('bold')}>B</button>
              <button type="button" onClick={() => exec('italic')}>I</button>
              <button type="button" onClick={() => exec('underline')}>U</button>
              <button type="button" onClick={() => exec('insertUnorderedList')}>• List</button>
              <button type="button" onClick={() => exec('insertOrderedList')}>1. List</button>
              <button type="button" onClick={insertImage}>Image</button>
              <button type="button" onClick={insertTable}>Table</button>
            </div>
            <div
              ref={editorRef}
              className="rich-editor"
              contentEditable
              suppressContentEditableWarning
            />
            <div className="work-form-actions">
              <button type="button" className="work-form-btn-cancel" onClick={() => setIsEditingBody(false)}>취소</button>
              <button type="button" className="work-form-btn-submit" onClick={saveBody}>저장</button>
            </div>
          </div>
        )}
      </div>

      <div className="work-detail-task">
        <h4>하위 Task</h4>
        <form className="detail-task-form" onSubmit={createTaskInDetail}>
          <input
            type="text"
            placeholder="Task 제목"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
          />
          <input type="date" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} />
          <button type="submit" className="btn">추가</button>
        </form>

        <div className="detail-task-list">
          {tasks.length === 0 && <p className="empty-state">Task가 없습니다.</p>}
          {tasks.map((task) => (
            <label key={task.id} className={`task-item ${task.done ? 'done' : ''}`}>
              <input type="checkbox" checked={task.done} onChange={() => onToggleTask(task.id)} />
              <span className="task-date">({task.dueDate || '-'})</span>
              <span className="task-title">{task.title}</span>
              <button
                type="button"
                className="btn-delete-card"
                title="Task 삭제"
                aria-label="Task 삭제"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRequestDeleteTask(task);
                }}
              >
                x
              </button>
            </label>
          ))}
        </div>
      </div>
    </aside>
  );
}
