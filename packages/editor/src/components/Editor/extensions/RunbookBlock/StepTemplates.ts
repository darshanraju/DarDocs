import type { RunbookStep, StepAutomation } from '@dardocs/core';
import { createRunbookStep } from '@dardocs/core';

export interface StepTemplate {
  name: string;
  category: string;
  description: string;
  step: Partial<RunbookStep> & { automation?: StepAutomation };
}

export const STEP_TEMPLATES: StepTemplate[] = [
  // Infrastructure
  {
    name: 'Check CPU Usage',
    category: 'Infrastructure',
    description: 'Monitor CPU utilization across hosts',
    step: {
      label: 'Check CPU Usage',
      description: 'Verify CPU utilization is within acceptable thresholds across all production hosts',
      expectedOutcome: 'CPU usage below 85% on all hosts',
      automation: { connector: 'grafana', query: 'node_cpu_usage_percent', timeRange: '15m' },
    },
  },
  {
    name: 'Check Memory Usage',
    category: 'Infrastructure',
    description: 'Monitor memory utilization',
    step: {
      label: 'Check Memory Usage',
      description: 'Verify memory usage is not approaching OOM thresholds',
      expectedOutcome: 'Memory usage below 90% on all hosts',
      automation: { connector: 'grafana', query: 'node_memory_usage_percent', timeRange: '15m' },
    },
  },
  {
    name: 'Check Disk Space',
    category: 'Infrastructure',
    description: 'Verify disk space availability',
    step: {
      label: 'Check Disk Space',
      description: 'Ensure disk utilization is not critically high',
      expectedOutcome: 'Disk usage below 80% on all volumes',
      automation: { connector: 'cloudwatch', query: 'EC2 disk usage', timeRange: '1h' },
    },
  },

  // Application
  {
    name: 'Check Error Rate',
    category: 'Application',
    description: 'Monitor application error rates',
    step: {
      label: 'Check Error Rate',
      description: 'Verify HTTP 5xx error rate is within acceptable bounds',
      expectedOutcome: 'Error rate below 1%',
      automation: { connector: 'datadog', query: 'avg:http.error_rate{service:api}', timeRange: '15m' },
    },
  },
  {
    name: 'Check API Latency',
    category: 'Application',
    description: 'Monitor API response times',
    step: {
      label: 'Check API Latency',
      description: 'Verify P95/P99 latency is within SLA thresholds',
      expectedOutcome: 'P95 latency below 500ms',
      automation: { connector: 'prometheus', query: 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))', timeRange: '15m' },
    },
  },
  {
    name: 'Check Service Health',
    category: 'Application',
    description: 'Ping health check endpoints',
    step: {
      label: 'Check Service Health Endpoint',
      description: 'Verify the service health endpoint returns 200 OK',
      expectedOutcome: 'Health endpoint returns healthy status',
      automation: { connector: 'http', query: 'https://api.example.com/health' },
    },
  },
  {
    name: 'Check Request Throughput',
    category: 'Application',
    description: 'Monitor request volume',
    step: {
      label: 'Check Request Throughput',
      description: 'Verify request rate is within expected bounds (not dropping or spiking)',
      expectedOutcome: 'Request rate within 20% of baseline',
      automation: { connector: 'grafana', query: 'rate(http_requests_total[5m])', timeRange: '30m' },
    },
  },

  // Errors & Exceptions
  {
    name: 'Check Sentry Issues',
    category: 'Errors',
    description: 'Review recent Sentry error issues',
    step: {
      label: 'Review Recent Sentry Issues',
      description: 'Check for new or spiking error issues in Sentry',
      expectedOutcome: 'No new critical issues in the last hour',
      automation: { connector: 'sentry', query: 'is:unresolved level:error', timeRange: '1h' },
    },
  },
  {
    name: 'Check Recent Releases',
    category: 'Errors',
    description: 'Check if a recent deployment could be the cause',
    step: {
      label: 'Check Recent Releases',
      description: 'Review recent deployments that may have introduced the issue',
      expectedOutcome: 'No problematic releases in the incident timeframe',
      automation: { connector: 'sentry', query: 'releases', metadata: { queryType: 'releases' } },
    },
  },

  // Database
  {
    name: 'Check Database Connections',
    category: 'Database',
    description: 'Monitor database connection pool',
    step: {
      label: 'Check Database Connections',
      description: 'Verify database connection pool is not exhausted',
      expectedOutcome: 'Connection pool usage below 80%',
      automation: { connector: 'cloudwatch', query: 'RDS database connections', timeRange: '15m' },
    },
  },
  {
    name: 'Check Database CPU',
    category: 'Database',
    description: 'Monitor database CPU usage',
    step: {
      label: 'Check Database CPU',
      description: 'Verify RDS/database CPU utilization is healthy',
      expectedOutcome: 'Database CPU below 70%',
      automation: { connector: 'cloudwatch', query: 'RDS CPU utilization', timeRange: '15m' },
    },
  },

  // Incident Management
  {
    name: 'Check PagerDuty Incidents',
    category: 'Incident',
    description: 'Review active PagerDuty incidents',
    step: {
      label: 'Check Active Incidents',
      description: 'Review currently active PagerDuty incidents for context',
      expectedOutcome: 'Understand the full scope of the incident',
      automation: { connector: 'pagerduty', query: 'incidents' },
    },
  },
  {
    name: 'Check On-Call Schedule',
    category: 'Incident',
    description: 'See who is currently on-call',
    step: {
      label: 'Check On-Call Schedule',
      description: 'Identify current on-call engineers for escalation',
      automation: { connector: 'pagerduty', query: 'oncall', metadata: { queryType: 'oncall' } },
    },
  },
  {
    name: 'Check Datadog Monitors',
    category: 'Incident',
    description: 'Review Datadog monitor statuses',
    step: {
      label: 'Check Monitor Alerts',
      description: 'Review all Datadog monitors to identify which alerts are firing',
      expectedOutcome: 'Identify all firing alerts related to the incident',
      automation: { connector: 'datadog', query: 'monitors', metadata: { queryType: 'monitors' } },
    },
  },
];

export const TEMPLATE_CATEGORIES = Array.from(
  new Set(STEP_TEMPLATES.map(t => t.category))
);

export function getTemplatesByCategory(category: string): StepTemplate[] {
  return STEP_TEMPLATES.filter(t => t.category === category);
}

export function createStepFromTemplate(template: StepTemplate): RunbookStep {
  return createRunbookStep(template.step);
}
