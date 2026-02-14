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
        {cycles.length === 0 && <option value="">Create a Cycle first</option>}
        {cycles.map((cycle) => (
          <option key={cycle.id} value={cycle.id}>{cycle.name}</option>
        ))}
      </select>
      <form onSubmit={submit} className="inline-form">
        <input
          placeholder="New Cycle name"
          value={cycleName}
          onChange={(event) => setCycleName(event.target.value)}
        />
        <button type="button" onClick={onPickParentDir}>Storage folder</button>
        <button type="submit">Create</button>
        <button type="button" onClick={onImportCycle}>Import</button>
      </form>
      <small className="folder-path">Parent folder: {parentDir || '(not selected)'}</small>
    </section>
  );
}
