import { useCallback } from 'react';
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
        />
      );
    case 'select':
      return (
        <select
          className="program-config-select"
          value={value ?? field.defaultValue ?? ''}
          onChange={(e) => onChange(e.target.value)}
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
        <label className="program-config-checkbox">
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

  const handleChange = useCallback(
    (key: string, value: any) => {
      updateNodeConfig(programId, nodeId, { [key]: value });
    },
    [programId, nodeId, updateNodeConfig]
  );

  return (
    <div className="program-config-panel" onMouseDown={(e) => e.stopPropagation()}>
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
