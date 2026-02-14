import { FormEvent, useState } from 'react';
import { Cycle } from '../types/models';
import { PrettySelect } from './PrettySelect';

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
      <PrettySelect
        className="cycle-select"
        value={selectedCycleId ?? ''}
        onChange={onSelect}
        options={cycles.length === 0
          ? [{ value: '', label: 'Create a Cycle first' }]
          : cycles.map((cycle) => ({ value: cycle.id, label: cycle.name }))}
      />
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
