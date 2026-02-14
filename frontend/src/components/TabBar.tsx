interface TabBarProps {
  tab: 'goals' | 'calendar' | 'todo';
  onChange: (tab: 'goals' | 'calendar' | 'todo') => void;
}

export function TabBar({ tab, onChange }: TabBarProps) {
  return (
    <nav className="tab-bar">
      <button className={tab === 'goals' ? 'active' : ''} onClick={() => onChange('goals')}>Goal List</button>
      <button className={tab === 'calendar' ? 'active' : ''} onClick={() => onChange('calendar')}>캘린더</button>
      <button className={tab === 'todo' ? 'active' : ''} onClick={() => onChange('todo')}>To-Do List</button>
    </nav>
  );
}
