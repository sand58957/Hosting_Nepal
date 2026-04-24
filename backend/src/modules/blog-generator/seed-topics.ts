export interface CategorySeed {
  name: string;
  slug: string;
  description: string;
  keywords: string[];
}

export const CATEGORY_SEEDS: CategorySeed[] = [
  {
    name: 'WordPress Hosting',
    slug: 'wordpress-hosting',
    description: 'Managed WordPress hosting guides, optimization, plugins, and troubleshooting.',
    keywords: ['WordPress', 'WooCommerce', 'LiteSpeed', 'caching', 'Elementor', 'Gutenberg'],
  },
  {
    name: 'VPS Hosting',
    slug: 'vps-hosting',
    description: 'Virtual private servers, root access, Linux admin, scaling, and performance tuning.',
    keywords: ['VPS', 'Linux', 'Ubuntu', 'NVMe SSD', 'root access', 'KVM'],
  },
  {
    name: 'Domains',
    slug: 'domains',
    description: 'Domain registration, DNS, WHOIS, TLDs, and domain transfers in Nepal.',
    keywords: ['.np domain', '.com.np', 'DNS', 'WHOIS', 'nameserver', 'domain transfer'],
  },
  {
    name: 'SSL & Security',
    slug: 'ssl-security',
    description: 'SSL certificates, HTTPS, firewalls, malware, and website security.',
    keywords: ["Let's Encrypt", 'HTTPS', 'TLS', 'WAF', 'malware', 'ModSecurity'],
  },
  {
    name: 'Email Hosting',
    slug: 'email-hosting',
    description: 'Business email, SMTP, SPF, DKIM, DMARC, and deliverability.',
    keywords: ['SMTP', 'IMAP', 'SPF', 'DKIM', 'DMARC', 'MX record'],
  },
  {
    name: 'Performance',
    slug: 'performance',
    description: 'Page speed, caching, CDN, Core Web Vitals, and site optimization.',
    keywords: ['Core Web Vitals', 'LCP', 'TTFB', 'CDN', 'caching', 'PageSpeed'],
  },
  {
    name: 'Migration',
    slug: 'migration',
    description: 'Site migration, cPanel transfers, backups, and DNS cutover.',
    keywords: ['cPanel', 'migration', 'backup', 'DNS cutover', 'WordPress migration'],
  },
  {
    name: 'Nepal Business',
    slug: 'nepal-business',
    description: 'Nepal-specific hosting guidance for SMBs, startups, e-commerce, and NGOs.',
    keywords: ['Nepal SMB', 'Khalti', 'eSewa', 'Nepali e-commerce', 'Kathmandu startup'],
  },
];

export interface IntentSeed {
  slug: string;
  label: string;
  titleTemplate: string;
  requiresHowTo: boolean;
  requiresFaq: boolean;
}

export const INTENT_SEEDS: IntentSeed[] = [
  { slug: 'what-is', label: 'What-is definition', titleTemplate: 'What Is {topic}? A Clear Guide for Nepal', requiresHowTo: false, requiresFaq: true },
  { slug: 'how-to', label: 'How-to tutorial', titleTemplate: 'How to {topic}: Step-by-Step Guide', requiresHowTo: true, requiresFaq: true },
  { slug: 'best', label: 'Best / top list', titleTemplate: 'Best {topic} in Nepal (2026 Edition)', requiresHowTo: false, requiresFaq: true },
  { slug: 'vs', label: 'Comparison', titleTemplate: '{topic}: Complete Comparison for Nepali Businesses', requiresHowTo: false, requiresFaq: true },
  { slug: 'troubleshoot', label: 'Troubleshooting', titleTemplate: 'How to Fix {topic}: Troubleshooting Guide', requiresHowTo: true, requiresFaq: true },
  { slug: 'pricing', label: 'Pricing / cost', titleTemplate: 'How Much Does {topic} Cost in Nepal?', requiresHowTo: false, requiresFaq: true },
  { slug: 'setup', label: 'Setup guide', titleTemplate: 'Setting Up {topic}: A Complete Nepal Guide', requiresHowTo: true, requiresFaq: true },
  { slug: 'beginner', label: 'Beginner primer', titleTemplate: '{topic} for Beginners in Nepal', requiresHowTo: false, requiresFaq: true },
  { slug: 'advanced', label: 'Advanced deep-dive', titleTemplate: 'Advanced {topic}: Pro Techniques for 2026', requiresHowTo: false, requiresFaq: true },
  { slug: 'checklist', label: 'Checklist', titleTemplate: 'The {topic} Checklist for Nepali Websites', requiresHowTo: false, requiresFaq: true },
];

export interface AngleSeed {
  slug: string;
  label: string;
  context: string;
}

export const ANGLE_SEEDS: AngleSeed[] = [
  { slug: 'general', label: 'General audience', context: 'General Nepal audience browsing web hosting options.' },
  { slug: 'kathmandu-smb', label: 'Kathmandu SMB', context: 'Small business owner in Kathmandu running their first website.' },
  { slug: 'ecommerce', label: 'Nepali e-commerce', context: 'Online store operator selling within Nepal using Khalti and eSewa checkouts.' },
  { slug: 'np-tld', label: '.np / .com.np operator', context: 'Website owner using a .np or .com.np domain.' },
  { slug: 'local-payments', label: 'Khalti / eSewa integration', context: 'Site accepting payments via Khalti, eSewa, and bank transfer.' },
  { slug: 'ngo', label: 'Local NGO', context: 'Nepali non-profit or NGO with limited budget and technical staff.' },
  { slug: 'startup', label: 'Nepali startup', context: 'Early-stage startup in Kathmandu or Pokhara scaling a web product.' },
];

export interface TopicKernel {
  category: CategorySeed;
  intent: IntentSeed;
  angle: AngleSeed;
}
