import type { JSONContent } from '@tiptap/react';

export interface DocumentTemplate {
  id: string;
  title: string;
  icon: string;
  description: string;
  content: JSONContent;
}

function heading(level: number, text: string): JSONContent {
  return { type: 'heading', attrs: { level }, content: [{ type: 'text', text }] };
}

function p(text = ''): JSONContent {
  if (!text) return { type: 'paragraph' };
  return { type: 'paragraph', content: [{ type: 'text', text }] };
}

function bullet(items: string[]): JSONContent {
  return {
    type: 'bulletList',
    content: items.map((t) => ({
      type: 'listItem',
      content: [p(t)],
    })),
  };
}

function hr(): JSONContent {
  return { type: 'horizontalRule' };
}

export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'meeting-notes',
    title: 'Meeting Notes',
    icon: '\uD83D\uDDD3\uFE0F',
    description: 'Agenda, discussion & action items',
    content: {
      type: 'doc',
      content: [
        heading(2, 'Meeting Details'),
        bullet([
          'Date: ',
          'Attendees: ',
          'Facilitator: ',
        ]),
        hr(),
        heading(2, 'Agenda'),
        bullet([
          'Topic 1',
          'Topic 2',
          'Topic 3',
        ]),
        hr(),
        heading(2, 'Discussion Notes'),
        p(),
        hr(),
        heading(2, 'Action Items'),
        bullet([
          '[ ] Action item — Owner — Due date',
        ]),
        hr(),
        heading(2, 'Decisions Made'),
        bullet([
          'Decision 1',
        ]),
      ],
    },
  },

  {
    id: 'technical-design',
    title: 'Technical Design',
    icon: '\uD83D\uDCD0',
    description: 'RFC-style proposal with alternatives',
    content: {
      type: 'doc',
      content: [
        heading(2, 'Problem Statement'),
        p('Describe the problem this design addresses.'),
        hr(),
        heading(2, 'Proposed Solution'),
        p('Describe the approach at a high level.'),
        heading(3, 'Architecture'),
        p(),
        heading(3, 'API Changes'),
        p(),
        heading(3, 'Data Model'),
        p(),
        hr(),
        heading(2, 'Alternatives Considered'),
        heading(3, 'Alternative A'),
        p('Description and trade-offs.'),
        heading(3, 'Alternative B'),
        p('Description and trade-offs.'),
        hr(),
        heading(2, 'Open Questions'),
        bullet([
          'Question 1',
        ]),
        hr(),
        heading(2, 'Rollout Plan'),
        bullet([
          'Phase 1: ',
          'Phase 2: ',
        ]),
      ],
    },
  },

  {
    id: 'postmortem',
    title: 'Postmortem',
    icon: '\uD83D\uDD25',
    description: 'Blameless incident review',
    content: {
      type: 'doc',
      content: [
        heading(2, 'Incident Summary'),
        bullet([
          'Severity: ',
          'Duration: ',
          'Impact: ',
          'Services affected: ',
        ]),
        hr(),
        heading(2, 'Timeline'),
        bullet([
          'HH:MM — Event description',
        ]),
        hr(),
        heading(2, 'Root Cause'),
        p('Describe the root cause. Focus on systems and processes, not individuals.'),
        hr(),
        heading(2, 'Contributing Factors'),
        bullet([
          'Factor 1',
        ]),
        hr(),
        heading(2, 'What Went Well'),
        bullet([
          'Item 1',
        ]),
        hr(),
        heading(2, 'Action Items'),
        bullet([
          '[ ] Action — Owner — Due date',
        ]),
      ],
    },
  },

  {
    id: 'project-brief',
    title: 'Project Brief',
    icon: '\uD83D\uDE80',
    description: 'Goals, scope, timeline & risks',
    content: {
      type: 'doc',
      content: [
        heading(2, 'Overview'),
        p('One-paragraph summary of the project.'),
        hr(),
        heading(2, 'Goals'),
        bullet([
          'Goal 1',
          'Goal 2',
        ]),
        heading(2, 'Non-Goals'),
        bullet([
          'Non-goal 1',
        ]),
        hr(),
        heading(2, 'Scope'),
        p('What is included and excluded.'),
        hr(),
        heading(2, 'Timeline'),
        bullet([
          'Milestone 1 — Date',
          'Milestone 2 — Date',
          'Launch — Date',
        ]),
        hr(),
        heading(2, 'Stakeholders'),
        bullet([
          'PM: ',
          'Engineering lead: ',
          'Design: ',
        ]),
        hr(),
        heading(2, 'Risks & Mitigations'),
        bullet([
          'Risk 1 — Mitigation',
        ]),
      ],
    },
  },

  {
    id: 'sprint-planning',
    title: 'Sprint Planning',
    icon: '\uD83C\uDFC3',
    description: 'Sprint goal, stories & capacity',
    content: {
      type: 'doc',
      content: [
        heading(2, 'Sprint Goal'),
        p('What does success look like at the end of this sprint?'),
        hr(),
        heading(2, 'Capacity'),
        bullet([
          'Team size: ',
          'Availability notes: ',
          'Estimated velocity: ',
        ]),
        hr(),
        heading(2, 'Stories'),
        heading(3, 'Must Have'),
        bullet([
          'Story — Points — Assignee',
        ]),
        heading(3, 'Should Have'),
        bullet([
          'Story — Points — Assignee',
        ]),
        heading(3, 'Nice to Have'),
        bullet([
          'Story — Points — Assignee',
        ]),
        hr(),
        heading(2, 'Risks & Dependencies'),
        bullet([
          'Risk or dependency 1',
        ]),
        hr(),
        heading(2, 'Carryover from Last Sprint'),
        bullet([
          'Item 1',
        ]),
      ],
    },
  },
];
