/**
 * Deliverable Type Registry — maps agent roles to the deliverable types they can produce.
 * Each type has a canonical section schema for structured output.
 */

export interface DeliverableTypeSpec {
  type: string;
  label: string;
  description: string;
  sections: string[];
  estimatedMinutes: number;
}

export interface RoleDeliverableMap {
  role: string;
  types: DeliverableTypeSpec[];
}

export const DELIVERABLE_TYPE_REGISTRY: RoleDeliverableMap[] = [
  {
    role: 'Product Manager',
    types: [
      {
        type: 'prd',
        label: 'Product Requirements Document',
        description: 'Comprehensive product spec with goals, features, and success metrics',
        sections: ['Overview', 'Problem Statement', 'Goals & Success Metrics', 'User Stories', 'Feature Requirements', 'Non-Functional Requirements', 'Timeline & Milestones', 'Risks & Mitigations'],
        estimatedMinutes: 3,
      },
      {
        type: 'user-stories',
        label: 'User Stories',
        description: 'Prioritized user stories with acceptance criteria',
        sections: ['Epic Overview', 'User Stories', 'Acceptance Criteria', 'Priority Matrix'],
        estimatedMinutes: 2,
      },
      {
        type: 'project-plan',
        label: 'Project Plan',
        description: 'Sprint breakdown with timeline and dependencies',
        sections: ['Project Overview', 'Scope', 'Sprint Breakdown', 'Dependencies', 'Resource Allocation', 'Risk Register'],
        estimatedMinutes: 3,
      },
    ],
  },
  {
    role: 'Backend Developer',
    types: [
      {
        type: 'tech-spec',
        label: 'Technical Specification',
        description: 'Architecture doc with system design, data models, and API contracts',
        sections: ['Overview', 'Architecture', 'Data Model', 'API Contracts', 'Error Handling', 'Security Considerations', 'Performance Requirements', 'Testing Strategy'],
        estimatedMinutes: 4,
      },
    ],
  },
  {
    role: 'Software Engineer',
    types: [
      {
        type: 'tech-spec',
        label: 'Technical Specification',
        description: 'Architecture doc with system design and implementation plan',
        sections: ['Overview', 'Architecture', 'Data Model', 'API Contracts', 'Implementation Plan', 'Testing Strategy'],
        estimatedMinutes: 4,
      },
    ],
  },
  {
    role: 'Product Designer',
    types: [
      {
        type: 'design-brief',
        label: 'Design Brief',
        description: 'UX requirements, user flows, and design principles',
        sections: ['Design Goals', 'User Personas', 'User Flows', 'Wireframe Descriptions', 'Design Principles', 'Accessibility Requirements', 'Visual Direction'],
        estimatedMinutes: 3,
      },
    ],
  },
  {
    role: 'UX Designer',
    types: [
      {
        type: 'design-brief',
        label: 'UX Design Brief',
        description: 'User research-driven design requirements',
        sections: ['Research Summary', 'Personas', 'Journey Maps', 'Information Architecture', 'Interaction Patterns', 'Usability Requirements'],
        estimatedMinutes: 3,
      },
    ],
  },
  {
    role: 'Growth Marketer',
    types: [
      {
        type: 'gtm-plan',
        label: 'Go-to-Market Plan',
        description: 'Launch strategy with channels, messaging, and metrics',
        sections: ['Market Overview', 'Target Audience', 'Positioning & Messaging', 'Channel Strategy', 'Launch Timeline', 'Budget', 'KPIs & Success Metrics'],
        estimatedMinutes: 3,
      },
    ],
  },
  {
    role: 'Marketing Specialist',
    types: [
      {
        type: 'gtm-plan',
        label: 'Marketing Plan',
        description: 'Comprehensive marketing strategy',
        sections: ['Situation Analysis', 'Target Market', 'Marketing Mix', 'Campaign Calendar', 'Budget Allocation', 'Measurement Framework'],
        estimatedMinutes: 3,
      },
    ],
  },
  {
    role: 'Content Writer',
    types: [
      {
        type: 'blog-post',
        label: 'Blog Post',
        description: 'SEO-optimized long-form content',
        sections: ['Hook', 'Introduction', 'Body Sections', 'Conclusion', 'Call to Action', 'SEO Meta'],
        estimatedMinutes: 2,
      },
    ],
  },
  {
    role: 'Copywriter',
    types: [
      {
        type: 'landing-copy',
        label: 'Landing Page Copy',
        description: 'Conversion-focused landing page content',
        sections: ['Headline', 'Subheadline', 'Hero Section', 'Benefits', 'Social Proof', 'Features', 'FAQ', 'CTA'],
        estimatedMinutes: 2,
      },
    ],
  },
  {
    role: 'Social Media Manager',
    types: [
      {
        type: 'content-calendar',
        label: 'Content Calendar',
        description: 'Social media content plan with posts and scheduling',
        sections: ['Content Pillars', 'Weekly Schedule', 'Post Templates', 'Hashtag Strategy', 'Engagement Plan'],
        estimatedMinutes: 2,
      },
    ],
  },
  {
    role: 'Email Specialist',
    types: [
      {
        type: 'email-sequence',
        label: 'Email Sequence',
        description: 'Automated email drip campaign',
        sections: ['Sequence Overview', 'Email 1: Welcome', 'Email 2: Value', 'Email 3: Social Proof', 'Email 4: Offer', 'Email 5: Follow-up', 'Subject Line Variants'],
        estimatedMinutes: 3,
      },
    ],
  },
  {
    role: 'SEO Specialist',
    types: [
      {
        type: 'seo-brief',
        label: 'SEO Strategy Brief',
        description: 'Keyword strategy and optimization plan',
        sections: ['Keyword Research', 'Content Gaps', 'On-Page Optimization', 'Technical SEO', 'Link Building Strategy', 'Measurement Plan'],
        estimatedMinutes: 2,
      },
    ],
  },
  {
    role: 'Business Analyst',
    types: [
      {
        type: 'competitive-analysis',
        label: 'Competitive Analysis',
        description: 'Market landscape and competitor comparison',
        sections: ['Market Overview', 'Competitor Profiles', 'Feature Comparison', 'SWOT Analysis', 'Positioning Map', 'Recommendations'],
        estimatedMinutes: 3,
      },
      {
        type: 'market-research',
        label: 'Market Research Report',
        description: 'Data-driven market insights',
        sections: ['Executive Summary', 'Market Size & Growth', 'Customer Segments', 'Trends', 'Opportunities', 'Risks'],
        estimatedMinutes: 3,
      },
    ],
  },
  {
    role: 'Operations Manager',
    types: [
      {
        type: 'process-doc',
        label: 'Process Documentation',
        description: 'Standard operating procedures',
        sections: ['Process Overview', 'Scope', 'Roles & Responsibilities', 'Step-by-Step Procedure', 'Quality Checks', 'Exception Handling'],
        estimatedMinutes: 2,
      },
    ],
  },
  {
    role: 'Data Analyst',
    types: [
      {
        type: 'data-report',
        label: 'Data Analysis Report',
        description: 'Insights from data with visualizations',
        sections: ['Executive Summary', 'Methodology', 'Key Findings', 'Data Visualizations', 'Recommendations', 'Appendix'],
        estimatedMinutes: 3,
      },
    ],
  },
];

/**
 * Get deliverable types available for a given role.
 */
export function getDeliverableTypesForRole(role: string): DeliverableTypeSpec[] {
  const entry = DELIVERABLE_TYPE_REGISTRY.find(r => r.role === role);
  return entry?.types || [{
    type: 'custom',
    label: 'Custom Document',
    description: 'A custom deliverable',
    sections: ['Overview', 'Details', 'Conclusion'],
    estimatedMinutes: 2,
  }];
}

/**
 * Get the section schema for a deliverable type.
 */
export function getSectionsForType(type: string): string[] {
  for (const entry of DELIVERABLE_TYPE_REGISTRY) {
    for (const t of entry.types) {
      if (t.type === type) return t.sections;
    }
  }
  return ['Overview', 'Details', 'Conclusion'];
}

/**
 * Get a human-readable label for a deliverable type.
 */
export function getTypeLabel(type: string): string {
  for (const entry of DELIVERABLE_TYPE_REGISTRY) {
    for (const t of entry.types) {
      if (t.type === type) return t.label;
    }
  }
  return type.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
