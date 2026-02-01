import type { MonitorProviderId, MonitorProviderConfig } from './types';

export const MONITOR_PROVIDERS: Record<MonitorProviderId, MonitorProviderConfig> = {
  grafana: {
    id: 'grafana',
    name: 'Grafana',
    description: 'Embed dashboards and panels',
    iconColor: '#f46800',
    placeholder: 'Paste a Grafana dashboard or panel URL',
    urlPattern: /^https?:\/\/.+\/(d|d-solo|dashboard)\//,
    getEmbedUrl: (url) => {
      let embedUrl = url;
      if (url.includes('/d/') && !url.includes('/d-solo/')) {
        embedUrl = url.replace('/d/', '/d-solo/');
      }
      const separator = embedUrl.includes('?') ? '&' : '?';
      return `${embedUrl}${separator}kiosk`;
    },
    defaultHeight: 350,
    status: 'available',
  },
  sentry: {
    id: 'sentry',
    name: 'Sentry',
    description: 'Error tracking and issues',
    iconColor: '#362d59',
    placeholder: 'Paste a Sentry project or issue URL',
    urlPattern: /^https?:\/\/.*sentry\.io\//,
    getEmbedUrl: (url) => url,
    defaultHeight: 400,
    status: 'coming-soon',
  },
  datadog: {
    id: 'datadog',
    name: 'Datadog',
    description: 'Dashboards and monitors',
    iconColor: '#632ca6',
    placeholder: 'Paste a Datadog dashboard URL',
    urlPattern: /^https?:\/\/.*datadoghq\.com\//,
    getEmbedUrl: (url) => url,
    defaultHeight: 400,
    status: 'coming-soon',
  },
  pagerduty: {
    id: 'pagerduty',
    name: 'PagerDuty',
    description: 'Incidents and services',
    iconColor: '#06ac38',
    placeholder: 'Paste a PagerDuty service or incident URL',
    urlPattern: /^https?:\/\/.*pagerduty\.com\//,
    getEmbedUrl: (url) => url,
    defaultHeight: 400,
    status: 'coming-soon',
  },
};

export const MONITOR_PROVIDER_LIST: MonitorProviderConfig[] = Object.values(MONITOR_PROVIDERS);
