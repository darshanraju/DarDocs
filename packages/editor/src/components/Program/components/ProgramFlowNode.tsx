import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { getNodeType, type ProgramNodeData } from '../registry';
import { CheckCircle2, XCircle } from 'lucide-react';

function ProgramFlowNodeInner({ data, selected }: NodeProps & { data: ProgramNodeData }) {
  const plugin = getNodeType(data.pluginType);
  if (!plugin) return <div className="program-node">Unknown node type</div>;

  const hasOutput = data.lastOutput !== undefined;
  const hasError = !!data.lastError;

  return (
    <div
      className={`program-node ${selected ? 'program-node-selected' : ''}`}
      style={{ borderColor: plugin.color }}
    >
      {plugin.inputs.length > 0 && (
        <Handle
          type="target"
          position={Position.Left}
          className="program-handle"
          style={{ background: plugin.color }}
        />
      )}

      <div className="program-node-header" style={{ background: plugin.color }}>
        <span className="program-node-icon">{plugin.icon}</span>
        <span className="program-node-label">{plugin.label}</span>
        {hasOutput && !hasError && <CheckCircle2 size={12} className="program-node-status-ok" />}
        {hasError && <XCircle size={12} className="program-node-status-err" />}
      </div>

      <div className="program-node-body">
        {plugin.configSchema.slice(0, 2).map((field) => {
          const val = data.config[field.key];
          if (!val) return null;
          const display = String(val).length > 40 ? String(val).slice(0, 40) + '...' : String(val);
          return (
            <div key={field.key} className="program-node-config-preview">
              <span className="program-node-config-key">{field.label}:</span>
              <span className="program-node-config-val">{display}</span>
            </div>
          );
        })}
        {plugin.configSchema.length === 0 && (
          <div className="program-node-config-preview program-node-empty">No configuration</div>
        )}
      </div>

      {hasError && (
        <div className="program-node-error">{data.lastError}</div>
      )}

      {plugin.outputs.length > 0 && (
        <Handle
          type="source"
          position={Position.Right}
          className="program-handle"
          style={{ background: plugin.color }}
        />
      )}
    </div>
  );
}

export const ProgramFlowNode = memo(ProgramFlowNodeInner);
