import type { JSONContent } from '@tiptap/react';
import type { TechDocsAnalysisResult } from './types';

/**
 * Generates a full TipTap JSONContent document from Tech Docs analysis results.
 * Produces a structured technical design document with all sections.
 */
export function generateTechDocsDocument(
  result: TechDocsAnalysisResult,
): JSONContent {
  const content: JSONContent[] = [];

  // ─── Document Header ──────────────────────────────────────────
  content.push(
    heading(1, `Technical Design — ${result.config.featureTitle}`),
    paragraph(
      `Generated on ${new Date(result.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}. Repository: ${result.repoName}.`,
    ),
    horizontalRule(),
  );

  // 1. Overview & Objective
  content.push(...overviewSection(result));

  // 2. Background & Context
  content.push(...backgroundSection(result));

  // 3. Scope & Non-Goals
  content.push(...scopeSection(result));

  // 4. Detailed Design
  content.push(heading(2, 'Detailed Design'));

  // 4a. Data / Schema Changes
  content.push(...schemaSection(result));

  // 4b. API Changes
  content.push(...apiSection(result));

  // 4c. Service / Business Logic
  content.push(...affectedModulesSection(result));

  // 4d. Interaction Diagram
  content.push(...sequenceDiagramSection(result));

  // 5. Security Considerations
  content.push(...securitySection(result));

  // 6. Testing Plan
  content.push(...testPlanSection(result));

  // 7. Rollout Strategy
  content.push(...rolloutSection(result));

  // 8. Risks & Open Questions
  content.push(...risksSection(result));

  // 9. Alternatives Considered
  content.push(...alternativesSection(result));

  return { type: 'doc', content };
}

// ─── Section Generators ───────────────────────────────────────

function overviewSection(result: TechDocsAnalysisResult): JSONContent[] {
  return [
    heading(2, 'Overview & Objective'),
    paragraph(result.overview),
  ];
}

function backgroundSection(result: TechDocsAnalysisResult): JSONContent[] {
  const items: JSONContent[] = [
    heading(2, 'Background & Context'),
    paragraph(result.background),
  ];

  if (result.techStack.length > 0) {
    items.push(
      heading(3, 'Tech Stack'),
      bulletList(result.techStack),
    );
  }

  if (result.existingPatterns.length > 0) {
    items.push(
      heading(3, 'Existing Patterns'),
      paragraph('The codebase follows these conventions that this feature should respect:'),
      table(
        ['Pattern', 'Description', 'Key Files'],
        result.existingPatterns.map((p) => [
          p.name,
          p.description,
          p.files.slice(0, 3).join(', '),
        ]),
      ),
    );
  }

  return items;
}

function scopeSection(result: TechDocsAnalysisResult): JSONContent[] {
  const items: JSONContent[] = [heading(2, 'Scope & Non-Goals')];

  if (result.scope.length > 0) {
    items.push(
      heading(3, 'In Scope'),
      bulletList(result.scope),
    );
  }

  if (result.nonGoals.length > 0) {
    items.push(
      heading(3, 'Non-Goals'),
      bulletList(result.nonGoals),
    );
  }

  return items;
}

function schemaSection(result: TechDocsAnalysisResult): JSONContent[] {
  if (result.schemaChanges.length === 0) return [];

  const items: JSONContent[] = [
    heading(3, 'Data / Schema Changes'),
  ];

  for (const change of result.schemaChanges) {
    items.push(
      heading(4, `${change.changeType.toUpperCase()}: ${change.entity}`),
      paragraph(change.description),
    );

    if (change.fields && change.fields.length > 0) {
      items.push(
        table(
          ['Field', 'Type', 'Nullable', 'Description'],
          change.fields.map((f) => [
            f.name,
            f.type,
            f.nullable ? 'Yes' : 'No',
            f.description,
          ]),
        ),
      );
    }
  }

  return items;
}

function apiSection(result: TechDocsAnalysisResult): JSONContent[] {
  if (result.apiChanges.length === 0) return [];

  const items: JSONContent[] = [
    heading(3, 'API Changes'),
  ];

  for (const api of result.apiChanges) {
    items.push(
      heading(4, `${api.changeType === 'new' ? 'NEW' : 'MODIFY'}: ${api.method} ${api.path}`),
      paragraph(api.description),
    );

    const details: string[] = [];
    if (api.authRequired) details.push('Auth: Required');
    if (api.requestShape) details.push(`Request: ${api.requestShape}`);
    if (api.responseShape) details.push(`Response: ${api.responseShape}`);
    if (api.errorCodes && api.errorCodes.length > 0) {
      details.push(`Error Codes: ${api.errorCodes.join(', ')}`);
    }

    if (details.length > 0) {
      items.push(bulletList(details));
    }
  }

  return items;
}

function affectedModulesSection(result: TechDocsAnalysisResult): JSONContent[] {
  if (result.affectedModules.length === 0) return [];

  return [
    heading(3, 'Affected Modules'),
    paragraph('Files that need to be created or modified:'),
    table(
      ['Layer', 'File', 'Change', 'Description'],
      result.affectedModules.map((m) => [
        m.layer.toUpperCase(),
        m.filePath,
        m.changeType === 'create' ? 'CREATE' : 'MODIFY',
        m.description,
      ]),
    ),
  ];
}

