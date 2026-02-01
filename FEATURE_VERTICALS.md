# Feature Verticals

## Runbook Roadmap

### 1. Alert-Triggered Auto-Execution

Right now runbooks require a manual click ("AI Execute"). Add a webhook listener so external alerts auto-start a runbook.

- PagerDuty/Datadog/Sentry fires a webhook to the agent server
- Agent matches the alert to a runbook template (by service name, alert type, etc.)
- Runbook auto-executes and posts results back -- no human needed to click "start"
- The runbook block in the document updates in real-time via the existing WebSocket

### 2. Hypothesis-Driven Output

Restructure AI reasoning to present ranked hypotheses instead of flat pass/fail verdicts.

- Generate ranked hypotheses (e.g. "70% likely: memory leak from recent deploy", "20% likely: upstream API degradation")
- Show the evidence chain for each hypothesis with direct links to source data
- Let engineers accept/reject hypotheses instead of just reading a wall of text

### 3. Slack/Chat Integration for Results

Add communication channels so runbook results reach the team where they already work.

- "Share to Slack" button on completed runbooks that posts a formatted summary to a webhook
- Real-time streaming of runbook progress to a Slack channel as each step completes
- Allow triggering a runbook from Slack with a `/dardocs-runbook <template>` command

### 4. Incident History as a Knowledge Graph

Evolve the basic localStorage history into a knowledge graph that improves analysis over time.

- When the AI analyzes a step, search past execution history for similar patterns ("This looks similar to the CPU spike runbook from Jan 15 -- that was caused by a cron job")
- Surface "related past executions" in the history panel
- Feed past outcomes back into the AI prompt context for better future analysis

### 5. Auto-Generated Runbooks from Alerts

Instead of humans manually building runbooks, the AI generates them from alert context.

- Receive an alert payload and auto-generate a full runbook (steps + connector queries) based on alert type and affected service
- Use step templates as building blocks but compose them dynamically
- Engineers review and tweak rather than build from scratch

### 6. Continuous Monitoring Mode

Instead of one-shot execution, allow a runbook to run in a loop and track trends.

- Re-execute every N minutes and track metric trends over time
- Auto-escalate if metrics worsen (e.g. error rate still climbing after 10 min)
- Show a timeline view of how the situation evolved
