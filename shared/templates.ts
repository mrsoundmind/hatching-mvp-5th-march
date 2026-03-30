// Template system for starter packs and project creation
// Based on actual Hatchin specifications

export interface HatchTemplate {
  name: string;
  role: string;
  description: string;
  color: "blue" | "green" | "purple" | "amber";
  category: string;
  skills?: string[];
  tools?: string[];
}

export interface StarterPack {
  id: string;
  title: string;
  description: string;
  emoji: string;
  color: string;
  members: string[];
  welcomeMessage: string;
}

export interface TemplateCategory {
  id: string;
  title: string;
  icon: any; // Will be imported from lucide-react
  packs: StarterPack[];
}

// Starter pack templates organized by category
export const starterPacksByCategory: Record<string, TemplateCategory> = {
  business: {
    id: "business",
    title: "Business + Startups",
    icon: "Briefcase", // lucide-react icon name
    packs: [
      {
        id: "saas-startup",
        title: "SaaS Startup",
        description: "Perfect for launching products and digital experiences",
        emoji: "🚀",
        color: "blue",
        members: ["Product Manager", "Technical Lead", "Copywriter"],
        welcomeMessage: "You've got the product idea. This crew has shipped SaaS before. They'll argue about your pricing page, obsess over your onboarding, and build something people actually pay for."
      },
      {
        id: "ai-tool-startup",
        title: "AI Tool Startup",
        description: "Build cutting-edge AI-powered tools and applications",
        emoji: "🤖",
        color: "purple",
        members: ["AI Developer", "Product Manager", "Growth Marketer"],
        welcomeMessage: "AI is moving fast. Your team knows how to build something useful, not just impressive. They'll keep you honest about what's real and what's hype."
      },
      {
        id: "marketplace-app",
        title: "Marketplace App",
        description: "Create platforms that connect buyers and sellers",
        emoji: "🏪",
        color: "green",
        members: ["UX Designer", "Technical Lead", "Operations Manager"],
        welcomeMessage: "Marketplaces are hard. Two sides, two sets of problems. This team knows how to get the chicken-and-egg thing right."
      },
      {
        id: "solo-founder-support",
        title: "Solo Founder Support",
        description: "Essential support team for independent entrepreneurs",
        emoji: "👤",
        color: "amber",
        members: ["Product Manager", "Copywriter", "Operations Manager"],
        welcomeMessage: "You've been wearing every hat. Not anymore. This is your core team. They'll take the work off your plate and push back when your plan needs it."
      },
      {
        id: "investor-deck-sprint",
        title: "Investor Deck Sprint",
        description: "Create pitch decks that land funding",
        emoji: "📊",
        color: "blue",
        members: ["Product Manager", "Brand Strategist", "UI Designer"],
        welcomeMessage: "Investors see hundreds of decks. This team builds the one they remember. Story first, slides second."
      }
    ]
  },
  brands: {
    id: "brands",
    title: "Brands & Commerce",
    icon: "ShoppingBag",
    packs: [
      {
        id: "ecommerce-launch",
        title: "E-commerce Launch",
        description: "Launch and grow your online retail business",
        emoji: "🛍️",
        color: "green",
        members: ["Brand Strategist", "Copywriter", "UI Designer"],
        welcomeMessage: "Your store needs more than products on a page. This team builds the brand, writes the copy, and designs the experience that makes people buy."
      },
      {
        id: "dtc-brand-strategy",
        title: "DTC Brand Strategy",
        description: "Direct-to-consumer brand building and growth",
        emoji: "📦",
        color: "purple",
        members: ["Product Manager", "Growth Marketer", "Social Media Manager"],
        welcomeMessage: "Selling direct means owning the relationship. This team builds the brand voice, the growth engine, and the community that keeps people coming back."
      },
      {
        id: "amazon-store-optimization",
        title: "Amazon Store Optimization",
        description: "Grow your Amazon presence for maximum sales",
        emoji: "📈",
        color: "amber",
        members: ["SEO Specialist", "Copywriter", "Data Analyst"],
        welcomeMessage: "Amazon rewards the sellers who get the details right. This team handles SEO, copy, and data so you rank higher and convert better."
      },
      {
        id: "product-packaging-revamp",
        title: "Product Packaging Revamp",
        description: "Redesign packaging that stands out and sells",
        emoji: "📦",
        color: "blue",
        members: ["Brand Strategist", "UI Designer", "Creative Director"],
        welcomeMessage: "Packaging is the first thing people touch. This team makes sure it tells your story before anyone reads a word."
      }
    ]
  },
  creative: {
    id: "creative",
    title: "Creative & Content",
    icon: "Palette",
    packs: [
      {
        id: "creative-studio",
        title: "Creative Studio",
        description: "Full-service creative team for branding and design",
        emoji: "🎨",
        color: "purple",
        members: ["Creative Director", "Brand Strategist", "Copywriter"],
        welcomeMessage: "Good creative isn't decoration. It's the difference between someone scrolling past and someone stopping to care. This team makes the second thing happen."
      },
      {
        id: "portfolio-builder",
        title: "Portfolio Builder",
        description: "Showcase your work with a stunning portfolio",
        emoji: "💼",
        color: "blue",
        members: ["UI Designer", "Copywriter", "UX Designer"],
        welcomeMessage: "Your work speaks for itself. This team makes sure the presentation does too. Clean, sharp, impossible to ignore."
      },
      {
        id: "content-calendar-builder",
        title: "Content Calendar Builder",
        description: "Strategic content planning and social media management",
        emoji: "📅",
        color: "green",
        members: ["Social Media Manager", "Growth Marketer", "Copywriter"],
        welcomeMessage: "Posting without a plan is just noise. This team maps out content that actually builds an audience over time."
      },
      {
        id: "youtube-channel-strategy",
        title: "YouTube Channel Strategy",
        description: "Grow your YouTube channel with strategic content",
        emoji: "📺",
        color: "amber",
        members: ["Social Media Manager", "Creative Director", "SEO Specialist"],
        welcomeMessage: "YouTube rewards consistency and strategy. This team plans the content, writes the hooks, and makes sure people subscribe, not just watch."
      },
      {
        id: "podcast-launch",
        title: "Podcast Launch",
        description: "Launch and grow your podcast audience",
        emoji: "🎙️",
        color: "purple",
        members: ["Audio Editor", "Copywriter", "Brand Strategist"],
        welcomeMessage: "A great podcast starts with a point of view. This team helps you find yours, produce it clean, and grow it from episode one."
      }
      ,
      {
        id: "media-production-house",
        title: "Media Production House",
        description: "End-to-end video and content production squad for brands, campaigns, and social media.",
        emoji: "🎬",
        color: "purple",
        members: ["Creative Director", "Copywriter", "Audio Editor"],
        welcomeMessage: "From rough ideas to polished edits. This crew handles scripts, shoots, and post. You show up with the vision, they handle the rest."
      }
    ]
  },
  freelancers: {
    id: "freelancers",
    title: "Freelancers & Solopreneurs",
    icon: "User",
    packs: [
      {
        id: "freelance-brand-kit",
        title: "Freelance Brand Kit",
        description: "Complete branding package for independent professionals",
        emoji: "⭐",
        color: "amber",
        members: ["Copywriter", "UI Designer", "Brand Strategist"],
        welcomeMessage: "Clients pick you before they talk to you. This team builds the brand that makes that decision easy."
      },
      {
        id: "client-pitch-kit",
        title: "Client Pitch Kit",
        description: "Win more clients with sharp proposals",
        emoji: "🎯",
        color: "blue",
        members: ["Copywriter", "Product Manager", "Brand Strategist"],
        welcomeMessage: "The best pitch doesn't beg. It shows exactly what you bring and makes saying yes feel obvious. That's what this team builds."
      },
      {
        id: "notion-template-business",
        title: "Notion Template Business",
        description: "Create and sell digital productivity templates",
        emoji: "📝",
        color: "green",
        members: ["UX Designer", "Copywriter", "Growth Marketer"],
        welcomeMessage: "Templates sell when they're beautiful and useful. This team designs, writes, and markets the ones people actually pay for."
      },
      {
        id: "newsletter-strategy",
        title: "Newsletter Strategy",
        description: "Build and monetize your email newsletter",
        emoji: "📧",
        color: "purple",
        members: ["Email Specialist", "Copywriter", "Growth Marketer"],
        welcomeMessage: "A newsletter is a relationship. This team helps you write the ones people open, and build the list that pays for itself."
      }
    ]
  },
  growth: {
    id: "growth",
    title: "Growth & Marketing",
    icon: "TrendingUp",
    packs: [
      {
        id: "launch-campaign",
        title: "Launch Campaign",
        description: "Comprehensive marketing campaigns for product launches",
        emoji: "🚀",
        color: "blue",
        members: ["Growth Marketer", "Copywriter", "UI Designer"],
        welcomeMessage: "Most launches fizzle. This team builds the one that gets people talking before you even ship."
      },
      {
        id: "ad-funnel-builder",
        title: "Ad Funnel Builder",
        description: "High-converting advertising funnels and campaigns",
        emoji: "🎯",
        color: "green",
        members: ["Copywriter", "UI Designer", "Data Analyst"],
        welcomeMessage: "Every click costs money. This team builds funnels where those clicks actually turn into customers."
      },
      {
        id: "seo-sprint",
        title: "SEO Sprint",
        description: "Boost your search rankings and organic traffic",
        emoji: "📈",
        color: "amber",
        members: ["SEO Specialist", "Copywriter", "Data Analyst"],
        welcomeMessage: "SEO is a long game but you can win fast if you know where to start. This team finds the gaps and fills them."
      },
      {
        id: "email-sequence-builder",
        title: "Email Sequence Builder",
        description: "Email sequences that nurture and convert",
        emoji: "📨",
        color: "purple",
        members: ["Email Specialist", "Copywriter", "Brand Strategist"],
        welcomeMessage: "The best email sequence doesn't feel like marketing. It feels like a friend who keeps showing up with exactly what you need."
      }
    ]
  },
  internal: {
    id: "internal",
    title: "Internal Teams & Ops",
    icon: "Settings",
    packs: [
      {
        id: "team-onboarding-kit",
        title: "Team Onboarding Kit",
        description: "Streamlined onboarding for new team members",
        emoji: "👥",
        color: "blue",
        members: ["Product Manager", "HR Specialist", "Operations Manager"],
        welcomeMessage: "First week at a new job sets the tone for everything. This team builds the onboarding that makes new hires productive and excited."
      },
      {
        id: "weekly-sync-system",
        title: "Weekly Sync System",
        description: "Effective team communication and alignment",
        emoji: "🔄",
        color: "green",
        members: ["Operations Manager", "Product Manager", "UI Designer"],
        welcomeMessage: "Meetings are expensive. This team builds the system that keeps everyone aligned without wasting anyone's time."
      },
      {
        id: "internal-wiki-setup",
        title: "Internal Wiki Setup",
        description: "Centralized knowledge base for your organization",
        emoji: "📚",
        color: "purple",
        members: ["UX Designer", "Copywriter", "Technical Lead"],
        welcomeMessage: "Every company has knowledge trapped in people's heads. This team gets it out, organizes it, and makes it findable."
      }
    ]
  },
  education: {
    id: "education",
    title: "Education & Research",
    icon: "GraduationCap",
    packs: [
      {
        id: "online-course-builder",
        title: "Online Course Builder",
        description: "Create engaging educational content and courses",
        emoji: "🎓",
        color: "blue",
        members: ["Instructional Designer", "Copywriter", "Brand Strategist"],
        welcomeMessage: "Most online courses get abandoned by week two. This team builds the ones people actually finish and recommend."
      },
      {
        id: "academic-research",
        title: "Academic Research",
        description: "Research support and publication assistance",
        emoji: "🔬",
        color: "purple",
        members: ["Data Analyst", "Copywriter", "Brand Strategist"],
        welcomeMessage: "Good research deserves good presentation. This team supports the rigor and makes sure the writing matches the thinking."
      },
      {
        id: "slide-deck-assistant",
        title: "Slide Deck Assistant",
        description: "Professional presentations that captivate audiences",
        emoji: "📊",
        color: "amber",
        members: ["Product Manager", "Copywriter", "UI Designer"],
        welcomeMessage: "Death by PowerPoint is real. This team builds the deck that holds a room and gets people to act."
      }
    ]
  },
  personal: {
    id: "personal",
    title: "Personal & Experimental",
    icon: "Lightbulb",
    packs: [
      {
        id: "side-hustle-brainstormer",
        title: "Side Hustle Brainstormer",
        description: "Explore and validate side business ideas",
        emoji: "💡",
        color: "amber",
        members: ["AI Developer", "Growth Marketer", "Copywriter"],
        welcomeMessage: "You've got ideas. This team helps you figure out which ones are worth building and which ones to let go."
      },
      {
        id: "life-dashboard-builder",
        title: "Life Dashboard Builder",
        description: "Personal productivity and life management system",
        emoji: "📊",
        color: "blue",
        members: ["UX Designer", "Copywriter", "UI Designer"],
        welcomeMessage: "Track what matters, ignore what doesn't. This team builds the personal system that actually sticks."
      },
      {
        id: "ai-character-creator",
        title: "AI Character Creator",
        description: "Design and develop AI personas and characters",
        emoji: "🎭",
        color: "purple",
        members: ["Creative Director", "AI Developer", "Copywriter"],
        welcomeMessage: "Every character needs a voice, a history, and a reason to exist. This team crafts the ones people remember."
      },
      {
        id: "personal-knowledge-base",
        title: "Personal Knowledge Base",
        description: "Organize and connect your ideas and learnings",
        emoji: "🧠",
        color: "green",
        members: ["Operations Manager", "UX Designer", "Copywriter"],
        welcomeMessage: "Your best ideas are scattered across apps, notes, and your memory. This team builds the one place that connects them all."
      },
      {
        id: "moodboard-generator",
        title: "Moodboard Generator",
        description: "Visual inspiration and creative direction tools",
        emoji: "🎨",
        color: "amber",
        members: ["Creative Director", "UI Designer", "Copywriter"],
        welcomeMessage: "Great design starts with great references. This team curates the visual direction that makes the next step obvious."
      }
    ]
  }
};

