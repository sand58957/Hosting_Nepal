# HOSTING NEPAL - ENHANCED PROJECT SPECIFICATION
## Version 2.1 | Research-Backed | Production-Grade | Fully Self-Service

---

# PART 1: MARKET INTELLIGENCE

---

## 1.1 NEPAL HOSTING MARKET SIZE

| Metric | Value |
|--------|-------|
| 2025 Revenue | US$34.7-35.5 million |
| 2029 Projected | US$73 million |
| CAGR | 19.79% |
| Nepal Public Cloud Market | US$138.76M (2025) -> US$387M (2030) |
| Internet Users | 16.6 million (56% penetration) |
| Mobile Connections | 32.4 million (109% of population) |
| Total Population | ~29.7 million |
| .np Domains Registered | 150,000-200,000+ |

## 1.2 COMPETITOR PRICING LANDSCAPE

| Service | Cheapest | Average | Expensive |
|---------|----------|---------|-----------|
| Shared Hosting/yr | NPR 480 (NepalCloud) | NPR 1,399 | NPR 3,820 (AGM) |
| .com Domain/yr | NPR 1,199 | NPR 1,600 | NPR 2,350 |
| .np Domain | FREE (changing soon) | -- | -- |
| SSL | Free Let's Encrypt | -- | NPR 25,500/yr (Wildcard) |
| Email Hosting/yr | Included free | NPR 2,000-9,000 | NPR 8,388/yr (G Suite) |
| VPS/mo | NPR 899 | NPR 1,500 | NPR 2,499 |

## 1.3 TOP 10 MARKET GAPS (YOUR COMPETITIVE ADVANTAGES)

| # | Gap | No Competitor Offers | Your Opportunity |
|---|-----|---------------------|------------------|
| 1 | Public uptime status page | Third-party verified uptime | Build trust with transparency |
| 2 | Transparent renewal pricing | All have hidden renewal hikes | Show renewal price upfront |
| 3 | SLA with financial penalties | No provider offers money-back SLA | 99.9% SLA with credit guarantee |
| 4 | Nepali language dashboard | All English-only | First Nepali hosting dashboard |
| 5 | Git deploy / CI/CD / staging | Zero providers | Target developers & agencies |
| 6 | WooCommerce + Nepal payments | No pre-integrated bundles | eSewa/Khalti pre-configured |
| 7 | Container/Kubernetes hosting | Not available locally | Enterprise differentiator |
| 8 | Nepal CDN presence | All use international CDNs | Partner with local ISPs |
| 9 | Compliance-ready hosting | No regulated industry hosting | Banking/fintech/healthcare ready |
| 10 | Pay-as-you-go billing | All annual/monthly only | Hourly billing for VPS |

---

# PART 2: ENHANCED SYSTEM ARCHITECTURE

---

## 2.1 ARCHITECTURE OVERVIEW

```
                        HOSTING NEPAL - SYSTEM ARCHITECTURE

[Users/Browsers]
       |
[Cloudflare CDN + WAF + DDoS Protection]
       |
[Nginx API Gateway + Rate Limiter + Load Balancer]
       |
       +---> [Next.js Frontend (SSR + Static)]
       |
       +---> [NestJS API Layer]
                |
                +---> Auth Service (JWT + 2FA)
                +---> Domain Service (ResellerClub API)
                +---> Hosting Service (ResellerClub + Own Infra)
                +---> WordPress Service (CyberPanel/EasyEngine API)
                +---> SSL Service (Let's Encrypt + ResellerClub)
                +---> Email Service (Titan/Google Workspace API)
                +---> Billing Service (FOSSBilling/Custom)
                +---> Reseller Service (White-label)
                +---> Notification Service (Email + SMS + Push)
                +---> Analytics Service (Metrics + Logs)
                |
                +---> [PostgreSQL] (Primary DB)
                +---> [Redis] (Cache + Sessions + Queues)
                +---> [RabbitMQ] (Event Bus)
                +---> [BullMQ Workers] (Background Jobs)
                |
                +---> [External APIs]
                        +---> ResellerClub HTTP API
                        +---> Khalti Payment API
                        +---> eSewa ePay v2 API
                        +---> ConnectIPS API
                        +---> Sparrow SMS API (Nepal)
                        +---> Cloudflare API
```

## 2.2 TECH STACK (ENHANCED)

### Frontend
| Technology | Purpose |
|------------|---------|
| Next.js 14+ (App Router) | SSR + Static + API routes |
| TypeScript | Type safety |
| Tailwind CSS + shadcn/ui | Design system |
| Zustand | State management |
| TanStack Query (React Query) | API data fetching + caching |
| next-intl | i18n (Nepali + English) |
| Recharts | Dashboard analytics charts |

### Backend
| Technology | Purpose |
|------------|---------|
| NestJS | Microservices framework |
| TypeScript | Type safety |
| Prisma ORM | Database access |
| Passport.js | Authentication strategies |
| class-validator | Request validation |
| @nestjs/bull | Job queue integration |
| @nestjs/websockets | Real-time notifications |

### Database
| Technology | Purpose |
|------------|---------|
| PostgreSQL 16 | Primary relational DB |
| Redis 7 | Caching, sessions, rate limiting, pub/sub |
| TimescaleDB (extension) | Time-series metrics (uptime, usage) |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Docker + Docker Compose | Containerization |
| Kubernetes (Phase 2) | Orchestration at scale |
| Nginx | Reverse proxy + load balancer |
| Cloudflare | CDN + DNS + WAF + DDoS |
| GitHub Actions | CI/CD pipeline |
| Prometheus + Grafana | Monitoring + alerting |
| Sentry | Error tracking |
| ELK Stack | Centralized logging |

### Queue System
| Technology | Purpose |
|------------|---------|
| RabbitMQ | Event-driven messaging (domain events) |
| BullMQ | Job scheduling (CRON, retries) |
| Redis Pub/Sub | Real-time notifications |

---

# PART 3: CORE MODULES (ENHANCED)

---

## 3.1 AUTH MODULE

### Features
- User Registration (email + phone verification)
- Login (email/password + social OAuth)
- JWT Access + Refresh token rotation
- 2FA via TOTP (Google Authenticator) + SMS OTP
- Role-based access control (RBAC)
- Session management (multiple device tracking)
- Password reset with rate limiting
- Account lockout after failed attempts
- IP-based login alerts

### Roles & Permissions
| Role | Permissions |
|------|------------|
| CUSTOMER (B2C) | Manage own services, billing, support tickets |
| BUSINESS (B2B) | Customer + team management + API access |
| RESELLER | Business + white-label + sub-customer management + custom pricing |
| SUPPORT_AGENT | View customers, manage tickets, limited service actions |
| ADMIN | Full platform access except billing config |
| SUPER_ADMIN | Everything including billing, pricing, system config |

### Security Implementation
```
Login Flow:
1. User submits email + password
2. Server validates credentials (bcrypt hash comparison)
3. If 2FA enabled -> send TOTP/SMS challenge
4. User provides 2FA code
5. Server issues JWT access token (15min) + refresh token (7 days)
6. Refresh token stored in httpOnly secure cookie
7. Access token stored in memory (not localStorage)
8. On token expiry -> silent refresh via refresh token
9. On refresh token expiry -> force re-login
```

