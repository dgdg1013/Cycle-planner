import { FormEvent, useState } from 'react';
import { Cycle } from '../types/models';

interface CycleSelectorProps {
  cycles: Cycle[];
  selectedCycleId?: string;
  onSelect: (cycleId: string) => void;
  onCreate: (name: string) => void;
  parentDir: string;
  onPickParentDir: () => void;
  onImportCycle: () => void;
}

export function CycleSelector({
  cycles,
  selectedCycleId,
  onSelect,
  onCreate,
  parentDir,
  onPickParentDir,
  onImportCycle
}: CycleSelectorProps) {
  const [cycleName, setCycleName] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = cycleName.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setCycleName('');
  };

  return (
    <section className="cycle-selector">
      <select
        value={selectedCycleId ?? ''}
        onChange={(event) => onSelect(event.target.value)}
      >
        {cycles.length === 0 && <option value="">Cycle 생성 필요</option>}
        {cycles.map((cycle) => (
          <option key={cycle.id} value={cycle.id}>{cycle.name}</option>
        ))}
      </select>
      <form onSubmit={submit} className="inline-form">
        <input
          placeholder="새 Cycle 이름"
          value={cycleName}
          onChange={(event) => setCycleName(event.target.value)}
        />
        <button type="button" onClick={onPickParentDir}>저장 폴더</button>
        <button type="submit">생성</button>
        <button type="button" onClick={onImportCycle}>불러오기</button>
      </form>
      <small className="folder-path">저장 상위 폴더: {parentDir || '(선택 필요)'}</small>
    </section>
  );
}
