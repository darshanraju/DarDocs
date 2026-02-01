import type { Connector, ConnectorQueryParams, ConnectorResult } from './types.js';
import { MOCK_MODE } from './types.js';
import { mockCloudWatchMetrics } from './mockData.js';

export class CloudWatchConnector implements Connector {
  name = 'cloudwatch';
  description = 'Query AWS CloudWatch for EC2, RDS, ALB, and Lambda metrics';
  supportedQueryTypes = ['EC2 metrics', 'RDS metrics', 'ALB metrics', 'Lambda metrics'];

  validateCredentials(credentials: Record<string, unknown>): { valid: boolean; missing: string[] } {
    const missing: string[] = [];
    if (!credentials.accessKeyId) missing.push('accessKeyId');
    if (!credentials.secretAccessKey) missing.push('secretAccessKey');
    if (!credentials.region) missing.push('region');
    return { valid: missing.length === 0, missing };
  }

  async query(params: ConnectorQueryParams): Promise<ConnectorResult> {
    const { query, timeRange = '1h' } = params;

    if (MOCK_MODE) {
      return mockCloudWatchMetrics(query, timeRange);
    }

    // Real CloudWatch implementation requires AWS SDK
    return {
      success: false,
      data: '',
      error: 'CloudWatch connector requires AWS SDK integration. Use MOCK_MODE=true for testing.',
    };
  }
}
