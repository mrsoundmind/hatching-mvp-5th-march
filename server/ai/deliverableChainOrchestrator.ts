/**
 * Deliverable Chain Orchestrator — coordinates cross-agent deliverable production.
 *
 * When an upstream deliverable is created, this module determines which downstream
 * agents should produce linked deliverables and triggers generation.
 */

import { storage } from '../storage.js';
import { generateDeliverable } from './deliverableGenerator.js';
import type { Deliverable } from '@shared/schema';

/**
 * Chain templates define the sequence of deliverables in a coordinated package.
 * Each step references upstream deliverables for context injection.
 */
export interface ChainStep {
  role: string;
  type: string;
  titleTemplate: string;
  dependsOn: number[]; // indices of upstream steps
  handoffTemplate: string;
}

export const CHAIN_TEMPLATES: Record<string, ChainStep[]> = {
  'launch': [
    { role: 'Product Manager', type: 'prd', titleTemplate: 'Product Requirements Document', dependsOn: [], handoffTemplate: '' },
    { role: 'Backend Developer', type: 'tech-spec', titleTemplate: 'Technical Specification', dependsOn: [0], handoffTemplate: 'Based on {0}. Focus on architecture and implementation feasibility.' },
    { role: 'Product Designer', type: 'design-brief', titleTemplate: 'Design Brief', dependsOn: [0, 1], handoffTemplate: 'Based on {0} and {1}. Align UX with technical constraints.' },
    { role: 'Growth Marketer', type: 'gtm-plan', titleTemplate: 'Go-to-Market Plan', dependsOn: [0], handoffTemplate: 'Based on {0}. Build positioning and launch strategy around the product vision.' },
    { role: 'Product Manager', type: 'project-plan', titleTemplate: 'Project Timeline', dependsOn: [0, 1], handoffTemplate: 'Based on {0} and {1}. Create realistic timeline accounting for technical complexity.' },
  ],
  'content-sprint': [
    { role: 'Content Writer', type: 'blog-post', titleTemplate: 'Blog Post', dependsOn: [], handoffTemplate: '' },
    { role: 'Social Media Manager', type: 'content-calendar', titleTemplate: 'Social Content Calendar', dependsOn: [0], handoffTemplate: 'Create social posts promoting {0}.' },
    { role: 'Email Specialist', type: 'email-sequence', titleTemplate: 'Email Nurture Sequence', dependsOn: [0], handoffTemplate: 'Build email sequence driving readers to {0}.' },
    { role: 'SEO Specialist', type: 'seo-brief', titleTemplate: 'SEO Optimization Brief', dependsOn: [0], handoffTemplate: 'Optimize {0} for search. Include keyword targets and meta descriptions.' },
  ],
  'research': [
    { role: 'Business Analyst', type: 'competitive-analysis', titleTemplate: 'Competitive Analysis', dependsOn: [], handoffTemplate: '' },
    { role: 'Business Analyst', type: 'market-research', titleTemplate: 'Market Research Report', dependsOn: [0], handoffTemplate: 'Deep dive into the market landscape identified in {0}.' },
    { role: 'Data Analyst', type: 'data-report', titleTemplate: 'Data Insights Report', dependsOn: [0, 1], handoffTemplate: 'Quantitative analysis supporting findings from {0} and {1}.' },
  ],
};

/**
 * Find the right agent for a role in a project.
 */
async function findAgentByRole(projectId: string, role: string) {
  const agents = await storage.getAgentsByProject(projectId);
  // Exact match first
  const exact = agents.find(a => a.role === role && !a.isSpecialAgent);
  if (exact) return exact;
  // Partial match (e.g., "Software Engineer" matches "Backend Developer" loosely)
  const partial = agents.find(a => a.role.toLowerCase().includes(role.toLowerCase().split(' ')[0]) && !a.isSpecialAgent);
  return partial || null;
}

/**
 * Build handoff notes by replacing {n} references with upstream deliverable titles.
 */
function buildHandoffNotes(template: string, upstreamDeliverables: Deliverable[]): string {
  let notes = template;
  for (let i = 0; i < upstreamDeliverables.length; i++) {
    notes = notes.replace(new RegExp(`\\{${i}\\}`, 'g'), `"${upstreamDeliverables[i].title}"`);
  }
  return notes;
}