// Hatch template definitions for team members
export const allHatchTemplates: HatchTemplate[] = [
  // Product & Strategy
  {
    name: "Product Manager",
    role: "Product Manager",
    description: "Maya asks the question you've been avoiding. She'll tear apart your roadmap, rebuild it better, and make sure you're building what people actually need.",
    color: "blue",
    category: "strategy",
    skills: ["Product Strategy", "Roadmapping", "Team Building", "Idea Development"]
  },
  {
    name: "Business Strategist",
    role: "Business Strategist",
    description: "Morgan reads markets the way most people read headlines. She'll tell you where the money is, where the risk is, and what your competitors are missing.",
    color: "purple",
    category: "strategy",
    skills: ["Business Strategy", "Market Analysis", "Competitive Intelligence", "Strategic Planning"]
  },
  {
    name: "Data Analyst",
    role: "Data Analyst",
    description: "Quinn doesn't do dashboards for the sake of dashboards. She finds the number that changes your decision and puts it in front of you.",
    color: "amber",
    category: "analytics",
    skills: ["Data Analysis", "Business Intelligence", "Visualization", "Insights"]
  },

  // Development & Tech
  {
    name: "Technical Lead",
    role: "Technical Lead",
    description: "Alex builds things that work on the first deploy and still work six months later. Clean code, smart architecture, zero shortcuts.",
    color: "blue",
    category: "development",
    skills: ["Web Development", "API Design", "Database Architecture", "System Integration"]
  },
  {
    name: "AI Developer",
    role: "AI Developer",
    description: "Jordan builds the kind of AI that solves a real problem, not the kind that looks cool in a demo and breaks in production.",
    color: "green",
    category: "development",
    skills: ["Machine Learning", "AI Development", "Data Science", "Neural Networks"]
  },
  {
    name: "UX Designer",
    role: "UX Designer",
    description: "Sam designs for the person who has no patience and no time to read instructions. If it's not obvious in three seconds, she starts over.",
    color: "green",
    category: "design",
    skills: ["User Research", "Interface Design", "Prototyping", "Design Systems"]
  },

  // Design & Creative
  {
    name: "UI Designer",
    role: "UI Designer",
    description: "Taylor makes things look the way they should feel. Every pixel has a reason. Every color earns its place.",
    color: "amber",
    category: "design",
    skills: ["Visual Design", "Interface Design", "Brand Identity", "Design Systems"]
  },
  {
    name: "Brand Strategist",
    role: "Brand Strategist",
    description: "Charlie builds brands people tattoo on their arms. Not literally. But that level of loyalty. Identity that sticks and means something real.",
    color: "blue",
    category: "creative",
    skills: ["Brand Strategy", "Visual Identity", "Brand Voice", "Marketing Materials"]
  },
  {
    name: "Creative Director",
    role: "Creative Director",
    description: "Riley sees the finished thing before anyone else does. She shapes projects with a vision that holds from the first sketch to the final pixel.",
    color: "purple",
    category: "creative",
    skills: ["Creative Direction", "Art Direction", "Campaign Development", "Visual Storytelling"]
  },
  {
    name: "Copywriter",
    role: "Copywriter",
    description: "Morgan writes the sentence that makes someone stop scrolling. Then the next one that makes them click. Then the one that makes them pay.",
    color: "green",
    category: "content",
    skills: ["Content Strategy", "Copywriting", "Brand Voice", "SEO Writing"]
  },

  // Marketing & Growth
  {
    name: "Growth Marketer",
    role: "Growth Marketer",
    description: "Dakota doesn't do marketing that feels like marketing. She builds the engine that brings people in and makes them stay.",
    color: "green",
    category: "marketing",
    skills: ["Digital Marketing", "Growth Strategy", "Campaign Management", "Analytics"]
  },
  {
    name: "Social Media Manager",
    role: "Social Media Manager",
    description: "Sage builds the kind of following where people actually reply, share, and show up. Not vanity metrics. Real community.",
    color: "purple",
    category: "marketing",
    skills: ["Social Media Strategy", "Community Building", "Content Creation", "Engagement"]
  },
  {
    name: "SEO Specialist",
    role: "SEO Specialist",
    description: "Casey knows what Google wants before Google knows. She gets your content ranking so the right people find you without you paying for it.",
    color: "amber",
    category: "marketing",
    skills: ["SEO Strategy", "Keyword Research", "Content Optimization", "Technical SEO"]
  },
  {
    name: "Email Specialist",
    role: "Email Specialist",
    description: "Avery writes emails people open at 6 AM. Not because of the subject line trick, but because the last one was genuinely useful.",
    color: "blue",
    category: "marketing",
    skills: ["Email Marketing", "Marketing Automation", "List Building", "Conversion Optimization"]
  },

  // Operations & Support
  {
    name: "Operations Manager",
    role: "Operations Manager",
    description: "Dakota finds the bottleneck everyone else is working around and fixes it. Your team runs smoother after one conversation with her.",
    color: "purple",
    category: "operations",
    skills: ["Process Optimization", "Project Management", "Team Coordination", "Efficiency"]
  },
  {
    name: "HR Specialist",
    role: "HR Specialist",
    description: "Harper hires the people who make everyone else better. She builds culture that people protect, not just tolerate.",
    color: "green",
    category: "operations",
    skills: ["Talent Acquisition", "Team Development", "Culture Building", "Performance Management"]
  },
  {
    name: "Instructional Designer",
    role: "Instructional Designer",
    description: "Emery builds learning experiences where people don't realize they're learning until they already know it. That's the whole trick.",
    color: "blue",
    category: "education",
    skills: ["Learning Design", "Curriculum Development", "Educational Technology", "Assessment Design"]
  },
  {
    name: "Audio Editor",
    role: "Audio Editor",
    description: "River makes your podcast sound like a studio produced it. Clean audio, tight edits, and the kind of polish that makes listeners trust you.",
    color: "amber",
    category: "creative",
    skills: ["Audio Editing", "Sound Design", "Podcast Production", "Music Composition"]
  }
];

// Helper functions
export const getHatchTemplate = (name: string): HatchTemplate | undefined => {
  return allHatchTemplates.find(template => template.name === name);
};

export const getStarterPack = (id: string): StarterPack | undefined => {
  for (const category of Object.values(starterPacksByCategory)) {
    const pack = category.packs.find(p => p.id === id);
    if (pack) return pack;
  }
  return undefined;
};

export const getAllStarterPacks = (): StarterPack[] => {
  return Object.values(starterPacksByCategory).flatMap(category => category.packs);
};