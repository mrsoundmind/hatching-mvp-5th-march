import FocusTrap from 'focus-trap-react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  ArrowLeft,
  Users,
  Sparkles,
  Briefcase,
  ShoppingBag,
  Palette,
  User,
  TrendingUp,
  Settings,
  GraduationCap,
  Lightbulb
} from 'lucide-react';
// Temporary inline template data until import issues are resolved
interface StarterPack {
  id: string;
  title: string;
  description: string;
  emoji: string;
  color: string;
  members: string[];
  welcomeMessage: string;
}

interface TemplateCategory {
  id: string;
  title: string;
  icon: string;
  packs: StarterPack[];
}

// Complete template data with 40+ templates across 8 categories
const starterPacksByCategory: Record<string, TemplateCategory> = {
  business: {
    id: "business",
    title: "Business + Startups",
    icon: "Briefcase",
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

const getHatchTemplate = (name: string) => ({
  name,
  role: name,
  description: `Expert ${name} with specialized skills`,
  color: "blue" as const,
  category: "general"
});

// Icon mapping for categories
const categoryIcons = {
  Briefcase,
  ShoppingBag,
  Palette,
  User,
  TrendingUp,
  Settings,
  GraduationCap,
  Lightbulb
};

// Category accent colors mapping
const categoryAccents: Record<string, { border: string; bg: string; text: string }> = {
  business: { border: '#6C82FF', bg: '#6C82FF20', text: '#6C82FF' },
  creative: { border: '#9F7BFF', bg: '#9F7BFF20', text: '#9F7BFF' },
  growth: { border: '#FF8C42', bg: '#FF8C4220', text: '#FF8C42' },
  content: { border: '#FF6B9D', bg: '#FF6B9D20', text: '#FF6B9D' },
  education: { border: '#47DB9A', bg: '#47DB9A20', text: '#47DB9A' },
  personal: { border: '#FFCE3A', bg: '#FFCE3A20', text: '#FFCE3A' },
  operations: { border: '#4BC8FF', bg: '#4BC8FF20', text: '#4BC8FF' },
  influencer: { border: '#E84CFF', bg: '#E84CFF2020', text: '#E84CFF' },
};

interface StarterPacksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  onSelectTemplate: (pack: StarterPack) => void;
  isLoading?: boolean;
  selectedPackId?: string;
}

export default function StarterPacksModal({
  isOpen,
  onClose,
  onBack,
  onSelectTemplate,
  isLoading = false,
  selectedPackId
}: StarterPacksModalProps) {
  const [activeCategory, setActiveCategory] = useState('business');
  const [selectedPack, setSelectedPack] = useState<string | null>(selectedPackId || null);

  const handleSelectPack = (pack: StarterPack) => {
    setSelectedPack(pack.id);
    onSelectTemplate(pack);
  };

  // Reset selected pack when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setSelectedPack(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <FocusTrap active={isOpen}>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-hatchin-card rounded-2xl border border-hatchin-border-subtle shadow-2xl flex flex-col" role="dialog" aria-modal="true" aria-labelledby="modal-title" style={{ width: '1200px', height: '700px' }}>
          {/* Header */}
          <div className="p-6 border-b border-hatchin-border-subtle flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="text-muted-foreground hover:text-hatchin-text-bright transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
              )}
              <div>
                <h2 className="text-xl font-semibold text-hatchin-text-bright mb-1" id="modal-title">
                  Choose Your Starter Template
                </h2>
                <p className="text-muted-foreground text-sm">
                  Select a pre-built team to get started quickly, or explore ideas if you're not sure what to build.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-hatchin-text-bright transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content Area with Sidebar Layout */}
          <div className="flex flex-1 overflow-hidden">
            {/* Category Sidebar */}
            <div className="w-64 border-r border-hatchin-border-subtle bg-hatchin-panel">
              <div className="p-4">
                <div className="space-y-1">
                  {Object.entries(starterPacksByCategory).map(([categoryId, category]: [string, TemplateCategory]) => {
                    const IconComponent = categoryIcons[category.icon as keyof typeof categoryIcons] || Briefcase;
                    const packCount = category.packs.length;

                    const accent = categoryAccents[categoryId] || categoryAccents['business'];
                    return (
                      <button
                        key={categoryId}
                        onClick={() => setActiveCategory(categoryId)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 ${activeCategory === categoryId
                          ? 'text-white'
                          : 'text-muted-foreground hover:bg-hatchin-surface hover:text-hatchin-text-bright'
                          }`}
                        style={activeCategory === categoryId ? {
                          backgroundColor: accent.bg,
                          borderLeft: `3px solid ${accent.border}`,
                          paddingLeft: '10px'
                        } : {}}
                      >
                        <IconComponent size={16} className="flex-shrink-0" style={activeCategory === categoryId ? { color: accent.text } : {}} />
                        <span className="text-sm font-medium flex-1">{category.title}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${activeCategory === categoryId
                          ? 'bg-white/20 text-white'
                          : 'bg-hatchin-border-subtle text-muted-foreground'
                          }`}>
                          {packCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Template Grid */}
            <div className="flex-1 overflow-y-auto scrollbar-stable">
              <div className="p-4">
                <div
                  className="grid gap-4 grid-cols-3"
                  style={{
                    gridTemplateColumns: 'repeat(3, 1fr)'
                  }}
                >
                  {starterPacksByCategory[activeCategory]?.packs.map((pack, i) => (
                    <TemplateCard
                      key={`${activeCategory}-${pack.id}`}
                      pack={pack}
                      index={i}
                      isSelected={selectedPack === pack.id}
                      isLoading={isLoading && selectedPack === pack.id}
                      onSelect={() => handleSelectPack(pack)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </FocusTrap>
  );
}

interface TemplateCardProps {
  pack: StarterPack;
  index: number;
  isSelected: boolean;
  isLoading: boolean;
  onSelect: () => void;
}

function TemplateCard({ pack, index, isSelected, isLoading, onSelect }: TemplateCardProps) {
  return (
    <motion.div
      className={`relative bg-gradient-to-br from-hatchin-surface-elevated to-hatchin-panel rounded-xl p-4 border transition-all duration-300 cursor-pointer flex flex-col group overflow-hidden ${isSelected ? 'border-hatchin-blue shadow-[0_0_20px_rgba(108,130,255,0.2)]' : 'border-hatchin-border-subtle hover:border-hatchin-blue/50 hover:shadow-[0_8px_30px_rgba(108,130,255,0.15)]'}`}
      style={{
        minHeight: '200px',
        transformStyle: 'preserve-3d'
      }}
      onClick={onSelect}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      whileHover={{ y: -4, scale: 1.02, rotateY: 3, rotateX: 2 }}
      whileTap={{ scale: 0.97 }}
    >
      {/* Glossy Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Pack Header */}
      <div className="relative z-10 flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-[0_0_15px_rgba(108,130,255,0.15)] group-hover:shadow-[0_0_25px_rgba(108,130,255,0.25)] transition-shadow ${pack.color === 'blue' ? 'bg-gradient-to-br from-hatchin-blue/20 to-[#9F7BFF]/20 border border-hatchin-blue/30' :
              pack.color === 'green' ? 'bg-gradient-to-br from-[#47DB9A]/20 to-emerald-500/20 border border-[#47DB9A]/30' :
                pack.color === 'purple' ? 'bg-gradient-to-br from-[#9F7BFF]/20 to-fuchsia-500/20 border border-[#9F7BFF]/30' :
                  pack.color === 'amber' ? 'bg-gradient-to-br from-[#FFB547]/20 to-amber-500/20 border border-[#FFB547]/30' :
                    pack.color === 'red' ? 'bg-gradient-to-br from-[#FF4E6A]/20 to-rose-500/20 border border-[#FF4E6A]/30' :
                      'bg-gradient-to-br from-hatchin-blue/20 to-[#9F7BFF]/20 border border-hatchin-blue/30'
            }`}>
            {pack.emoji}
          </div>
          <div className="flex-1">
            <h3 className="text-hatchin-text-bright text-sm mb-1 flex items-center gap-2" id="modal-title">
              {pack.title}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-hatchin-blue"
                >
                  <Sparkles size={10} />
                </motion.div>
              )}
            </h3>
            <p className="text-muted-foreground text-xs leading-tight">
              {pack.description}
            </p>
          </div>
        </div>
        <div className="ml-1 text-muted-foreground flex items-center gap-1">
          <Users size={10} />
          <span className="text-xs">{pack.members.length}</span>
        </div>
      </div>
      {/* Team Preview - Compact */}
      <div className="mt-2 mb-2">
        <div className="flex flex-wrap gap-1">
          {pack.members.slice(0, 4).map((memberName: string) => {
            const hatch = getHatchTemplate(memberName);
            return (
              <div key={memberName} className="flex items-center gap-1 bg-hatchin-card rounded px-2 py-1">
                <User className={`w-3 h-3 ${pack.color === 'blue' ? 'text-hatchin-blue' :
                  pack.color === 'green' ? 'text-[#47DB9A]' :
                    pack.color === 'purple' ? 'text-[#9F7BFF]' :
                      pack.color === 'amber' ? 'text-[#FFB547]' :
                        'text-hatchin-blue'
                  }`} />
                <span className="text-xs text-hatchin-text-bright">{memberName}</span>
              </div>
            );
          })}

          {pack.members.length > 4 && (
            <div className="flex items-center justify-center bg-hatchin-card rounded px-2 py-1">
              <span className="text-xs text-muted-foreground">+{pack.members.length - 4}</span>
            </div>
          )}
        </div>
      </div>
      {/* CTA Button - Fixed at bottom */}
      <div className="mt-auto pt-2">
        <button
          className={`w-full px-3 py-2 rounded-lg transition-all duration-200 text-xs font-medium ${isSelected
            ? 'bg-hatchin-blue text-white'
            : 'bg-hatchin-border-subtle hover:bg-hatchin-blue text-hatchin-text-bright hover:text-white'
            }`}
          disabled={isLoading}
        >
          {isLoading ? 'Creating...' : isSelected ? 'Starting...' : 'Use Pack'}
        </button>
      </div>
    </motion.div>
  );
}