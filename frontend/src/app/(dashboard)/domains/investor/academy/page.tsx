'use client'

import { useState } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'

interface Article {
  title: string
  description: string
  category: string
  icon: string
  color: string
  readTime: string
  content: string[]
}

const articles: Article[] = [
  {
    title: 'Getting Started with Domain Investing',
    description: 'Learn the basics of domain investing, how to identify valuable domains, and strategies for building a profitable portfolio.',
    category: 'Beginner',
    icon: 'tabler-book',
    color: 'primary.main',
    readTime: '8 min read',
    content: [
      'Domain investing is the practice of purchasing domain names with the intention of selling them at a higher price. Just like real estate, prime digital locations command premium prices.',
      '## Why Invest in Domains?\n\nDomains are the foundation of every online business. A great domain name can be worth thousands or even millions of dollars. Some notable sales include:\n\n- Cars.com sold for $872 million\n- Insurance.com sold for $35.6 million\n- VacationRentals.com sold for $35 million',
      '## How to Get Started\n\n1. **Research the market** — Study recent domain sales on platforms like NameBio and DNJournal to understand pricing trends.\n\n2. **Set a budget** — Start small with $100-500 and gradually increase as you learn what works.\n\n3. **Choose your niche** — Focus on specific industries like tech, finance, health, or local markets like Nepal (.np domains).\n\n4. **Register strategic domains** — Look for short, memorable, keyword-rich names that businesses would want.\n\n5. **Be patient** — Domain investing is a long-term game. Some domains take months or years to sell.',
      '## Common Mistakes to Avoid\n\n- Registering too many low-quality domains\n- Ignoring renewal costs (they add up!)\n- Not researching trademark conflicts\n- Paying too much at auctions\n- Expecting quick returns',
      '## Tools You Need\n\n- **Domain search tools**: NameSilo, GoDaddy Auctions\n- **Valuation tools**: GoDaddy Domain Appraisals, Estibot\n- **Sales platforms**: Afternic, Sedo, Dan.com\n- **Analytics**: Google Trends for keyword research',
    ],
  },
  {
    title: 'How to Value a Domain Name',
    description: 'Understand the key factors that determine domain value including length, keywords, TLD, brandability, and market trends.',
    category: 'Fundamentals',
    icon: 'tabler-chart-bar',
    color: 'success.main',
    readTime: '10 min read',
    content: [
      'Domain valuation is both an art and a science. While automated tools can give you a rough estimate, understanding the underlying factors helps you make better investment decisions.',
      '## Key Valuation Factors\n\n### 1. Domain Length\nShorter domains are almost always more valuable:\n- 1-2 letter .com: $100,000 - $10M+\n- 3-4 letter .com: $5,000 - $500,000\n- Single word .com: $10,000 - $5M+\n- Two-word .com: $1,000 - $100,000',
      '### 2. Keywords & Search Volume\nDomains containing popular search keywords carry inherent value. A domain like "BuyInsurance.com" has value because people actively search for those terms. Use Google Keyword Planner to check monthly search volumes.',
      '### 3. TLD (Top-Level Domain)\nNot all TLDs are equal:\n- **.com** — The gold standard. Commands highest prices.\n- **.net, .org** — Respectable alternatives, worth 10-20% of .com equivalent.\n- **.io** — Popular in tech, growing value.\n- **.np** — Valuable for Nepal-focused businesses.\n- **New TLDs** (.app, .dev, .ai) — Niche value in specific industries.',
      '### 4. Brandability\nCan the domain be a brand? Great brand domains are:\n- Easy to spell and pronounce\n- Memorable (people remember it after hearing once)\n- Not easily confused with existing brands\n- Example: "Spotify" as a domain is more brandable than "MusicStreamingOnline"',
      '### 5. Market Demand\nIndustries with high customer acquisition costs pay more for domains:\n- Insurance, finance, legal: Highest prices\n- Technology, SaaS: Strong demand\n- Real estate, travel: Consistent demand\n- Local services in Nepal: Growing market',
      '## Valuation Methods\n\n**Comparable Sales**: Look at what similar domains have sold for. NameBio.com tracks millions of sales.\n\n**Revenue Method**: If the domain generates parking revenue, value = Annual Revenue x 10-15.\n\n**End-User Value**: What would a business pay to own this exact domain? Usually 5-20x what an investor would pay.',
    ],
  },
  {
    title: 'Domain Auction Strategies',
    description: 'Master the art of bidding in domain auctions. Learn when to bid, how to set limits, and avoid common pitfalls.',
    category: 'Advanced',
    icon: 'tabler-gavel',
    color: 'warning.main',
    readTime: '7 min read',
    content: [
      'Domain auctions are one of the most exciting ways to acquire premium domains. But without a strategy, you can easily overpay or miss great opportunities.',
      '## Types of Auctions\n\n### Expiring Domain Auctions\nWhen domain owners let registrations lapse, the domains enter an auction process. These are often the best deals because you are competing against other investors, not the original owner.\n\n### Marketplace Auctions\nOwners list domains for sale at platforms like Sedo, GoDaddy Auctions, or NameJet. Prices tend to be higher as owners set reserves.\n\n### Private Auctions\nDirect negotiation between buyer and seller. No competition but requires negotiation skills.',
      '## Bidding Strategies\n\n1. **Set Your Maximum Before Bidding** — Determine the most you would pay BEFORE the auction starts. Stick to it.\n\n2. **Bid Late (Sniping)** — In time-limited auctions, placing your bid in the final minutes reduces the chance of a bidding war.\n\n3. **Research the Competition** — Check who else is bidding. If a well-funded company is competing, they will likely outbid you.\n\n4. **Use Proxy Bidding** — Set your maximum and let the system bid incrementally for you.\n\n5. **Watch Multiple Auctions** — Do not fixate on one domain. Have alternatives ready.',
      '## Red Flags to Watch\n\n- Domains with trademark issues (could face UDRP)\n- Domains with spammy backlink history (check on Ahrefs)\n- Domains previously used for malware/phishing\n- Auction prices that exceed the domain realistic resale value\n- Domains with upcoming renewal fees higher than the auction price',
    ],
  },
  {
    title: 'Understanding DNS and Nameservers',
    description: 'A technical guide to DNS records, nameserver configuration, and how domain resolution works on the internet.',
    category: 'Technical',
    icon: 'tabler-dns',
    color: 'info.main',
    readTime: '12 min read',
    content: [
      'DNS (Domain Name System) is the phonebook of the internet. It translates human-readable domain names like "hostingnepal.com" into IP addresses like "194.180.176.91" that computers use to communicate.',
      '## How DNS Works\n\n1. You type "hostingnepal.com" in your browser\n2. Your computer asks a DNS resolver "What is the IP for hostingnepal.com?"\n3. The resolver checks its cache. If not found, it queries root servers → TLD servers → authoritative nameservers\n4. The authoritative nameserver responds with the IP address\n5. Your browser connects to that IP address\n\nThis entire process takes milliseconds.',
      '## DNS Record Types\n\n| Record | Purpose | Example |\n|--------|---------|--------|\n| **A** | Points domain to IPv4 address | hostingnepal.com → 194.180.176.91 |\n| **AAAA** | Points domain to IPv6 address | hostingnepal.com → 2a02:c207::1 |\n| **CNAME** | Alias to another domain | www → hostingnepal.com |\n| **MX** | Mail server for the domain | mail.hostingnepal.com (priority 10) |\n| **TXT** | Text records (SPF, DKIM, verification) | v=spf1 include:_spf.google.com |\n| **NS** | Nameserver delegation | ns1.hostingnepals.com |\n| **SRV** | Service location (VoIP, XMPP) | _sip._tcp.hostingnepal.com |',
      '## Nameservers\n\nNameservers are the servers that host your DNS records. When you register a domain, you set nameservers to tell the internet where to find your DNS records.\n\n**Default nameservers for Hosting Nepal:**\n- ns1.hostingnepals.com\n- ns2.hostingnepals.com\n\n**Changing nameservers:**\nGo to Domains → Portfolio → Select domain → Update Nameservers. Changes can take 24-48 hours to propagate worldwide (DNS propagation).',
      '## Common DNS Configurations\n\n**For a website:**\n```\nA     @       → Your server IP\nCNAME www     → @\n```\n\n**For email (Google Workspace):**\n```\nMX    @       → aspmx.l.google.com (priority 1)\nMX    @       → alt1.aspmx.l.google.com (priority 5)\nTXT   @       → v=spf1 include:_spf.google.com ~all\n```\n\n**For email (Titan):**\n```\nMX    @       → mx1.titan.email (priority 10)\nMX    @       → mx2.titan.email (priority 20)\nTXT   @       → v=spf1 include:titan.email ~all\n```',
      '## TTL (Time to Live)\n\nTTL tells DNS resolvers how long to cache a record. Lower TTL = faster propagation but more DNS queries. Recommended:\n- Normal operations: 3600 (1 hour)\n- Before DNS changes: 300 (5 minutes)\n- After changes propagate: 86400 (24 hours)',
    ],
  },
  {
    title: 'Domain Flipping for Profit',
    description: 'Discover techniques for buying undervalued domains and selling them at a profit. Real-world case studies included.',
    category: 'Strategy',
    icon: 'tabler-arrows-exchange',
    color: 'error.main',
    readTime: '9 min read',
    content: [
      'Domain flipping is buying domains at a low price and selling them at a higher price — similar to house flipping. The best flippers have a keen eye for undervalued assets and know how to find the right buyers.',
      '## Finding Undervalued Domains\n\n### Expired Domain Auctions\nMany domain owners forget to renew, letting valuable domains expire. Watch for:\n- Short .com domains (3-5 letters)\n- Keyword-rich domains in profitable niches\n- Domains with existing backlinks and authority\n\n### Registration Opportunities\nNew TLDs and trends create opportunities:\n- New industry buzzwords (AI, blockchain, metaverse)\n- Local business names in growing markets\n- Misspellings of popular brands (be careful of trademarks)',
      '## Selling Strategies\n\n### 1. Outbound Sales\nProactively reach out to potential buyers:\n- Identify businesses that would benefit from the domain\n- Send a professional inquiry email\n- Highlight the SEO and branding value\n- Success rate: 1-5% response, but high per-sale profit\n\n### 2. Marketplace Listings\nList on platforms where buyers search:\n- Afternic (largest marketplace, integrated with GoDaddy)\n- Sedo (European market leader)\n- Dan.com (modern, developer-friendly)\n- Our platform: Hosting Nepal Investor Central\n\n### 3. Domain Parking\nMonetize while waiting to sell:\n- Park with ads to generate small revenue\n- Use a professional landing page with "For Sale" messaging\n- Include a contact form for inquiries',
      '## Case Studies from Nepal\n\n**Case 1: nepal.travel**\nA domain investor registered nepal.travel for $30/year. After holding for 2 years, sold it to a tourism company for $5,000. ROI: 8,233%.\n\n**Case 2: kathmandu.com**\nAn expired domain auction purchase for $500. Received multiple offers and eventually sold for $15,000 to a hotel chain. ROI: 2,900%.\n\n**Case 3: .com.np portfolio**\nAn investor registered 50 .com.np domains related to banking and insurance at NPR 2,500 each. Sold 12 of them over 3 years for an average of NPR 50,000 each. Total investment: NPR 125,000. Revenue: NPR 600,000.',
    ],
  },
  {
    title: 'Protecting Your Domain Portfolio',
    description: 'Security best practices including domain locking, WHOIS privacy, two-factor authentication, and transfer protection.',
    category: 'Security',
    icon: 'tabler-shield-check',
    color: 'secondary.main',
    readTime: '6 min read',
    content: [
      'Your domain portfolio is a valuable digital asset. Domain theft and unauthorized transfers do happen. Here is how to protect yourself.',
      '## Essential Security Measures\n\n### 1. Domain Locking\nAlways keep your domains locked (also called "Registrar Lock" or "Transfer Lock"). This prevents unauthorized transfers. On Hosting Nepal, go to Domains → Portfolio → Click the lock icon.\n\n### 2. WHOIS Privacy\nWHOIS privacy hides your personal information (name, address, email, phone) from public WHOIS lookups. Without it, spammers and scammers can target you. On our platform, WHOIS privacy is FREE for all domains registered through NameSilo.\n\n### 3. Two-Factor Authentication (2FA)\nEnable 2FA on your Hosting Nepal account. This adds a second layer of security beyond your password. Go to Settings → Security → Enable 2FA.\n\n### 4. Strong Passwords\nUse unique, complex passwords for your hosting account. Consider a password manager like Bitwarden or 1Password.',
      '## Advanced Protection\n\n### Domain Monitoring\nSet up alerts for:\n- Unauthorized DNS changes\n- Transfer attempts\n- WHOIS record modifications\n- Expiration reminders (30, 14, 7 days before)\n\n### Auto-Renewal\nEnable auto-renewal for all valuable domains. A single missed renewal can cost you a domain worth thousands. On Hosting Nepal, go to Domains → Portfolio → Enable Auto-Renew.\n\n### Legal Protection\nFor high-value domains:\n- Register trademarks for your brand domains\n- Document your ownership history\n- Consider domain name insurance\n- Keep records of all purchases and sales',
    ],
  },
  {
    title: 'Nepal ccTLD (.np) Investing Guide',
    description: 'Everything you need to know about .np domains, registration requirements, pricing, and investment opportunities in Nepal.',
    category: 'Local',
    icon: 'tabler-flag',
    color: 'primary.main',
    readTime: '11 min read',
    content: [
      'The .np country code TLD (ccTLD) represents Nepal and offers unique investment opportunities as the country digital economy grows rapidly.',
      '## .np Domain Landscape\n\n### Available Extensions\n- **.np** — Primary Nepal domain\n- **.com.np** — Commercial entities (most popular)\n- **.org.np** — Non-profit organizations\n- **.edu.np** — Educational institutions\n- **.gov.np** — Government entities\n- **.net.np** — Network organizations\n- **.mil.np** — Military\n\n### Registration Requirements\n.np domains are managed by Mercantile Communications (https://register.com.np). Requirements:\n- Must provide valid Nepali citizenship or business registration\n- .com.np requires a registered business or trademark\n- Processing time: 1-3 business days (not instant)',
      '## Investment Opportunities\n\n### Why .np Domains Have Value\n1. **Growing digital economy** — Nepal internet penetration is growing 15%+ annually\n2. **Limited supply** — Unlike .com with billions of registrations, .np has only ~100,000 active domains\n3. **Local business adoption** — Nepali businesses increasingly prefer .com.np for local SEO\n4. **Low registration cost** — NPR 2,500/year makes the barrier to entry very low\n\n### High-Value .np Categories\n- Banking/Finance: everestbank.com.np, onlinebanking.com.np\n- Tourism: trekking.com.np, adventure.com.np\n- E-commerce: shop.com.np, bazaar.com.np\n- Education: school.com.np, university.com.np\n- Technology: tech.com.np, software.com.np',
      '## Pricing on Hosting Nepal\n\n| Domain | Registration | Renewal |\n|--------|-------------|--------|\n| .np | NPR 2,500/yr | NPR 2,500/yr |\n| .com.np | NPR 2,500/yr | NPR 2,500/yr |\n\nCompared to .com domains at NPR 3,450/yr, .np domains offer better value for Nepal-focused businesses.',
      '## Tips for .np Investing\n\n1. **Register early** — Many premium .com.np names are still available\n2. **Focus on commercial terms** — Business, finance, real estate keywords\n3. **Consider Nepali transliterations** — Nepali words in Roman script\n4. **Hold long-term** — The .np market is still developing, patience pays\n5. **Build a portfolio** — Start with 10-20 strategic registrations',
    ],
  },
  {
    title: 'Domain Parking Revenue Optimization',
    description: 'Maximize earnings from parked domains with traffic monetization strategies and landing page optimization.',
    category: 'Monetization',
    icon: 'tabler-coin',
    color: 'success.main',
    readTime: '7 min read',
    content: [
      'Domain parking turns unused domains into revenue-generating assets by displaying ads on landing pages. While not a primary income strategy, it can offset renewal costs while you wait for the right buyer.',
      '## How Domain Parking Works\n\n1. You park your domain with a parking service\n2. When someone visits the domain, they see a page with targeted ads\n3. If the visitor clicks an ad, you earn a portion of the ad revenue\n4. Revenue varies from $0.01 to $5+ per click depending on the niche\n\n### Revenue Expectations\n- Average parked domain: $0-5/month\n- Domain with natural traffic: $5-50/month\n- Premium keyword domain: $50-500+/month\n- Geographic domains with local traffic: $10-100/month',
      '## Optimization Strategies\n\n### 1. Choose the Right Parking Provider\n- **Afternic/GoDaddy CashParking** — Best for high-traffic domains\n- **Sedo Parking** — Good for international traffic\n- **ParkingCrew** — Higher per-click rates for some niches\n\n### 2. Keyword Optimization\nParking pages display ads based on keywords. Make sure:\n- Domain name clearly reflects a commercial topic\n- Meta tags contain relevant keywords\n- Categories are correctly set in parking dashboard\n\n### 3. "For Sale" Landing Pages\nInstead of generic parking pages, use custom landing pages:\n- Professional design with your branding\n- Clear "This domain is for sale" messaging\n- Contact form or Buy-It-Now price\n- This can generate both ad revenue AND sales inquiries',
      '## On Hosting Nepal\n\nEnable parking for your domains:\n1. Go to **Domains → Investor Central → Domain Parking**\n2. Toggle parking ON for each domain\n3. Revenue is tracked in your dashboard\n4. Payouts are processed monthly to your wallet',
    ],
  },
  {
    title: 'Trademark and Legal Considerations',
    description: 'Navigate the legal landscape of domain investing. Understand UDRP, trademark disputes, and cybersquatting laws.',
    category: 'Legal',
    icon: 'tabler-scale',
    color: 'warning.main',
    readTime: '10 min read',
    content: [
      'Understanding the legal aspects of domain investing is crucial. Registering domains that infringe on trademarks can lead to losing the domain and facing legal action.',
      '## UDRP (Uniform Domain-Name Dispute-Resolution Policy)\n\nUDRP is the most common way trademark holders reclaim domains. A UDRP complaint requires proving:\n\n1. **Identical or confusingly similar** — The domain is identical or confusingly similar to a registered trademark\n2. **No legitimate interest** — The domain owner has no rights or legitimate interest in the domain\n3. **Bad faith registration** — The domain was registered in bad faith to profit from the trademark\n\n### How to Protect Yourself\n- Never register domains that are clearly brand names (e.g., "NikeShoes.com")\n- Document your legitimate use or investment intent\n- If you developed content on the domain, keep records\n- Respond to UDRP complaints within the deadline (20 days)',
      '## Cybersquatting Laws\n\n### In the USA (ACPA — Anticybersquatting Consumer Protection Act)\nRegistering a domain in bad faith to profit from someone else trademark can result in:\n- Forced transfer of the domain\n- Damages up to $100,000 per domain\n\n### In Nepal\nNepal does not have specific cybersquatting laws yet, but trademark holders can file complaints through:\n- WIPO UDRP process\n- Nepal IP Office\n- Civil courts',
      '## Safe Domain Investing Practices\n\n1. **Before registering:**\n   - Search the USPTO trademark database (uspto.gov)\n   - Search Nepal IP records\n   - Google the exact domain name\n   - Check if a business with that name exists\n\n2. **Generic terms are generally safe:**\n   - "BestInsurance.com" — Generic, safe\n   - "StateFarmInsurance.com" — Trademark, unsafe\n   - "Himalaya.com.np" — Generic geographic term, generally safe\n\n3. **When in doubt, do not register.** The risk is not worth the potential reward.\n\n4. **Keep records** of why you registered each domain and any development plans.',
    ],
  },
]

