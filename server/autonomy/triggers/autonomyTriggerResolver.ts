export interface AutonomyTriggerDecision {
  shouldExecute: boolean;
  reason: 'explicit' | 'inactivity' | 'none';
  tasksToExecute: string[];
}

const TRIGGER_PHRASES = [
  'go ahead',
  'work on this',
  'take it from here',
  'you handle it',
  'start working',
  'begin execution',
  'handle this autonomously',
  'go work on',
];

export function resolveAutonomyTrigger(input: {
  userMessage?: string;
  lastUserActivityAt: Date | null;
  pendingTasks: Array<{ id: string; status: string }>;
  autonomyEnabled: boolean;
}): AutonomyTriggerDecision {
  if (!input.autonomyEnabled) {
    return { shouldExecute: false, reason: 'none', tasksToExecute: [] };
  }

  const lower = (input.userMessage ?? '').toLowerCase();
  const hasExplicitTrigger = TRIGGER_PHRASES.some(phrase => lower.includes(phrase));

  if (hasExplicitTrigger) {
    const todoTasks = input.pendingTasks
      .filter(t => t.status === 'todo')
      .map(t => t.id);

    if (todoTasks.length === 0) {
      return { shouldExecute: false, reason: 'none', tasksToExecute: [] };
    }

    return { shouldExecute: true, reason: 'explicit', tasksToExecute: todoTasks };
  }

  return { shouldExecute: false, reason: 'none', tasksToExecute: [] };
}
