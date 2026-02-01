import type { GrafanaCredentials } from '@dardocs/core';

export interface GrafanaDataSource {
  uid: string;
  name: string;
  type: string;
}

export interface GrafanaPanelTarget {
  expr?: string;        // PromQL
  legendFormat?: string;
  refId: string;
  datasource?: { type: string; uid: string };
}

export interface GrafanaPanelJSON {
  type: string;          // 'timeseries', 'stat', 'gauge', 'barchart', 'table'
  title: string;
  targets: GrafanaPanelTarget[];
  fieldConfig?: Record<string, unknown>;
  options?: Record<string, unknown>;
}

function headers(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
}

/**
 * List available data sources from a Grafana instance.
 */
export async function getDataSources(
  creds: GrafanaCredentials
): Promise<GrafanaDataSource[]> {
  const res = await fetch(`${creds.url}/api/datasources`, {
    headers: headers(creds.apiKey),
  });
  if (!res.ok) throw new Error(`Grafana API error: ${res.status}`);

  const data = await res.json();
  return data.map((ds: { uid: string; name: string; type: string }) => ({
    uid: ds.uid,
    name: ds.name,
    type: ds.type,
  }));
}

/**
 * Create a Grafana dashboard with a single panel and return the dashboard URL.
 */
export async function createDashboard(
  creds: GrafanaCredentials,
  panel: GrafanaPanelJSON,
  dataSourceUid?: string,
): Promise<string> {
  // Attach data source to targets if specified
  const targets = panel.targets.map((t) => ({
    ...t,
    datasource: dataSourceUid
      ? { type: 'prometheus', uid: dataSourceUid }
      : t.datasource,
  }));

  const dashboardPayload = {
    dashboard: {
      title: panel.title,
      panels: [
        {
          ...panel,
          targets,
          id: 1,
          gridPos: { h: 12, w: 24, x: 0, y: 0 },
        },
      ],
      time: { from: 'now-6h', to: 'now' },
      refresh: '30s',
    },
    overwrite: false,
  };

  const res = await fetch(`${creds.url}/api/dashboards/db`, {
    method: 'POST',
    headers: headers(creds.apiKey),
    body: JSON.stringify(dashboardPayload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Grafana API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return `${creds.url}${data.url}`;
}
