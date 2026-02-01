export type MonitorProviderId = 'grafana' | 'sentry' | 'datadog' | 'pagerduty';

export interface MonitorProviderConfig {
  id: MonitorProviderId;
  name: string;
  description: string;
  iconColor: string;
  placeholder: string;
  urlPattern: RegExp;
  getEmbedUrl: (url: string) => string;
  defaultHeight: number;
  status: 'available' | 'coming-soon';
}
