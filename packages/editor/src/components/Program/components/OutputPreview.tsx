import type { ProgramRunResult } from '../registry';
import type { ProgramNode } from '../registry';
import { getNodeType } from '../registry';

interface OutputPreviewProps {
  result: ProgramRunResult;
  nodes: ProgramNode[];
}

function renderValue(value: any, format: string): React.ReactNode {
  if (value === undefined || value === null) return <span className="program-output-empty">null</span>;

  switch (format) {
    case 'json':
      return <pre className="program-output-json">{JSON.stringify(value, null, 2)}</pre>;
    case 'text':
      return <pre className="program-output-text">{String(value)}</pre>;
    case 'table': {
      if (!Array.isArray(value) || value.length === 0) {
        return <pre className="program-output-json">{JSON.stringify(value, null, 2)}</pre>;
      }
      const keys = Object.keys(value[0]);
      return (
        <div className="program-output-table-wrap">
          <table className="program-output-table">
            <thead>
              <tr>
                {keys.map((k) => (
                  <th key={k}>{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {value.slice(0, 50).map((row: any, i: number) => (
                <tr key={i}>
                  {keys.map((k) => (
                    <td key={k}>{typeof row[k] === 'object' ? JSON.stringify(row[k]) : String(row[k] ?? '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {value.length > 50 && <div className="program-output-truncated">Showing 50 of {value.length} rows</div>}
        </div>
      );
    }
    case 'card':
    default: {
      if (typeof value === 'string') {
        return <div className="program-output-card-text">{value}</div>;
      }
      if (Array.isArray(value)) {
        return (
          <div className="program-output-cards">
            {value.slice(0, 10).map((item, i) => (
              <div key={i} className="program-output-card">
                {typeof item === 'object'
                  ? Object.entries(item).map(([k, v]) => (
                      <div key={k} className="program-output-card-field">
                        <span className="program-output-card-key">{k}</span>
                        <span className="program-output-card-val">{String(v)}</span>
                      </div>
                    ))
                  : String(item)}
              </div>
            ))}
            {value.length > 10 && (
              <div className="program-output-truncated">+{value.length - 10} more items</div>
            )}
          </div>
        );
      }
      if (typeof value === 'object') {
        return (
          <div className="program-output-card">
            {Object.entries(value).map(([k, v]) => (
              <div key={k} className="program-output-card-field">
                <span className="program-output-card-key">{k}</span>
                <span className="program-output-card-val">
                  {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                </span>
              </div>
            ))}
          </div>
        );
      }
      return <div className="program-output-card-text">{String(value)}</div>;
    }
  }
}

export function OutputPreview({ result, nodes }: OutputPreviewProps) {
  // Find output/visualize nodes to display
  const outputNodes = nodes.filter((n) => {
    const plugin = getNodeType(n.data.pluginType);
    return plugin && plugin.outputs.length === 0; // Output nodes have no outputs
  });

  // If no explicit output nodes, show the last node's output
  const displayNodes = outputNodes.length > 0 ? outputNodes : nodes.slice(-1);

  if (!result.success && result.error) {
    return (
      <div className="program-output-section">
        <div className="program-output-header program-output-header-err">Result</div>
        <div className="program-output-error">{result.error}</div>
      </div>
    );
  }

  const hasAnyOutput = displayNodes.some((n) => result.nodeOutputs[n.id]?.output !== undefined);
  if (!hasAnyOutput) return null;

  return (
    <div className="program-output-section">
      <div className="program-output-header program-output-header-ok">Result</div>
      {displayNodes.map((node) => {
        const nodeResult = result.nodeOutputs[node.id];
        if (!nodeResult?.output && !nodeResult?.error) return null;
        const plugin = getNodeType(node.data.pluginType);
        const format = node.data.config.format || 'card';
        const title = node.data.config.title || plugin?.label || 'Output';

        return (
          <div key={node.id} className="program-output-item">
            <div className="program-output-item-title">{title}</div>
            {nodeResult.error ? (
              <div className="program-output-error">{nodeResult.error}</div>
            ) : (
              renderValue(nodeResult.output, format)
            )}
          </div>
        );
      })}
    </div>
  );
}
