import { useState, useEffect, useCallback, useRef } from 'react';
import { DarDocsEditor } from '@dardocs/editor';
import { deserializeDocument, serializeDocument } from '@dardocs/core';
import type { DarDocsDocument } from '@dardocs/core';
import '@dardocs/editor/styles';

// Acquire the VS Code API (available in webview context)
declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

const vscode = acquireVsCodeApi();

export function WebviewApp() {
  const [doc, setDoc] = useState<DarDocsDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isExternalUpdate = useRef(false);

  // Listen for messages from the extension host
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (msg.type === 'load') {
        try {
          const parsed = deserializeDocument(msg.content);
          isExternalUpdate.current = true;
          setDoc(parsed);
          setError(null);
        } catch (e) {
          setError(`Failed to parse document: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    };

    window.addEventListener('message', handler);

    // Signal that webview is ready to receive data
    vscode.postMessage({ type: 'ready' });

    return () => window.removeEventListener('message', handler);
  }, []);

  // Send edits back to extension host
  const handleChange = useCallback((updatedDoc: DarDocsDocument) => {
    // Don't echo back external updates
    if (isExternalUpdate.current) {
      isExternalUpdate.current = false;
      return;
    }

    setDoc(updatedDoc);
    vscode.postMessage({
      type: 'edit',
      content: serializeDocument(updatedDoc),
    });
  }, []);

  if (error) {
    return (
      <div style={{ padding: 24, color: '#ef4444', fontFamily: 'system-ui' }}>
        <h2>Error loading document</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!doc) {
    return (
      <div style={{ padding: 24, color: '#9ca3af', fontFamily: 'system-ui' }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{
        fontSize: '2.75rem',
        fontWeight: 700,
        lineHeight: 1.2,
        color: '#1f2937',
        marginBottom: '1rem',
      }}>
        {doc.metadata.title || 'Untitled'}
      </h1>
      <DarDocsEditor
        document={doc}
        onChange={handleChange}
        editable={true}
      />
    </div>
  );
}