---

## 3.2 DOMAIN MODULE (ResellerClub API)

### API Integration Details

**Base URLs:**
- Production: `https://httpapi.com/api/`
- Sandbox: `https://test.httpapi.com/api/`
- Domain Check: `https://domaincheck.httpapi.com/api/`

**Authentication:** `auth-userid` + `api-key` on every request

### Available Endpoints
| Action | Endpoint | Method |
|--------|----------|--------|
| Check availability | `/api/domains/available.json` | GET |
| Register domain | `/api/domains/register.json` | POST |
| Renew domain | `/api/domains/renew.json` | POST |
| Transfer domain | `/api/domains/transfer.json` | POST |
| Get details | `/api/domains/details.json` | GET |
| Modify nameservers | `/api/domains/modify-ns.json` | POST |
| Modify contacts | `/api/domains/modify-contact.json` | POST |
| Enable lock | `/api/domains/enable-theft-protection.json` | POST |
| Search orders | `/api/domains/search.json` | GET |
| Domain suggestions | `/api/domains/suggest-names.json` | GET |

### DNS Management Endpoints
| Action | Endpoint |
|--------|----------|
| Add A record | `/api/dns/manage/add-ipv4-record.json` |
| Add AAAA record | `/api/dns/manage/add-ipv6-record.json` |
| Add CNAME | `/api/dns/manage/add-cname-record.json` |
| Add MX record | `/api/dns/manage/add-mx-record.json` |
| Add TXT record | `/api/dns/manage/add-txt-record.json` |
| Add SRV record | `/api/dns/manage/add-srv-record.json` |
| Search records | `/api/dns/manage/search.json` |

### Features
- Domain search with AI-powered suggestions
- Bulk domain search (up to 25 TLDs at once)
- Domain registration with auto-contact creation
- Domain renewal with expiry alerts (30/15/7/3/1 day)
- Domain transfer with EPP code validation
- WHOIS privacy protection toggle
- DNS zone editor (A, AAAA, CNAME, MX, TXT, SRV, NS)
- Child nameserver management
- Domain lock/unlock
- IDN (Internationalized Domain Name) support

### API Gotchas to Handle
- NO webhooks - must implement polling for status changes
- No published rate limits - implement request queuing
- Only 3 IPs whitelisted by default
- Test URL with live credentials = LIVE operations (dangerous!)
- Only a-z, 0-9 in customer data (no accented characters)
- Phone country code must go in separate `phone-cc` field
- URL-encode all parameter values

### Pricing API
```
# Get wholesale (your cost) pricing
GET /api/products/reseller-cost-price.json?product-key=domorder

# Get customer pricing
GET /api/products/customer-price.json?product-key=domorder&customer-id={id}
```

---

## 3.3 HOSTING MODULE

### Strategy: Hybrid Approach

| Tier | Provider | Target Market |
|------|----------|---------------|
| Basic Shared | ResellerClub API | Budget customers, beginners |
| Managed WordPress | Own Infrastructure (VPS + CyberPanel) | WordPress users, bloggers |
| WooCommerce | Own Infrastructure (VPS + optimized stack) | E-commerce businesses |
| Cloud VPS | Own Infrastructure (Vultr API) | Developers, agencies |
| Reseller Hosting | ResellerClub API | Sub-resellers (B2B) |

### ResellerClub Hosting API

| Product | API Path | Plans |
|---------|----------|-------|
| Single Domain Linux | `/api/singledomainhosting/` | Economy, Deluxe, Ultimate |
| Single Domain Windows | `/api/singledomainwindowshosting/` | Economy, Deluxe, Ultimate |
| Multi Domain Linux | `/api/multidomainhosting/` | Various tiers |
| Reseller Hosting | `/api/resellerhosting/` | R1, R2, R3, R4 |

Common sub-endpoints: `add`, `details`, `renew`, `modify`, `delete`, `suspend`, `unsuspend`, `upgrade`

### Own Infrastructure Stack
```
[Vultr Mumbai/Bangalore VPS]
    |
[CyberPanel (Free) or EasyEngine]
    |
[OpenLiteSpeed Web Server]
    |
[LiteSpeed Cache + Redis + OPcache]
    |
[MariaDB 10.11+]
    |
[Backblaze B2 Backups]
```

### Hosting Provisioning Flow
```
1. Customer purchases hosting plan
2. Event: HOSTING_PURCHASED dispatched
3. Worker determines provider (ResellerClub vs Own Infra)
4. If ResellerClub:
   a. POST /api/singledomainhosting/add.json
   b. Poll for provisioning completion
   c. Store credentials in encrypted DB
5. If Own Infrastructure:
   a. CyberPanel API: Create website
   b. Create database + user
   c. Install SSL (Let's Encrypt)
   d. Configure DNS records
   e. Store credentials
6. Send credentials email to customer
7. Update order status to ACTIVE
```

---

## 3.4 WORDPRESS HOSTING MODULE (NEW)

### Performance Stack
```
[Cloudflare Edge Cache + HTTP/3 + Brotli]     <- Layer 1
    |
[OpenLiteSpeed + LiteSpeed Cache Plugin]       <- Layer 2
    |
[OPcache (PHP 8.3 bytecode cache)]            <- Layer 3
    |
[Redis Object Cache]                           <- Layer 4
    |
[MariaDB + Query Cache]                        <- Layer 5
```

### WordPress Hosting Plans

| Plan | Resources | Price/mo | Target |
|------|-----------|----------|--------|
| WP Starter | 1 site, 5GB NVMe, 50GB BW | NPR 299 | Personal blogs |
| WP Business | 3 sites, 20GB NVMe, 200GB BW | NPR 799 | Small business |
| WP Pro | 10 sites, 50GB NVMe, Unlimited BW | NPR 1,999 | Agencies |
| WP Enterprise | 25 sites, 100GB NVMe, Unlimited BW | NPR 4,999 | Large businesses |
| WooCommerce | 1 store, 30GB NVMe, Unlimited BW | NPR 1,499 | E-commerce |