export interface ChainResult {
  deliverables: Deliverable[];
  skippedSteps: Array<{ step: number; reason: string }>;
  totalTimeMs: number;
}

/**
 * Execute a deliverable chain for a package.
 * Produces deliverables sequentially, each receiving upstream context.
 */
export type ChainProgressCallback = (event: {
  step: number;
  totalSteps: number;
  agentName: string;
  agentRole: string;
  type: string;
  title: string;
  status: 'started' | 'completed' | 'skipped';
  deliverableId?: string;
  reason?: string;
}) => void;

export async function executeDeliverableChain(
  projectId: string,
  packageId: string,
  template: string,
  projectDescription: string,
  conversationId?: string,
  onProgress?: ChainProgressCallback,
): Promise<ChainResult> {
  const startTime = Date.now();
  const chain = CHAIN_TEMPLATES[template];
  if (!chain) {
    return { deliverables: [], skippedSteps: [{ step: 0, reason: `Unknown template: ${template}` }], totalTimeMs: 0 };
  }

  const produced: Deliverable[] = [];
  const skipped: Array<{ step: number; reason: string }> = [];

  for (let i = 0; i < chain.length; i++) {
    const step = chain[i];

    // Find agent for this step
    const agent = await findAgentByRole(projectId, step.role);
    if (!agent) {
      skipped.push({ step: i, reason: `No agent with role "${step.role}" found in project` });
      onProgress?.({ step: i, totalSteps: chain.length, agentName: '', agentRole: step.role, type: step.type, title: step.titleTemplate, status: 'skipped', reason: `No agent with role "${step.role}"` });
      continue;
    }

    // Gather upstream deliverables
    const upstreamDeliverables = step.dependsOn.map(idx => produced[idx]).filter(Boolean);
    const upstreamContext = upstreamDeliverables.map(d => `--- ${d.title} (by ${d.agentName}) ---\n${d.content}`).join('\n\n');
    const handoffNotes = step.handoffTemplate ? buildHandoffNotes(step.handoffTemplate, upstreamDeliverables) : undefined;

    try {
      onProgress?.({ step: i, totalSteps: chain.length, agentName: agent.name, agentRole: agent.role, type: step.type, title: step.titleTemplate, status: 'started' });
      const result = await generateDeliverable({
        projectId,
        agentId: agent.id,
        agentName: agent.name,
        agentRole: agent.role,
        type: step.type,
        title: step.titleTemplate,
        description: projectDescription,
        context: upstreamContext || undefined,
        parentDeliverableId: upstreamDeliverables[0]?.id,
        packageId,
        conversationId,
        handoffNotes,
      });
      produced.push(result.deliverable);
      onProgress?.({ step: i, totalSteps: chain.length, agentName: agent.name, agentRole: agent.role, type: step.type, title: step.titleTemplate, status: 'completed', deliverableId: result.deliverable.id });
    } catch (err: any) {
      skipped.push({ step: i, reason: err.message || 'Generation failed' });
      onProgress?.({ step: i, totalSteps: chain.length, agentName: agent.name, agentRole: agent.role, type: step.type, title: step.titleTemplate, status: 'skipped', reason: err.message });
    }
  }

  // Update package progress
  await storage.updatePackage(packageId, {
    status: skipped.length === 0 ? 'complete' : 'in_progress',
    metadata: {
      expectedDeliverables: chain.length,
      completedDeliverables: produced.length,
    },
  });

  return {
    deliverables: produced,
    skippedSteps: skipped,
    totalTimeMs: Date.now() - startTime,
  };
}

/**
 * When an upstream deliverable is updated, check if downstream deliverables need refresh.
 * Returns IDs of deliverables that reference this one as parent.
 */
export async function getDownstreamDeliverables(deliverableId: string): Promise<Deliverable[]> {
  const deliverable = await storage.getDeliverable(deliverableId);
  if (!deliverable) return [];

  const allInProject = await storage.getDeliverablesByProject(deliverable.projectId);
  return allInProject.filter(d => d.parentDeliverableId === deliverableId);
}