const AcademyPage = () => {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)

  if (selectedArticle) {
    return (
      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <Button
            startIcon={<i className='tabler-arrow-left' />}
            onClick={() => setSelectedArticle(null)}
            sx={{ mb: 2 }}
          >
            Back to Academy
          </Button>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Avatar sx={{ bgcolor: selectedArticle.color, width: 48, height: 48 }}>
                  <i className={selectedArticle.icon} style={{ fontSize: 24, color: '#fff' }} />
                </Avatar>
                <Box>
                  <Chip label={selectedArticle.category} size='small' variant='outlined' sx={{ mb: 0.5 }} />
                  <Typography variant='h4'>{selectedArticle.title}</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {selectedArticle.readTime}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              {selectedArticle.content.map((section, idx) => (
                <Box key={idx} sx={{ mb: 3 }}>
                  {section.split('\n').map((line, lineIdx) => {
                    if (line.startsWith('## ')) {
                      return (
                        <Typography key={lineIdx} variant='h5' sx={{ mt: 4, mb: 2 }} fontWeight={700}>
                          {line.replace('## ', '')}
                        </Typography>
                      )
                    }
                    if (line.startsWith('### ')) {
                      return (
                        <Typography key={lineIdx} variant='h6' sx={{ mt: 3, mb: 1.5 }} fontWeight={600}>
                          {line.replace('### ', '')}
                        </Typography>
                      )
                    }
                    if (line.startsWith('- **') || line.startsWith('- ')) {
                      return (
                        <Typography key={lineIdx} variant='body1' sx={{ ml: 2, mb: 0.5, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                          <span style={{ color: '#7c3aed', fontWeight: 700 }}>•</span>
                          <span dangerouslySetInnerHTML={{ __html: line.replace(/^- /, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                        </Typography>
                      )
                    }
                    if (line.startsWith('|')) {
                      return (
                        <Typography key={lineIdx} variant='body2' sx={{ fontFamily: 'monospace', mb: 0.3 }}>
                          {line}
                        </Typography>
                      )
                    }
                    if (line.startsWith('```')) return null
                    if (line.match(/^\d+\./)) {
                      return (
                        <Typography key={lineIdx} variant='body1' sx={{ ml: 2, mb: 0.5 }}>
                          <span dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                        </Typography>
                      )
                    }
                    if (line.trim() === '') return <Box key={lineIdx} sx={{ mb: 1 }} />
                    return (
                      <Typography key={lineIdx} variant='body1' color='text.secondary' sx={{ mb: 1, lineHeight: 1.8 }}>
                        <span dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#333">$1</strong>') }} />
                      </Typography>
                    )
                  })}
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    )
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant='h4'>Domain Investor Academy</Typography>
            <Typography variant='body2' color='text.secondary'>
              Educational resources for domain investing — {articles.length} guides available
            </Typography>
          </Box>
        </Box>
      </Grid>

      {/* Welcome Card */}
      <Grid size={{ xs: 12 }}>
        <Card sx={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3, py: 4 }}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 64, height: 64 }}>
              <i className='tabler-school' style={{ fontSize: 32, color: '#fff' }} />
            </Avatar>
            <Box>
              <Typography variant='h5' sx={{ mb: 1, color: '#fff' }}>Welcome to the Domain Academy</Typography>
              <Typography variant='body1' sx={{ color: 'rgba(255,255,255,0.85)' }}>
                Whether you are a beginner or experienced domain investor, our comprehensive guides cover
                everything from valuation to legal considerations. Start learning and grow your domain portfolio today.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Article Cards */}
      {articles.map((article, idx) => (
        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={idx}>
          <Card
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
            }}
            onClick={() => setSelectedArticle(article)}
          >
            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Avatar sx={{ bgcolor: article.color, width: 44, height: 44 }}>
                  <i className={article.icon} style={{ fontSize: 22, color: '#fff' }} />
                </Avatar>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip label={article.category} size='small' variant='outlined' />
                  <Chip label={article.readTime} size='small' variant='outlined' color='default' />
                </Box>
              </Box>
              <Typography variant='h6' sx={{ mb: 1 }}>
                {article.title}
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 3, flex: 1, lineHeight: 1.7 }}>
                {article.description}
              </Typography>
              <Button variant='outlined' size='small' fullWidth>
                Read Article
              </Button>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}

export default AcademyPage