### Managed WordPress Features
- Auto WordPress installation on plan purchase
- 1-click staging environment (push/pull between staging & production)
- Auto updates (core + plugins + themes) with pre-update snapshots
- WP-CLI access via SSH
- PHP version switcher (8.1, 8.2, 8.3, 8.4)
- Daily automated backups (30-day retention to Backblaze B2)
- 1-click restore from any backup point
- Malware scanning (Imunify360)
- WAF (Cloudflare + Imunify360 dual-layer)
- Redis object caching (pre-configured)
- Free CDN (Cloudflare)
- Free SSL (Let's Encrypt auto-renewal)
- WordPress health monitor (TTFB, Core Web Vitals)
- Database optimization tools
- Search & Replace tool (for URL migrations)
- Error log viewer in dashboard
- Brute force protection (rate limiting + IP blocking)
- File integrity monitoring

### WordPress Hardening (Applied by Default)
1. Disable PHP execution in `/wp-content/uploads/`
2. Custom `wp_` table prefix per installation
3. Disable XML-RPC
4. Remove WordPress version meta tag
5. `DISALLOW_FILE_EDIT` in wp-config.php
6. Force HTTPS with HSTS headers
7. Secure file permissions (644/755)
8. Hide wp-config.php from web
9. Disable directory listing
10. Security headers (CSP, X-Frame-Options, X-Content-Type-Options)

### WooCommerce Hosting Features
- Pre-installed WooCommerce + Starter theme
- Nepal payment gateway plugins pre-configured (eSewa, Khalti, ConnectIPS)
- Redis for cart/session performance
- Higher PHP memory limits (512MB+)
- Database optimization for product queries
- Image optimization (WebP auto-conversion)
- SMTP pre-configured for transactional emails

### Migration Tools
- Plugin-based: All-in-One WP Migration, Duplicator support
- CLI-based: wp-cli + rsync automated migration
- Custom migration wizard in dashboard
- DNS migration assistance with step-by-step guide

### Server Management Options
| Tool | Cost | Best For |
|------|------|----------|
| CyberPanel | Free | Startup phase, OpenLiteSpeed native |
| EasyEngine | Free | Docker-based, developer-friendly |
| RunCloud | $8/mo | Managed panel, multi-server |
| CloudPanel | Free | Modern UI, Nginx-based |
| WordOps | Free | CLI-only, WordPress-optimized |

**Recommendation:** CyberPanel for Phase 1 (free, OpenLiteSpeed native, GUI). Move to custom solution in Phase 2.

---

## 3.5 SSL MODULE

### Strategy
| SSL Type | Source | Automation |
|----------|--------|------------|
| Free DV SSL | Let's Encrypt (via CyberPanel/Certbot) | Auto-issue + auto-renew CRON |
| Paid DV SSL | ResellerClub API (Sectigo PositiveSSL) | API-provisioned |
| Wildcard SSL | ResellerClub API (PositiveSSL Wildcard) | API-provisioned |
| EV SSL | ResellerClub API (Sectigo EV) | API-provisioned + manual verification |

### ResellerClub SSL API
```
POST /api/sslcert/add.json         # Order certificate
POST /api/sslcert/enroll.json      # Activate/enroll
POST /api/sslcert/renew.json       # Renew
POST /api/sslcert/reissue.json     # Reissue
GET  /api/sslcert/details.json     # Get details
GET  /api/sslcert/search.json      # Search orders
```

### Automation Flow
```
1. Domain registered/hosting provisioned
2. Event: SSL_AUTO_PROVISION triggered
3. If free plan -> Certbot/ACME auto-issue Let's Encrypt
4. If paid plan -> ResellerClub API order + CSR generation
5. CRON: Check SSL expiry daily
6. 30 days before expiry -> auto-renew attempt
7. If renewal fails -> email + SMS alert
8. 7 days before expiry -> urgent notification
```

---

## 3.6 EMAIL MODULE

### Strategy
| Option | Source | Best For |
|--------|--------|----------|
| Titan Email | ResellerClub API (`/api/eelite/`) | Budget business email |
| Google Workspace | ResellerClub API (`/api/gapps/`) | Premium business email |
| Free Email | Included with hosting (cPanel/CyberPanel) | Basic email |

### ResellerClub Email API
```
# Titan Email
POST /api/eelite/us/add.json       # Place order
GET  /api/eelite/us/details.json   # Get details
POST /api/eelite/us/renew.json     # Renew
POST /api/eelite/us/delete.json    # Delete

# Google Workspace
POST /api/gapps/add.json           # Place order
GET  /api/gapps/details.json       # Get details
POST /api/gapps/renew.json         # Renew (55-day grace)
POST /api/gapps/delete.json        # Delete
```

### Email Features
- Business email with custom domain (@yourbusiness.com)
- Webmail access (Roundcube for free, Titan/Google for paid)
- SMTP/IMAP/POP3 configuration auto-generator
- Spam filtering (SpamAssassin on free, provider-level on paid)
- Email forwarding setup
- Autoresponder configuration
- Mailing list management
- DKIM + SPF + DMARC auto-configuration
- Email client setup guides (Outlook, Thunderbird, Gmail, Apple Mail)

---

## 3.7 BILLING MODULE (ENHANCED)

### Billing Platform Choice

| Platform | Cost | Pros | Cons |
|----------|------|------|------|
| FOSSBilling | FREE | Open-source, no client limits | Newer, smaller community |
| Blesta | $12.95/mo or $250 lifetime | Clean, modular, dev-friendly | Smaller ecosystem |
| WHMCS | $15.95/mo (250 clients) | Industry standard, most modules | Expensive, client limits |
| Custom Built | Dev cost | Full control, no limits | High development effort |

**Recommendation:** FOSSBilling for MVP (free, no limits). Evaluate Blesta for Phase 2 if needed.

### Nepal Payment Gateways

#### Primary: Khalti
- API Docs: docs.khalti.com
- Flow: Initiate -> get `pidx` + `payment_url` -> redirect user -> callback -> verify via lookup API
- Sandbox: test-admin.khalti.com (OTP: 987654)
- SDKs: Web, Flutter, Android
- Accepts: Khalti wallet, mobile banking, SCT/VISA cards
- Requirements: Registered business + PAN/VAT + Tax Clearance

#### Secondary: eSewa
- API Docs: developer.esewa.com.np
- ePay v2 endpoint: `https://epay.esewa.com.np/api/epay/main/v2/form`
- Uses HMAC signature-based authentication
- PHP SDK: github.com/remotemerge/esewa-php-sdk
- Largest user base in Nepal

#### Bank Transfers: ConnectIPS
- Flat fees: NPR 2-8 per transaction (cheapest option)
- Uses digital certificate (PFX) for signing
- Web limit: NPR 2,000,000 per transaction
- WHMCS module available in marketplace
- Supports NEPALPAY Request for recurring e-Mandates

#### Aggregator Option: API Nepal (apinepal.com)
- Single API for eSewa + Khalti + IME Pay + Prabhu Pay + FonePay
- PCI-DSS compliant
- T+1 settlement
- Simplifies integration significantly

### NRB Transaction Limits
| Channel | Daily Limit | Monthly Limit |
|---------|-------------|---------------|
| Web/Internet banking | NPR 2,000,000 | No limit |
| Wallet-to-wallet | NPR 50,000 | NPR 500,000 |
| Bank-to-wallet | NPR 200,000 | NPR 1,000,000 |

### Recurring Billing Challenge
**CRITICAL:** No Nepal payment gateway supports auto-debit/auto-charge subscriptions natively.

**Solution:**
```
1. On subscription renewal date:
   a. Generate invoice
   b. Send email + SMS notification with payment link
   c. Customer clicks link -> pays via Khalti/eSewa
   d. Webhook confirms payment
   e. Service renewed automatically
2. Grace period: 7 days after due date
3. Suspension: After 7-day grace period
4. Deletion: 30 days after suspension (with data backup)
5. Reminders: Day 0, Day 3, Day 5, Day 7 (suspension warning)
```

### Nepal Tax Compliance
| Requirement | Detail |
|-------------|--------|
| VAT Rate | 13% on all SaaS services |
| VAT Registration | Required if turnover > NPR 2,000,000/year |
| VAT Filing | Monthly, due within 25 days |
| Record Retention | 5 years |
| TDS on USD Payments | ~15% on foreign service payments (ResellerClub) |
| Effective USD Cost Increase | ~17.52% due to TDS |

### Pricing Strategy (Factor All Costs)
```
Your selling price must cover:
  + ResellerClub wholesale cost
  + 17.52% TDS overhead on USD costs
  + 13% VAT (collected from customer, remitted to govt)
  + Payment gateway fees (1-3%)
  + Infrastructure costs
  + Support costs
  + Your profit margin (target: 40-60%)
```

---

## 3.8 RESELLER / B2B MODULE

### Features
- White-label dashboard (custom logo, colors, domain)
- Custom pricing per reseller (set markup)
- Sub-customer management
- Reseller billing (prepaid wallet model)
- Commission tracking
- API access for resellers
- Multi-tier reseller hierarchy
- Branded email communications
- Custom nameservers (ns1.resellerdomain.com)
- Reseller analytics dashboard

### ResellerClub Sub-Reseller API
```
POST /api/resellers/signup.json          # Create sub-reseller
GET  /api/resellers/details.json         # Get details
POST /api/resellers/modify.json          # Modify reseller
GET  /api/resellers/search.json          # Search resellers
```

---

## 3.9 ADMIN PANEL

### Dashboard Sections
- **Overview:** Revenue, new signups, active services, support tickets
- **User Management:** CRUD, role assignment, suspension, impersonation
- **Order Monitoring:** All orders, status tracking, manual provisioning
- **Revenue Analytics:** Daily/monthly revenue, ARPU, churn rate, LTV
- **Service Control:** Enable/disable products, pricing management
- **API Logs:** ResellerClub API call logs, error tracking
- **Fraud Detection:** Suspicious signups, payment fraud, abuse reports
- **Server Health:** Uptime, resource usage, alerts
- **Support Queue:** Ticket management, SLA tracking
- **Content Management:** Knowledge base, blog, announcements

---

# PART 4: AUTOMATION SYSTEM

---

## 4.1 EVENT-DRIVEN ARCHITECTURE

### Event Flow
```
USER_REGISTERED
  -> Send welcome email
  -> Create ResellerClub customer account
  -> Assign free trial (if applicable)

DOMAIN_PURCHASED
  -> Register domain via ResellerClub API
  -> Poll registration status every 60s
  -> On success: Create DNS records
  -> Trigger HOSTING_PROVISION (if bundled)
  -> Trigger SSL_PROVISION
  -> Trigger EMAIL_SETUP (if bundled)
  -> Send credentials email + SMS

HOSTING_PURCHASED
  -> Determine provider (RC vs Own Infra)
  -> Provision hosting account
  -> Configure domain -> hosting mapping
  -> Install SSL certificate
  -> If WordPress plan: auto-install WordPress
  -> Send credentials

PAYMENT_RECEIVED
  -> Verify via gateway lookup API
  -> Update order status to PAID
  -> Trigger service provisioning
  -> Generate invoice (with 13% VAT)
  -> Send invoice email

PAYMENT_FAILED
  -> Retry after 24 hours
  -> Send payment reminder
  -> After 3 failures: suspend service
  -> After 30 days: terminate (with backup)

SERVICE_EXPIRING
  -> 30 days before: email reminder
  -> 15 days before: email + SMS
  -> 7 days before: email + SMS + dashboard alert
  -> 3 days before: urgent notification
  -> 1 day before: final warning
  -> Expiry date: suspend service
  -> +7 days: grace period ends
  -> +30 days: data deletion (after backup)
```

## 4.2 CRON JOBS

| Job | Frequency | Purpose |
|-----|-----------|---------|
| Domain expiry check | Daily 6 AM | Send renewal reminders |
| Hosting renewal check | Daily 6 AM | Send renewal reminders |
| SSL renewal | Daily 2 AM | Auto-renew Let's Encrypt (30 days before expiry) |
| Payment retry | Every 6 hours | Retry failed payments |
| Backup job | Daily 3 AM | Run incremental backups |
| Backup cleanup | Weekly Sunday 4 AM | Remove expired backups |
| WordPress updates | Weekly Tuesday 3 AM | Auto-update WP core + plugins |
| Malware scan | Daily 5 AM | Scan all sites for malware |
| Usage metrics | Every 15 minutes | Collect bandwidth/storage/CPU |
| Invoice generation | Monthly 1st | Generate monthly invoices |
| ResellerClub sync | Every 30 minutes | Poll for order status changes |
| DNS propagation check | Every 5 minutes | Check pending DNS changes |
| Uptime monitoring | Every 1 minute | Check all hosted sites |
| Database optimization | Weekly Sunday 2 AM | Optimize WordPress databases |

## 4.3 POLLING SYSTEM (ResellerClub - No Webhooks)

Since ResellerClub has NO webhook support, implement a smart polling system:

```typescript
// Polling Strategy
interface PollingConfig {
  domainRegistration: {
    interval: 60_000,      // Every 60 seconds
    maxAttempts: 30,       // Max 30 minutes
    endpoint: '/api/domains/details.json'
  },
  domainTransfer: {
    interval: 300_000,     // Every 5 minutes
    maxAttempts: 2016,     // Max 7 days
    endpoint: '/api/domains/details.json'
  },
  hostingProvisioning: {
    interval: 30_000,      // Every 30 seconds
    maxAttempts: 60,       // Max 30 minutes
    endpoint: '/api/singledomainhosting/details.json'
  },
  sslEnrollment: {
    interval: 120_000,     // Every 2 minutes
    maxAttempts: 30,       // Max 1 hour
    endpoint: '/api/sslcert/details.json'
  }
}

// Use exponential backoff: 30s -> 60s -> 120s -> 300s
// Store poll jobs in Redis with TTL
// Use BullMQ repeatable jobs for scheduled polling
```

---

# PART 5: DATABASE SCHEMA (ENHANCED)

---

```sql
-- USERS
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  role ENUM('CUSTOMER','BUSINESS','RESELLER','SUPPORT_AGENT','ADMIN','SUPER_ADMIN') DEFAULT 'CUSTOMER',
  status ENUM('ACTIVE','SUSPENDED','PENDING_VERIFICATION','DELETED') DEFAULT 'PENDING_VERIFICATION',
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret VARCHAR(255),
  reseller_club_customer_id VARCHAR(50),
  preferred_language ENUM('en','ne') DEFAULT 'en',
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMP,
  last_login_ip VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- DOMAINS
CREATE TABLE domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  domain_name VARCHAR(255) NOT NULL UNIQUE,
  tld VARCHAR(20) NOT NULL,
  rc_order_id VARCHAR(50),              -- ResellerClub order ID
  status ENUM('PENDING','ACTIVE','EXPIRED','SUSPENDED','TRANSFERRING','DELETED') DEFAULT 'PENDING',
  registration_date DATE,
  expiry_date DATE,
  auto_renew BOOLEAN DEFAULT TRUE,
  privacy_protection BOOLEAN DEFAULT FALSE,
  theft_protection BOOLEAN DEFAULT TRUE,
  nameservers JSONB,                     -- ["ns1.example.com", "ns2.example.com"]
  dns_records JSONB,                     -- Cached DNS records
  whois_contact_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- HOSTING_ACCOUNTS
CREATE TABLE hosting_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  domain_id UUID REFERENCES domains(id),
  provider ENUM('RESELLERCLUB','OWN_INFRA','VULTR') NOT NULL,
  plan_type ENUM('SHARED','WORDPRESS','WOOCOMMERCE','VPS','RESELLER','DEDICATED') NOT NULL,
  plan_name VARCHAR(100) NOT NULL,
  rc_order_id VARCHAR(50),
  server_id VARCHAR(50),                 -- For own infra
  cpanel_username VARCHAR(50),
  cpanel_password_encrypted TEXT,
  ip_address VARCHAR(45),
  disk_space_mb INTEGER,
  bandwidth_mb INTEGER,
  disk_used_mb INTEGER DEFAULT 0,
  bandwidth_used_mb INTEGER DEFAULT 0,
  php_version VARCHAR(10) DEFAULT '8.3',
  status ENUM('PENDING','PROVISIONING','ACTIVE','SUSPENDED','EXPIRED','DELETED') DEFAULT 'PENDING',
  provisioned_at TIMESTAMP,
  expiry_date DATE,
  auto_renew BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- WORDPRESS_SITES
CREATE TABLE wordpress_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hosting_id UUID REFERENCES hosting_accounts(id),
  domain_id UUID REFERENCES domains(id),
  wp_version VARCHAR(20),
  php_version VARCHAR(10),
  admin_url VARCHAR(255),
  staging_url VARCHAR(255),
  staging_active BOOLEAN DEFAULT FALSE,
  auto_updates_enabled BOOLEAN DEFAULT TRUE,
  redis_enabled BOOLEAN DEFAULT FALSE,
  litespeed_cache_enabled BOOLEAN DEFAULT TRUE,
  last_backup_at TIMESTAMP,
  last_malware_scan_at TIMESTAMP,
  core_web_vitals JSONB,                 -- {lcp: 2.1, fid: 50, cls: 0.05}
  installed_plugins JSONB,
  installed_themes JSONB,
  status ENUM('INSTALLING','ACTIVE','MAINTENANCE','SUSPENDED') DEFAULT 'INSTALLING',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- SSL_CERTIFICATES
CREATE TABLE ssl_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES domains(id),
  type ENUM('LETS_ENCRYPT','POSITIVE_SSL','WILDCARD_SSL','EV_SSL') NOT NULL,
  provider ENUM('LETS_ENCRYPT','RESELLERCLUB') NOT NULL,
  rc_order_id VARCHAR(50),
  status ENUM('PENDING','ACTIVE','EXPIRED','REVOKED','FAILED') DEFAULT 'PENDING',
  issued_date DATE,
  expiry_date DATE,
  auto_renew BOOLEAN DEFAULT TRUE,
  csr TEXT,
  certificate TEXT,
  private_key_encrypted TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- EMAIL_ACCOUNTS
CREATE TABLE email_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  domain_id UUID REFERENCES domains(id),
  email_address VARCHAR(255) NOT NULL,
  provider ENUM('CPANEL','TITAN','GOOGLE_WORKSPACE') NOT NULL,
  rc_order_id VARCHAR(50),
  plan_name VARCHAR(100),
  mailbox_count INTEGER DEFAULT 1,
  storage_gb DECIMAL(10,2),
  status ENUM('PENDING','ACTIVE','SUSPENDED','DELETED') DEFAULT 'PENDING',
  expiry_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ORDERS
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  order_number VARCHAR(20) UNIQUE NOT NULL,  -- e.g., HN-2026-00001
  service_type ENUM('DOMAIN','HOSTING','SSL','EMAIL','WORDPRESS','WOOCOMMERCE','VPS','BUNDLE') NOT NULL,
  service_id UUID,                            -- FK to respective service table
  plan_name VARCHAR(100),
  duration_months INTEGER NOT NULL,
  amount_npr DECIMAL(12,2) NOT NULL,
  vat_amount_npr DECIMAL(12,2) NOT NULL,      -- 13% VAT
  total_amount_npr DECIMAL(12,2) NOT NULL,
  discount_amount_npr DECIMAL(12,2) DEFAULT 0,
  promo_code VARCHAR(50),
  status ENUM('PENDING','PAID','PROVISIONING','ACTIVE','CANCELLED','REFUNDED','FAILED') DEFAULT 'PENDING',
  payment_id UUID,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- PAYMENTS
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  user_id UUID REFERENCES users(id),
  gateway ENUM('KHALTI','ESEWA','CONNECTIPS','FONEPAY','BANK_TRANSFER','MANUAL') NOT NULL,
  gateway_transaction_id VARCHAR(255),
  gateway_reference VARCHAR(255),
  amount_npr DECIMAL(12,2) NOT NULL,
  status ENUM('INITIATED','PENDING','COMPLETED','FAILED','REFUNDED') DEFAULT 'INITIATED',
  payment_url VARCHAR(500),
  callback_data JSONB,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- INVOICES
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  order_id UUID REFERENCES orders(id),
  invoice_number VARCHAR(20) UNIQUE NOT NULL,  -- e.g., INV-2026-00001
  subtotal_npr DECIMAL(12,2) NOT NULL,
  vat_rate DECIMAL(5,2) DEFAULT 13.00,
  vat_amount_npr DECIMAL(12,2) NOT NULL,
  total_npr DECIMAL(12,2) NOT NULL,
  status ENUM('DRAFT','SENT','PAID','OVERDUE','CANCELLED') DEFAULT 'DRAFT',
  due_date DATE,
  paid_at TIMESTAMP,
  pdf_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- SUPPORT_TICKETS
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  ticket_number VARCHAR(20) UNIQUE NOT NULL,
  subject VARCHAR(255) NOT NULL,
  category ENUM('BILLING','TECHNICAL','DOMAIN','HOSTING','SSL','EMAIL','GENERAL') NOT NULL,
  priority ENUM('LOW','MEDIUM','HIGH','URGENT') DEFAULT 'MEDIUM',
  status ENUM('OPEN','IN_PROGRESS','WAITING_CUSTOMER','RESOLVED','CLOSED') DEFAULT 'OPEN',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- TICKET_MESSAGES
CREATE TABLE ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id),
  sender_id UUID REFERENCES users(id),
  message TEXT NOT NULL,
  attachments JSONB,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- RESELLERS
CREATE TABLE resellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  company_name VARCHAR(255) NOT NULL,
  brand_logo_url VARCHAR(500),
  brand_colors JSONB,
  custom_domain VARCHAR(255),
  custom_nameservers JSONB,
  rc_reseller_id VARCHAR(50),
  commission_rate DECIMAL(5,2) DEFAULT 10.00,
  wallet_balance_npr DECIMAL(12,2) DEFAULT 0,
  pricing_markup DECIMAL(5,2) DEFAULT 20.00,
  status ENUM('PENDING','ACTIVE','SUSPENDED') DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- BACKUPS
CREATE TABLE backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hosting_id UUID REFERENCES hosting_accounts(id),
  type ENUM('FULL','INCREMENTAL','DATABASE_ONLY','PRE_UPDATE') NOT NULL,
  storage_provider ENUM('LOCAL','BACKBLAZE_B2','S3') DEFAULT 'BACKBLAZE_B2',
  storage_path VARCHAR(500),
  size_mb INTEGER,
  status ENUM('IN_PROGRESS','COMPLETED','FAILED','RESTORING','DELETED') DEFAULT 'IN_PROGRESS',
  retention_until DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- UPTIME_CHECKS
CREATE TABLE uptime_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hosting_id UUID REFERENCES hosting_accounts(id),
  domain VARCHAR(255) NOT NULL,
  check_interval_seconds INTEGER DEFAULT 60,
  status ENUM('UP','DOWN','DEGRADED') DEFAULT 'UP',
  last_check_at TIMESTAMP,
  last_downtime_at TIMESTAMP,
  uptime_percentage DECIMAL(6,3) DEFAULT 100.000,
  response_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ACTIVITY_LOG
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  ip_address VARCHAR(45),
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  type ENUM('EMAIL','SMS','PUSH','IN_APP') NOT NULL,
  category ENUM('BILLING','SECURITY','SERVICE','MARKETING','SYSTEM') NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- PROMO_CODES
CREATE TABLE promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  discount_type ENUM('PERCENTAGE','FIXED') NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL,
  applicable_services JSONB,             -- ["DOMAIN","HOSTING","SSL"]
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  min_order_amount DECIMAL(12,2),
  valid_from DATE,
  valid_until DATE,
  status ENUM('ACTIVE','EXPIRED','DISABLED') DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT NOW()
);

-- INDEXES
CREATE INDEX idx_domains_user_id ON domains(user_id);
CREATE INDEX idx_domains_expiry ON domains(expiry_date);
CREATE INDEX idx_hosting_user_id ON hosting_accounts(user_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_tickets_status ON support_tickets(status);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX idx_activity_user ON activity_log(user_id, created_at);
CREATE INDEX idx_uptime_domain ON uptime_checks(domain);
```

---

# PART 6: SECURITY

---

## 6.1 APPLICATION Security
- JWT + Refresh token rotation (access: 15min, refresh: 7 days)
- bcrypt password hashing (cost factor 12)
- CSRF protection (double-submit cookie pattern)
- Rate limiting (100 req/min general, 5 req/min auth endpoints)
- Input sanitization (class-validator + DOMPurify)
- SQL injection prevention (Prisma parameterized queries)
- XSS prevention (Content-Security-Policy headers)
- API key encryption at rest (AES-256)
- 2FA via TOTP + SMS
- Session management with device tracking
- IP-based anomaly detection

## 6.2 Infrastructure Security
- Cloudflare WAF + DDoS protection
- Imunify360 server-level security
- fail2ban for brute force prevention
- Automated security updates
- VPN access for admin panel
- Database encryption at rest
- TLS 1.3 everywhere
- HSTS headers with preload
- Regular penetration testing

## 6.3 Nepal-Specific Compliance
- Data stored in India DCs (nearest to Nepal with data sovereignty)
- NRB payment regulations compliance
- VAT invoice requirements (IRD format)
- 5-year record retention
- SMS notification on every transaction (NRB mandate)

---

# PART 7: NOTIFICATION SYSTEM

---

| Channel | Provider | Use Cases |
|---------|----------|-----------|
| Email | SendGrid / AWS SES | Invoices, credentials, renewals, marketing |
| SMS | Sparrow SMS (Nepal) | OTP, payment confirmations, urgent alerts |
| Push | Firebase Cloud Messaging | Real-time alerts, status updates |
| In-App | WebSocket (Socket.io) | Dashboard notifications |
| WhatsApp | WhatsApp Business API | Optional premium support |

---

# PART 7B: SELF-SERVICE AUTOMATION ENHANCEMENTS

---

## 7B.1 CUSTOMER SELF-SERVICE DASHBOARD FEATURES

Every feature below must work WITHOUT admin intervention:

### Domain Self-Service
| Action | Automation Level | How |
|--------|-----------------|-----|
| Search domain | Instant | ResellerClub API real-time check |
| Register domain | Auto after payment | API auto-registers + sets nameservers |
| Renew domain | Auto after payment | API auto-renews |
| Transfer domain in | Semi-auto | Customer enters EPP code -> API handles rest |
| Edit DNS records | Instant | API updates within seconds |
| Toggle domain lock | Instant | API call |
| Toggle WHOIS privacy | Instant | API call |
| View WHOIS info | Instant | API fetch |
| Change nameservers | Instant | API call |
| Download EPP/Auth code | Instant | API fetch |

### Hosting Self-Service
| Action | Automation Level | How |
|--------|-----------------|-----|
| Purchase hosting | Auto after payment | CyberPanel/RC API provisions in <60 seconds |
| Upgrade/downgrade plan | Auto after payment | API modifies resources |
| View resource usage | Real-time | Metrics API polled every 15 seconds |
| Restart services | Instant | CyberPanel API |
| Change PHP version | Instant | CyberPanel API (per-site PHP switcher) |
| File manager | Real-time | Web-based file manager embedded in dashboard |
| Database manager | Real-time | phpMyAdmin/Adminer embedded |
| CRON job manager | Instant | CyberPanel API |
| Error logs viewer | Real-time | Tail logs via WebSocket |
| SSH credentials | Instant | Auto-generated, displayed in dashboard |
| FTP credentials | Instant | Auto-generated, displayed in dashboard |

### WordPress Self-Service
| Action | Automation Level | How |
|--------|-----------------|-----|
| Install WordPress | 1-click, 30 seconds | CyberPanel/Softaculous API |
| Create staging | 1-click, 60 seconds | Clone site to subdomain |
| Push staging to live | 1-click | rsync + DB sync |
| Install plugin/theme | From dashboard | WP-CLI API call |
| Update WP/plugins/themes | 1-click or auto | WP-CLI batch update |
| Enable/disable Redis cache | Toggle switch | wp-config.php auto-edit |
| Optimize database | 1-click | WP-CLI db optimize |
| Search & replace URLs | Self-service tool | WP-CLI search-replace |
| View Core Web Vitals | Real-time | Lighthouse API integration |
| Restore from backup | 1-click | Restore engine picks from B2 |
| Clone site | 1-click | Full site duplication |
| Enable maintenance mode | Toggle | wp-config edit via API |

### SSL Self-Service
| Action | Automation Level | How |
|--------|-----------------|-----|
| Free SSL install | Fully auto | Let's Encrypt on hosting purchase |
| Free SSL renewal | Fully auto | CRON 30 days before expiry |
| Buy paid SSL | Auto after payment | ResellerClub API |
| View SSL status | Real-time | Certificate check API |
| Force HTTPS | 1-click toggle | .htaccess/server config edit |

### Email Self-Service
| Action | Automation Level | How |
|--------|-----------------|-----|
| Create email account | Instant | CyberPanel/RC API |
| Delete email account | Instant | API call |
| Change email password | Instant | API call |
| Set up forwarding | Instant | API call |
| View SMTP/IMAP settings | Auto-displayed | Pre-populated based on domain |
| Download email client config | Auto-generated | Auto .mobileconfig / .xml files |
| Webmail access | 1-click link | Roundcube/Titan direct SSO |
| Setup SPF/DKIM/DMARC | 1-click | Auto-adds DNS records |

### Billing Self-Service
| Action | Automation Level | How |
|--------|-----------------|-----|
| View invoices | Instant | Dashboard list |
| Download invoice PDF | Instant | Auto-generated PDF with VAT |
| Pay invoice | Customer clicks link | Khalti/eSewa redirect |
| View payment history | Instant | Dashboard list |
| Apply promo code | Instant | Validated at checkout |
| Enable auto-renewal | Toggle | Sets reminder + payment link flow |
| Request refund | Submit form | Reviewed by admin within 24hr |
| View upcoming renewals | Dashboard widget | Sorted by date |

### Support Self-Service
| Action | Automation Level | How |
|--------|-----------------|-----|
| Knowledge base search | Instant | Full-text search |
| AI chatbot (Phase 2) | Auto-resolve 80% of queries | LLM-based FAQ bot |
| Create support ticket | Instant | Form submission |
| Track ticket status | Real-time | Dashboard view |
| Live chat | Real-time | Tawk.to / Chatwoot (free) |
| Video tutorials | Self-service | YouTube/embedded guides |
| Server status page | Real-time | Public status.hostingnepal.com |

## 7B.2 ZERO-TOUCH PROVISIONING FLOW

The entire purchase-to-active flow requires ZERO admin involvement:

```
CUSTOMER BUYS "WordPress Hosting + Domain + Email" BUNDLE:

[T+0s]    Customer clicks "Buy Now"
[T+5s]    Customer fills billing details
[T+15s]   Customer redirected to Khalti/eSewa
[T+30s]   Customer completes payment
[T+31s]   Payment webhook received -> verified via lookup API
[T+32s]   Order status -> PAID
[T+33s]   Event: BUNDLE_PURCHASED dispatched to RabbitMQ
           |
           +-> Worker 1: DOMAIN_REGISTER
           |   [T+35s] Create ResellerClub customer (if new)
           |   [T+36s] Create contact record
           |   [T+38s] POST /api/domains/register.json
           |   [T+40s] Poll status every 30s
           |   [T+90s] Domain ACTIVE -> store in DB
           |   [T+91s] Set nameservers to our custom NS
           |
           +-> Worker 2: HOSTING_PROVISION (waits for domain)
           |   [T+92s]  CyberPanel API: Create website
           |   [T+95s]  Create database + user
           |   [T+97s]  Set PHP version to 8.3
           |   [T+98s]  Configure OpenLiteSpeed vhost
           |   [T+100s] Store credentials (encrypted)
           |
           +-> Worker 3: WORDPRESS_INSTALL (waits for hosting)
           |   [T+101s] WP-CLI: Download + install WordPress
           |   [T+110s] Configure wp-config.php
           |   [T+112s] Install starter theme + essential plugins
           |   [T+115s] Enable LiteSpeed Cache + Redis
           |   [T+118s] Set security hardening defaults
           |   [T+120s] Create admin user with random password
           |
           +-> Worker 4: SSL_PROVISION (waits for hosting)
           |   [T+121s] Certbot: Issue Let's Encrypt SSL
           |   [T+130s] Configure HTTPS redirect
           |   [T+131s] Add HSTS header
           |
           +-> Worker 5: EMAIL_SETUP (waits for domain)
           |   [T+132s] ResellerClub API: Order Titan email
           |   [T+135s] Add MX + SPF + DKIM DNS records
           |   [T+140s] Create admin@domain.com mailbox
           |
           +-> Worker 6: NOTIFICATION
               [T+141s] Generate welcome email with ALL credentials
               [T+142s] Send email via SendGrid
               [T+143s] Send SMS via Sparrow SMS
               [T+144s] Create in-app notification
               [T+145s] Generate invoice PDF with 13% VAT
               [T+146s] Send invoice email

[T+150s]  TOTAL TIME: ~2.5 minutes from payment to fully active:
          - Domain registered + DNS configured
          - Hosting provisioned + configured
          - WordPress installed + hardened
          - SSL active (HTTPS enforced)
          - Email account created
          - Customer has all credentials
          - Invoice generated and sent

CUSTOMER OPENS DASHBOARD -> EVERYTHING IS LIVE AND WORKING
```

## 7B.3 CUSTOMER ONBOARDING WIZARD

First-time user sees a guided setup wizard:

```
Step 1: "What do you want to build?"
  [ ] Personal Blog
  [ ] Business Website
  [ ] Online Store (WooCommerce)
  [ ] Portfolio
  [ ] Custom Application
  -> Recommends best plan automatically

Step 2: "Choose your domain"
  [Search bar] -> Real-time availability check
  -> AI-powered domain suggestions
  -> Shows .com, .com.np, .np options with prices

Step 3: "Choose your hosting plan"
  -> Pre-selected based on Step 1
  -> Shows recommended plan with comparison table

Step 4: "Add-ons" (optional)
  [ ] Business Email (NPR 149/mo)
  [ ] Premium SSL (NPR 2,500/yr)
  [ ] Daily Backups (included free!)
  [ ] Google Workspace (NPR 699/mo)

Step 5: "Review & Pay"
  -> Order summary with VAT breakdown
  -> Promo code input
  -> Select payment: Khalti | eSewa | ConnectIPS
  -> 1-click pay

Step 6: "Setting up your site..." (progress bar)
  [=====>    ] Registering domain...
  [========> ] Creating hosting...
  [==========] Installing WordPress...
  [==========] Securing with SSL...
  [==========] Setting up email...
  DONE! "Your site is live at https://yourdomain.com"

Step 7: "Quick Start Guide"
  -> Link to WordPress admin
  -> Link to email webmail
  -> Link to DNS manager
  -> Video: "Your first 5 minutes"
```

## 7B.4 SELF-SERVICE API FOR B2B CUSTOMERS

B2B/Business customers get their own REST API:

```
Authorization: Bearer <api_key>

# Domains
GET    /api/v1/domains              # List all domains
POST   /api/v1/domains              # Register new domain
GET    /api/v1/domains/:id          # Get domain details
PUT    /api/v1/domains/:id/dns      # Update DNS records
DELETE /api/v1/domains/:id          # Cancel domain

# Hosting
GET    /api/v1/hosting              # List all hosting accounts
POST   /api/v1/hosting              # Create hosting account
GET    /api/v1/hosting/:id          # Get hosting details
PUT    /api/v1/hosting/:id          # Update hosting (upgrade/downgrade)
POST   /api/v1/hosting/:id/restart  # Restart hosting
DELETE /api/v1/hosting/:id          # Cancel hosting

# WordPress
POST   /api/v1/hosting/:id/wordpress/install    # Install WP
POST   /api/v1/hosting/:id/wordpress/staging     # Create staging
POST   /api/v1/hosting/:id/wordpress/backup      # Create backup
POST   /api/v1/hosting/:id/wordpress/restore     # Restore backup

# SSL
GET    /api/v1/ssl                  # List SSL certificates
POST   /api/v1/ssl                  # Order SSL
GET    /api/v1/ssl/:id              # Get SSL status

# Billing
GET    /api/v1/invoices             # List invoices
GET    /api/v1/invoices/:id/pdf     # Download invoice PDF
GET    /api/v1/payments             # Payment history

# Account
GET    /api/v1/account              # Account details
GET    /api/v1/account/usage        # Resource usage
```

Rate limits: 100 requests/minute per API key

---

# PART 8: MONITORING & OBSERVABILITY

---

```
[Application] -> [Prometheus] -> [Grafana Dashboards]
     |
     +-> [Sentry] (Error tracking)
     |
     +-> [ELK Stack] (Centralized logs)
     |
     +-> [UptimeRobot/Custom] (Site monitoring)
     |
     +-> [PagerDuty/Slack] (Alerting)
```

### Key Metrics to Track
- Server uptime (target: 99.9%)
- API response time (target: <200ms p95)
- ResellerClub API success rate
- Payment conversion rate
- Customer churn rate
- Average revenue per user (ARPU)
- Support ticket response time (target: <1 hour)
- WordPress site TTFB (target: <500ms)

---

# PART 9: DEPLOYMENT & CI/CD

---

## Environments
| Environment | Purpose | URL |
|-------------|---------|-----|
| Development | Local development | localhost:3000 |
| Staging | Pre-production testing | staging.hostingnepal.com |
| Production | Live system | hostingnepal.com |

## CI/CD Pipeline (GitHub Actions)
```yaml
# Trigger: Push to main/develop
1. Lint + Type check (ESLint + TypeScript)
2. Unit tests (Jest)
3. Integration tests (Supertest)
4. Build Docker images
5. Push to Container Registry
6. Deploy to staging (auto)
7. Run E2E tests on staging
8. Deploy to production (manual approval)
9. Health check + rollback on failure
```

---

# PART 10: IMPLEMENTATION ROADMAP

---

## Phase 1: MVP (Months 1-3)
| Week | Deliverable |
|------|-------------|
| 1-2 | Project setup, Auth module, Database schema |
| 3-4 | Domain search + registration (ResellerClub API) |
| 5-6 | Basic hosting provisioning (ResellerClub API) |
| 7-8 | Payment integration (Khalti + eSewa) |
| 9-10 | User dashboard + order management |
| 11-12 | Admin panel + billing + testing |

**MVP Features:**
- User registration/login with 2FA
- Domain search, register, manage
- Shared hosting purchase + provisioning
- Free SSL auto-assignment
- Khalti + eSewa payments
- Invoice generation (13% VAT)
- Basic admin panel
- Email notifications

## Phase 2: Growth (Months 4-6)
- WordPress managed hosting (own infrastructure)
- WooCommerce hosting with Nepal payments pre-configured
- Staging environments
- Automated backups (Backblaze B2)
- Malware scanning (Imunify360)
- Support ticket system
- Knowledge base
- ConnectIPS + FonePay payments
- Nepali language dashboard
- Affiliate/referral program

## Phase 3: Scale (Months 7-9)
- Reseller/white-label module (B2B)
- Cloud VPS hosting (Vultr API)
- Git deployment
- Mobile responsive dashboard
- AI domain suggestions
- AI support chatbot
- SMS notifications (Sparrow SMS)
- Uptime monitoring dashboard
- Multi-currency (NPR + USD)

## Phase 4: Market Leadership (Months 10-12+)
- Mobile app (React Native)
- AI website builder
- Container hosting (Docker/K8s)
- Edge computing / multiple DCs
- Green hosting certification
- Advanced analytics
- Predictive auto-scaling
- API for developers
- PCI-compliant hosting tier

---

# PART 11: COMPANY SETUP REQUIREMENTS (NEPAL)

---

| Requirement | Detail |
|-------------|--------|
| Company Registration | Private Limited at OCR (CAMIS portal) |
| Minimum Capital | NPR 100,000 |
| PAN Registration | Inland Revenue Department |
| VAT Registration | Required if turnover > NPR 2M/year |
| ISP License | NOT required for hosting reseller |
| Bank Account | Business account at Class A bank |
| USD Payments | Prepaid USD card or bank wire (KYC + PAN) |
| Annual USD Limit | USD 2,000 via card, USD 5,000 via bank wire |
| Above USD 5,000 | Requires regulatory approval |
| TDS on Foreign Payments | 15% (increases effective cost by ~17.52%) |

---

# PART 12: REVENUE PROJECTIONS

---

### Pricing Tiers (NPR)

| Product | Monthly | Annual (20% discount) |
|---------|---------|----------------------|
| .com Domain | -- | NPR 1,499/yr |
| Shared Hosting Basic | NPR 199 | NPR 1,899/yr |
| Shared Hosting Pro | NPR 499 | NPR 4,799/yr |
| WordPress Starter | NPR 299 | NPR 2,869/yr |
| WordPress Business | NPR 799 | NPR 7,670/yr |
| WooCommerce | NPR 1,499 | NPR 14,390/yr |
| Cloud VPS | NPR 1,999 | NPR 19,190/yr |
| Business Email (Titan) | NPR 149/mo | NPR 1,430/yr |
| Google Workspace | NPR 699/mo | NPR 6,710/yr |

### Year 1 Target
- 500 customers x NPR 3,000 avg = NPR 1,500,000 revenue
- Cost: ~NPR 600,000 (infrastructure + ResellerClub + gateway fees)
- Gross Profit: ~NPR 900,000 (~60% margin)

### Year 2 Target
- 2,000 customers x NPR 4,000 avg = NPR 8,000,000 revenue
- Including B2B resellers: +NPR 2,000,000
- Total: NPR 10,000,000 (~US$75,000)

---

# END OF ENHANCED SPECIFICATION

---

**Document Version:** 2.0
**Research Date:** March 30, 2026
**Research Sources:** ResellerClub API docs, Nepal NRB regulations, NTA regulations, Khalti/eSewa/ConnectIPS developer docs, Statista, DataReportal, competitor analysis of 25+ Nepal hosting companies, global hosting feature analysis of Hostinger/SiteGround/Cloudways/WP Engine/Kinsta/GoDaddy/Namecheap/A2 Hosting

**Key Research Files:**
- `/Users/sandeep/Documents/Hosting_Nepal/Nepal_Hosting_Market_Competitive_Analysis.md`
- `/Users/sandeep/Documents/Hosting_Nepal/WORDPRESS_HOSTING_RESEARCH.md`
- `/Users/sandeep/Documents/Hosting_Nepal/HOSTING_FEATURES_RESEARCH.md`
