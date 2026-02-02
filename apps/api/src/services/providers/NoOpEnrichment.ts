import type { EnrichmentProvider } from '@dardocs/core';
import type { ApiEndpoint, GlossaryTerm, HotZone, ErrorPattern } from '@dardocs/core';

export class NoOpEnrichment implements EnrichmentProvider {
  async enrichEndpoints(endpoints: ApiEndpoint[]): Promise<ApiEndpoint[]> {
    return endpoints;
  }

  async enrichGlossary(terms: GlossaryTerm[]): Promise<GlossaryTerm[]> {
    return terms;
  }

  async enrichHotZones(zones: HotZone[]): Promise<HotZone[]> {
    return zones;
  }

  async enrichErrors(errors: ErrorPattern[]): Promise<ErrorPattern[]> {
    return errors;
  }
}