function sequenceDiagramSection(result: TechDocsAnalysisResult): JSONContent[] {
  if (result.sequenceDiagram.length === 0) return [];

  // Build a Mermaid sequence diagram
  const mermaidLines = ['sequenceDiagram'];
  for (const step of result.sequenceDiagram) {
    mermaidLines.push(`    ${step.from}->>+${step.to}: ${step.action}`);
    if (step.description) {
      mermaidLines.push(`    Note right of ${step.to}: ${step.description}`);
    }
  }

  return [
    heading(3, 'Interaction Diagram'),
    paragraph('Request flow across components:'),
    codeBlock(mermaidLines.join('\n'), 'mermaid'),
  ];
}

function securitySection(result: TechDocsAnalysisResult): JSONContent[] {
  if (result.securityConsiderations.length === 0) return [];

  return [
    heading(2, 'Security Considerations'),
    table(
      ['Category', 'Severity', 'Description'],
      result.securityConsiderations.map((s) => [
        s.category.replace('-', ' ').toUpperCase(),
        s.severity.toUpperCase(),
        s.description,
      ]),
    ),
  ];
}

function testPlanSection(result: TechDocsAnalysisResult): JSONContent[] {
  if (result.testPlan.length === 0) return [];

  const items: JSONContent[] = [
    heading(2, 'Testing Plan'),
  ];

  const byLayer = groupBy(result.testPlan, (t) => t.layer);
  for (const [layer, tests] of Object.entries(byLayer)) {
    items.push(heading(3, `${layer.charAt(0).toUpperCase() + layer.slice(1)} Tests`));
    for (const test of tests) {
      items.push(
        paragraph(`${test.target}: ${test.description}`),
      );
      if (test.assertions.length > 0) {
        items.push(bulletList(test.assertions));
      }
    }
  }

  return items;
}

function rolloutSection(result: TechDocsAnalysisResult): JSONContent[] {
  if (result.rolloutSteps.length === 0) return [];

  return [
    heading(2, 'Rollout Strategy'),
    orderedList(
      result.rolloutSteps
        .sort((a, b) => a.order - b.order)
        .map((s) => {
          const badge = `[${s.type.toUpperCase()}]`;
          return s.notes
            ? `${badge} ${s.description} — ${s.notes}`
            : `${badge} ${s.description}`;
        }),
    ),
  ];
}

function risksSection(result: TechDocsAnalysisResult): JSONContent[] {
  const risks = result.risks.filter((r) => !r.isOpenQuestion);
  const openQuestions = result.risks.filter((r) => r.isOpenQuestion);

  if (risks.length === 0 && openQuestions.length === 0) return [];

  const items: JSONContent[] = [heading(2, 'Risks & Open Questions')];

  if (risks.length > 0) {
    items.push(
      heading(3, 'Risks'),
      table(
        ['Severity', 'Risk', 'Mitigation'],
        risks.map((r) => [
          r.severity.toUpperCase(),
          r.description,
          r.mitigation,
        ]),
      ),
    );
  }

  if (openQuestions.length > 0) {
    items.push(
      heading(3, 'Open Questions'),
      bulletList(openQuestions.map((q) => q.description)),
    );
  }

  return items;
}

function alternativesSection(result: TechDocsAnalysisResult): JSONContent[] {
  if (result.alternatives.length === 0) return [];

  const items: JSONContent[] = [
    heading(2, 'Alternatives Considered'),
  ];

  for (const alt of result.alternatives) {
    items.push(
      heading(3, alt.approach),
      paragraph(`Rejected: ${alt.rejectionReason}`),
    );

    if (alt.pros.length > 0) {
      items.push(
        paragraph('Pros:'),
        bulletList(alt.pros),
      );
    }
    if (alt.cons.length > 0) {
      items.push(
        paragraph('Cons:'),
        bulletList(alt.cons),
      );
    }
  }

  return items;
}

// ─── Utilities ────────────────────────────────────────────────

function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of items) {
    const key = keyFn(item);
    if (!result[key]) result[key] = [];
    result[key].push(item);
  }
  return result;
}

// ─── TipTap Node Helpers ──────────────────────────────────────

function heading(level: number, text: string): JSONContent {
  return {
    type: 'heading',
    attrs: { level },
    content: [{ type: 'text', text }],
  };
}

function paragraph(text: string): JSONContent {
  return {
    type: 'paragraph',
    content: [{ type: 'text', text }],
  };
}

function horizontalRule(): JSONContent {
  return { type: 'horizontalRule' };
}

function bulletList(items: string[]): JSONContent {
  return {
    type: 'bulletList',
    content: items.map((item) => ({
      type: 'listItem',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: item }] }],
    })),
  };
}

function orderedList(items: string[]): JSONContent {
  return {
    type: 'orderedList',
    attrs: { start: 1 },
    content: items.map((item) => ({
      type: 'listItem',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: item }] }],
    })),
  };
}

function codeBlock(code: string, language: string): JSONContent {
  return {
    type: 'codeBlock',
    attrs: { language },
    content: [{ type: 'text', text: code }],
  };
}

function table(headers: string[], rows: string[][]): JSONContent {
  return {
    type: 'table',
    content: [
      {
        type: 'tableRow',
        content: headers.map((h) => ({
          type: 'tableHeader',
          attrs: { colspan: 1, rowspan: 1 },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: h }] }],
        })),
      },
      ...rows.map((row) => ({
        type: 'tableRow',
        content: row.map((cell) => ({
          type: 'tableCell',
          attrs: { colspan: 1, rowspan: 1 },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: cell }] }],
        })),
      })),
    ],
  };
}
