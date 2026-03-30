/**
 * Focused test: taskGraphPersistence (Plan 06-03 Task 1).
 * Run: DATABASE_URL=postgresql://stub:stub@localhost/stub npx tsx scripts/test-task-graph-persistence.ts
 */

process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://stub:stub@localhost/stub';

import { persistTaskGraph, loadTaskGraph } from '../server/autonomy/taskGraph/taskGraphPersistence.js';
import type { IStorage } from '../server/storage.js';
import type { Project } from '../shared/schema.js';

function makeMockProject(id: string): Project {
  return {
    id, userId: 'u1', name: 'Test', emoji: '🧪', description: null, color: 'blue',
    isExpanded: true, progress: 0, timeSpent: '0h', coreDirection: {},
    executionRules: null, teamCulture: null, brain: {},
  };
}

async function main(): Promise<void> {
  console.log('=== taskGraphPersistence: Test 1 — persistTaskGraph ===');

  const project = makeMockProject('proj-1');
  let stored: any = null;

  const mockStorage: Partial<IStorage> = {
    getProject: async (_id: string) => project,
    updateProject: async (_id: string, updates: any) => {
      stored = updates.executionRules;
      return { ...project, executionRules: updates.executionRules };
    },
  };

  const graph = { graphId: 'g1', objective: 'test', tasks: [] };
  await persistTaskGraph('proj-1', graph, mockStorage as IStorage);

  if (stored === null || (stored as any)?.taskGraph?.graphId !== 'g1') {
    console.error('FAIL: executionRules.taskGraph.graphId should be g1, got:', stored);
    process.exit(1);
  }
  console.log('PASS: persistTaskGraph stored graph correctly');

  // Test 2: loadTaskGraph retrieves stored graph
  console.log('\n=== taskGraphPersistence: Test 2 — loadTaskGraph ===');

  const mockStorage2: Partial<IStorage> = {
    getProject: async (_id: string) => ({
      ...project,
      executionRules: { taskGraph: graph },
    }),
  };

  const loaded = await loadTaskGraph('proj-1', mockStorage2 as IStorage);
  if (!loaded || (loaded as any)?.graphId !== 'g1') {
    console.error('FAIL: loaded graph graphId should be g1, got:', loaded);
    process.exit(1);
  }
  console.log('PASS: loadTaskGraph retrieved stored graph correctly');
  process.exit(0);
}

main().catch((err) => { console.error('ERROR:', err); process.exit(1); });
