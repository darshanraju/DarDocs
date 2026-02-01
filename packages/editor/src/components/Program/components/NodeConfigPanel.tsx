import React, { useCallback, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { ConfigField, NodeTypePlugin } from '../registry';
import { useProgramStore } from '../programStore';

interface NodeConfigPanelProps {
  programId: string;
  nodeId: string;
  plugin: NodeTypePlugin;
  config: Record<string, any>;
  onClose: () => void;
}

// Prevent ProseMirror / React Flow from intercepting events on form controls
const stopEvents = {
  onMouseDown: (e: React.MouseEvent) => {
    console.log('[ConfigPanel] input onMouseDown', e.target, 'defaultPrevented:', e.defaultPrevented);
    e.stopPropagation();
  },
  onKeyDown: (e: React.KeyboardEvent) => {
    console.log('[ConfigPanel] input onKeyDown', e.key, 'target:', e.target);
    e.stopPropagation();
  },
  onKeyUp: (e: React.KeyboardEvent) => {
    e.stopPropagation();
  },
  onFocus: (e: React.FocusEvent) => {
    console.log('[ConfigPanel] input onFocus', e.target);
  },
  onClick: (e: React.MouseEvent) => {
    console.log('[ConfigPanel] input onClick', e.target, 'defaultPrevented:', e.defaultPrevented);
    e.stopPropagation();
  },
};

function ConfigFieldInput({
  field,
  value,
  onChange,
}: {
  field: ConfigField;
  value: any;
  onChange: (val: any) => void;
}) {
  switch (field.type) {
    case 'string':
      return (
        <input
          className="program-config-input"
          type="text"
          value={value ?? field.defaultValue ?? ''}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          {...stopEvents}
        />
      );
    case 'text':
      return (
        <textarea
          className="program-config-textarea"
          value={value ?? field.defaultValue ?? ''}
          placeholder={field.placeholder}
          rows={4}
          onChange={(e) => onChange(e.target.value)}
          {...stopEvents}
        />
      );
    case 'number':
      return (
        <input
          className="program-config-input"
          type="number"
          value={value ?? field.defaultValue ?? ''}
          placeholder={field.placeholder}
          onChange={(e) => onChange(Number(e.target.value))}
          {...stopEvents}
        />
      );
    case 'select':
      return (
        <select
          className="program-config-select"
          value={value ?? field.defaultValue ?? ''}
          onChange={(e) => onChange(e.target.value)}
          {...stopEvents}
        >
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    case 'boolean':
      return (
        <label className="program-config-checkbox" {...stopEvents}>
          <input
            type="checkbox"
            checked={value ?? field.defaultValue ?? false}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span>{field.label}</span>
        </label>
      );
    default:
      return null;
  }
}

export function NodeConfigPanel({ programId, nodeId, plugin, config, onClose }: NodeConfigPanelProps) {
  const updateNodeConfig = useProgramStore((s) => s.updateNodeConfig);
  const panelRef = useRef<HTMLDivElement>(null);

  // DEBUG: attach native capture-phase listeners to detect interception
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const onCapMouseDown = (e: MouseEvent) => {
      console.log('[ConfigPanel NATIVE CAPTURE] mousedown', e.target, 'defaultPrevented:', e.defaultPrevented);
    };
    const onCapKeyDown = (e: KeyboardEvent) => {
      console.log('[ConfigPanel NATIVE CAPTURE] keydown', e.key, 'target:', e.target, 'defaultPrevented:', e.defaultPrevented);
    };
    const onCapFocusIn = (e: FocusEvent) => {
      console.log('[ConfigPanel NATIVE CAPTURE] focusin', e.target);
    };
    el.addEventListener('mousedown', onCapMouseDown, true);
    el.addEventListener('keydown', onCapKeyDown, true);
    el.addEventListener('focusin', onCapFocusIn, true);

    // Also check if panel is inside ProseMirror
    let parent = el.parentElement;
    let insidePM = false;
    while (parent) {
      if (parent.classList.contains('ProseMirror') || parent.hasAttribute('contenteditable')) {
        insidePM = true;
        break;
      }
      parent = parent.parentElement;
    }
    console.log('[ConfigPanel] rendered. Inside ProseMirror DOM?', insidePM, 'Parent chain:', el.parentElement?.tagName, el.parentElement?.className);

    return () => {
      el.removeEventListener('mousedown', onCapMouseDown, true);
      el.removeEventListener('keydown', onCapKeyDown, true);
      el.removeEventListener('focusin', onCapFocusIn, true);
    };
  }, []);

  const handleChange = useCallback(
    (key: string, value: any) => {
      console.log('[ConfigPanel] handleChange', key, value);
      updateNodeConfig(programId, nodeId, { [key]: value });
    },
    [programId, nodeId, updateNodeConfig]
  );

  return (
    <div ref={panelRef} className="program-config-panel" onMouseDown={(e) => { console.log('[ConfigPanel] panel onMouseDown'); e.stopPropagation(); }}>
      <div className="program-config-header">
        <span style={{ marginRight: 6 }}>{plugin.icon}</span>
        <span className="program-config-title">{plugin.label}</span>
        <button
          className="program-config-close"
          onClick={onClose}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          <X size={14} />
        </button>
      </div>
      <div className="program-config-body">
        {plugin.configSchema.map((field) => (
          <div key={field.key} className="program-config-field">
            {field.type !== 'boolean' && (
              <label className="program-config-label">{field.label}</label>
            )}
            <ConfigFieldInput
              field={field}
              value={config[field.key]}
              onChange={(val) => handleChange(field.key, val)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
