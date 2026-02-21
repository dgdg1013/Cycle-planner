import type { RefObject } from 'react';

interface DesktopWindowChromeProps {
  postItMode: boolean;
  calendarMode: boolean;
  alwaysOnTop: boolean;
  opacityPanelOpen: boolean;
  windowOpacityPercent: number;
  opacityPanelRef: RefObject<HTMLDivElement>;
  onTogglePostIt: () => void;
  onToggleCalendar: () => void;
  onToggleOpacityPanel: () => void;
  onChangeOpacity: (value: number) => void;
  onStartDrag: () => void;
  onToggleAlwaysOnTop: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onClose: () => void;
}

export function DesktopWindowChrome({
  postItMode,
  calendarMode,
  alwaysOnTop,
  opacityPanelOpen,
  windowOpacityPercent,
  opacityPanelRef,
  onTogglePostIt,
  onToggleCalendar,
  onToggleOpacityPanel,
  onChangeOpacity,
  onStartDrag,
  onToggleAlwaysOnTop,
  onMinimize,
  onToggleMaximize,
  onClose
}: DesktopWindowChromeProps) {
  return (
    <div className="window-chrome">
      <div className="window-left-actions">
        <button
          type="button"
          className={`window-postit-btn ${postItMode ? 'active' : ''}`}
          onClick={onTogglePostIt}
          aria-label="Toggle post-it mode"
          title={postItMode ? 'Exit post-it mode' : 'Enter post-it mode'}
        >
          PT
        </button>
        <button
          type="button"
          className={`window-postit-btn ${calendarMode ? 'active' : ''}`}
          onClick={onToggleCalendar}
          aria-label="Toggle calendar mode"
          title={calendarMode ? 'Exit calendar mode' : 'Enter calendar mode'}
        >
          CA
        </button>
        <div ref={opacityPanelRef} className="window-opacity-wrap">
          <button
            type="button"
            className={`window-postit-btn window-opacity-btn ${opacityPanelOpen ? 'active' : ''}`}
            onClick={onToggleOpacityPanel}
            aria-label="Adjust window opacity"
            title="Adjust window opacity"
          >
            OP
          </button>
          {opacityPanelOpen && (
            <div className="window-opacity-popover">
              <input
                type="range"
                min={50}
                max={100}
                step={1}
                value={windowOpacityPercent}
                onChange={(event) => onChangeOpacity(Number(event.target.value) / 100)}
                aria-label="Window opacity"
              />
              <span>{windowOpacityPercent}%</span>
            </div>
          )}
        </div>
        <button
          type="button"
          className={`window-control-btn pin ${alwaysOnTop ? 'active' : ''}`}
          onClick={onToggleAlwaysOnTop}
          aria-label="Always on top"
          title={alwaysOnTop ? 'Disable always on top' : 'Enable always on top'}
        >
          P
        </button>
      </div>
      <div className="window-drag-region" onMouseDown={onStartDrag} />
      <div className="window-controls">
        <button type="button" className="window-control-btn" onClick={onMinimize} aria-label="Minimize">_</button>
        <button type="button" className="window-control-btn maximize" onClick={onToggleMaximize} aria-label="Maximize or Restore">□</button>
        <button type="button" className="window-control-btn close" onClick={onClose} aria-label="Close">x</button>
      </div>
    </div>
  );
}
