# HOSTING NEPAL - FINAL PRODUCTION SPECIFICATION v4.0
## Your Spec + Research Intelligence Merged
## Build: Contabo + SiteGround + GoDaddy + DigitalOcean for Nepal

---

# PART 1: OBJECTIVE & MARKET CONTEXT

## 1.1 Objective

Build a fully automated, scalable hosting platform (B2B + B2C) providing:

* Domain registration (via ResellerClub API — 500+ TLDs)
* Shared Hosting (CloudLinux + OpenLiteSpeed)
* WordPress Hosting (SiteGround Site Tools-like)
* WooCommerce Hosting (Nepal payments pre-configured)
* VPS Hosting (Proxmox KVM — Contabo-like)
* VDS Hosting (Dedicated CPU cores — premium VPS)
* Dedicated Servers (IPMI + PXE automation)
* SSL Certificates (Let's Encrypt auto + paid via ResellerClub)
* Business Email (Titan + Google Workspace via ResellerClub API)
* Reseller System (white-label B2B)
* Custom Billing (Nepal payments + global)

## 1.2 Market Intelligence (Research-Backed)

| Metric | Value | Source |
|--------|-------|--------|
| Nepal hosting market | US$34.7M (2025) -> $73M (2029) | Statista |
| CAGR | 19.79% | Statista |
| Internet users | 16.6M (56% penetration) | DataReportal |
| Mobile connections | 32.4M (109% of population) | DataReportal |
| .np domains registered | 150,000-200,000+ | NPNIC |
| Competitors analyzed | 25+ companies | Our research |

## 1.3 Top 10 Competitive Advantages (No Nepal Competitor Has These)

1. Public uptime status page with financial SLA
2. Transparent renewal pricing (no hidden fees)
3. Nepali language dashboard (first in market)
4. Git deploy / CI/CD / staging environments
5. WooCommerce + Nepal payment pre-configured bundles
6. VPS with noVNC browser console
7. Automated provisioning in 45-90 seconds
8. Pay-as-you-go billing for VPS
9. AI-powered domain suggestions
10. Full REST API for B2B customers

## 1.4 System Targets

| Target | Value |
|--------|-------|
| Users supported | 100K+ |
| VPS provisioning | 45-90 seconds (Linux), 3-5 min (Windows) |
| WordPress provisioning | 60-120 seconds |
| Dedicated server provisioning | 20-60 minutes |
| Uptime SLA | 99.9% with financial guarantee |
| API response time | <200ms p95 |

---

# PART 2: SYSTEM ARCHITECTURE

## 2.1 Architecture: Microservices + Event-Driven + Saga Pattern

```
[Customer Browser / Mobile]
         |
[Cloudflare CDN + WAF + DDoS + HTTP/3]
         |
[Nginx API Gateway + Rate Limiter + Load Balancer]
         |
    +----+----+
    |         |
[Next.js   [NestJS API Layer (Microservices)]
 Frontend]    |
    |         +---> Auth Service
    |         +---> Domain Service ---------> [ResellerClub API]
    |         +---> VPS Service ------------> [Proxmox API]
    |         +---> Hosting Service --------> [CyberPanel API]
    |         +---> WordPress Service ------> [WP-CLI + Server Agent]
    |         +---> SSL Service ------------> [acme.sh + PowerDNS]
    |         +---> Email Service ----------> [ResellerClub Titan/GW API]
    |         +---> Billing Service --------> [Khalti/eSewa/ConnectIPS API]
    |         +---> Reseller Service
    |         +---> Notification Service ---> [SendGrid + Sparrow SMS]
    |         +---> Admin Service
    |         +---> Analytics Service
    |         |
    |    [Saga Orchestrator] <---> [NATS JetStream / RabbitMQ]
    |         |
    |    [BullMQ Workers] (CRON + Background Jobs)
    |         |
    |    +----+----+
    |    |         |
    |  [PostgreSQL] [Redis]
    |  (Primary DB)  (Cache + Sessions + Rate Limiting + Pub/Sub)
    |
[WebSocket Server]
    +---> noVNC (VPS Console)
    +---> Provisioning Progress (real-time)
    +---> Resource Metrics (CPU/RAM/IO)
    +---> Notifications (alerts)
```

## 2.2 Tech Stack (Research-Validated)

### Frontend
| Technology | Purpose | Why Chosen |
|------------|---------|------------|
| Next.js 14+ (App Router) | SSR + Static + API routes | Best React framework for SSR |
| TypeScript | Type safety | Industry standard |
| Tailwind CSS + shadcn/ui | Design system | Fast development, consistent UI |
| Zustand | State management | Simpler than Redux, sufficient |
| TanStack Query (React Query) | API data fetching + caching | Best data fetching library |
| next-intl | i18n (Nepali + English) | First Nepali hosting dashboard |
| Recharts | Dashboard charts | Lightweight, React-native |
| noVNC (JS library) | VPS browser console | Industry standard for VNC in browser |

### Backend
| Technology | Purpose | Why Chosen |
|------------|---------|------------|
| NestJS | Microservices framework | TypeScript, modular, enterprise-grade |
| TypeScript | Type safety | End-to-end type safety with frontend |
| Prisma ORM | Database access | Type-safe queries, migrations |
| Passport.js | Auth strategies | JWT + OAuth strategies |
| class-validator | Request validation | Decorator-based validation |
| @nestjs/bull | Job queue | BullMQ integration |
| @nestjs/websockets | Real-time | WebSocket for console + notifications |
| @nestjs/microservices | Inter-service communication | NATS transport |

### Database
| Technology | Purpose | Why Chosen |
|------------|---------|------------|
| PostgreSQL 16 | Primary DB | Reliable, JSONB support, extensions |
| Redis 7 | Cache, sessions, rate limiting, pub/sub | Fast, versatile |
| TimescaleDB (PG extension) | Time-series metrics | Uptime, bandwidth, usage data |

### Queue & Messaging
| Technology | Purpose | Why Chosen |
|------------|---------|------------|
| NATS JetStream | Event bus (saga orchestration) | Lower latency than RabbitMQ, simpler ops |
| RabbitMQ | Task queue (fallback) | Battle-tested, complex routing |
| BullMQ | Job scheduling (CRON, retries) | Redis-based, built for Node.js |

### Infrastructure (Hosting Servers)
| Technology | Purpose | Why Chosen |
|------------|---------|------------|
| Proxmox VE 8/9 | VPS/VDS hypervisor (KVM) | Free, best API, largest ecosystem |
| CloudLinux OS | Shared hosting isolation | LVE, CageFS, PHP selector |
| OpenLiteSpeed | Web server for shared/WP hosting | Free, 5x faster HTTP/2 than Nginx |
| CyberPanel | Server management (free) | OpenLiteSpeed native, API |
| Docker | Application containerization | Standard |
| Nginx | API gateway / reverse proxy | Industry standard |
| Cloudflare | CDN + DNS + WAF + DDoS | Essential for production |

### VPS Customer Panel
| Technology | Purpose | Why Chosen |
|------------|---------|------------|
| VirtFusion ($15/node) | Premium VPS customer panel | Best UI, by original SolusVM creator |
| OR Virtualizor ($7/node) | Budget VPS panel | Cheapest, multi-hypervisor support |
| OR Custom (Next.js) | Full control | Phase 2+ |

### DNS & SSL
| Technology | Purpose | Why Chosen |
|------------|---------|------------|
| PowerDNS | Authoritative DNS server | REST API, millions of domains, free |
| acme.sh | Let's Encrypt automation | 150+ DNS APIs, 1MB, no root needed |

### IPAM & Inventory
| Technology | Purpose | Why Chosen |
|------------|---------|------------|
| NetBox | DCIM + IP management | Free, REST API, by DigitalOcean |

### Monitoring & Security
| Technology | Purpose | Why Chosen |
|------------|---------|------------|
| Prometheus + Grafana | Infrastructure monitoring | Industry standard |
| Uptime Kuma | Status page + HTTP checks | Free, beautiful UI |
| Sentry | Application error tracking | Best error tracking |
| ELK Stack | Centralized logging | Standard |
| Imunify360 | WordPress WAF + malware | 24hr CVE patching |
| Wazuh | IDS/SIEM | Free OSSEC alternative |

### CI/CD & Deployment
| Technology | Purpose |
|------------|---------|
| GitHub Actions | CI/CD pipeline |
| Docker + Docker Compose | Containerization |
| Kubernetes (Phase 3) | Orchestration at scale |

---

# PART 3: CORE MODULES (COMPLETE)

---

## MODULE 1: AUTH

### Features
- User Registration (email + phone verification)
- Login (email/password + social OAuth)
- JWT Access token (15min) + Refresh token (7 days, httpOnly cookie)
- 2FA via TOTP (Google Authenticator) + SMS OTP (Sparrow SMS)
- Role-based access control (RBAC)
- Session management (multi-device tracking)
- Password reset with rate limiting
- Account lockout after 5 failed attempts
- IP-based login anomaly alerts

### Roles & Permissions
| Role | Permissions |
|------|------------|
| CUSTOMER (B2C) | Manage own services, billing, support |
| BUSINESS (B2B) | Customer + team management + API access |
| RESELLER | Business + white-label + sub-customer mgmt + pricing |
| SUPPORT_AGENT | View customers, manage tickets, limited actions |
| ADMIN | Full access except billing config |
| SUPER_ADMIN | Everything |

### Auth Flow
```
1. User submits email + password
2. bcrypt hash comparison (cost factor 12)
3. If 2FA enabled -> TOTP/SMS challenge
4. Issue JWT access token (15min) + refresh token (7 days)
5. Refresh token in httpOnly secure cookie
6. Access token in memory (NOT localStorage)
7. On expiry -> silent refresh via refresh token
8. On refresh expiry -> force re-login
```

### API Endpoints
```
POST   /api/v1/auth/register       # Register new user
POST   /api/v1/auth/login          # Login
POST   /api/v1/auth/refresh        # Refresh token
POST   /api/v1/auth/logout         # Logout (invalidate refresh)
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
POST   /api/v1/auth/verify-email
POST   /api/v1/auth/verify-phone
POST   /api/v1/auth/2fa/enable
POST   /api/v1/auth/2fa/verify
GET    /api/v1/auth/me             # Current user profile
PUT    /api/v1/auth/me             # Update profile
GET    /api/v1/auth/sessions       # List active sessions
DELETE /api/v1/auth/sessions/:id   # Revoke session
```

---

## MODULE 2: BILLING (CUSTOM — NO WHMCS FOR THIS LAYER)

### Features
- Order creation (domain, hosting, VPS, SSL, email — single or bundle)
- Subscription system (monthly/annual/custom)
- Invoice generation (PDF with Nepal 13% VAT)
- Payment gateway integration (Nepal + global)
- Wallet/credit system
- Promo codes & discounts
- Dunning management (failed payment retry)
- Upgrade/downgrade proration
- Refund processing
- Multi-currency (NPR + USD)

### Payment Gateways (Research-Backed)

| Gateway | Type | Fee | Integration |
|---------|------|-----|-------------|
| **Khalti** (primary) | Nepal wallet + bank | Contact merchant | REST API, sandbox OTP: 987654 |
| **eSewa** (secondary) | Nepal wallet | Contact merchant | ePay v2, HMAC auth |
| **ConnectIPS** (bank) | Bank transfer | NPR 2-8 flat | PFX certificate auth |
| **FonePay** (QR) | QR payment | Free | HMAC-SHA512 |
| **Stripe** (global) | Card | 2.9% + 30c | Cannot operate directly in Nepal* |
| **PayPal** (global) | Online | 2.9% + 30c | Send-only from Nepal* |

*Stripe/PayPal require foreign company entity (UK/US). Use for international customers only.

**Aggregator Option:** API Nepal (apinepal.com) — single API for eSewa + Khalti + IME Pay + FonePay.

### CRITICAL: No Auto-Debit in Nepal

No Nepal gateway supports recurring auto-charge. Solution:

```
Renewal Flow:
1. CRON: 7 days before expiry -> generate invoice
2. Send email + SMS with payment link
3. Customer clicks link -> redirected to Khalti/eSewa
4. Customer pays
5. Webhook confirms payment
6. Service renewed automatically
7. If no payment by expiry -> suspend
8. Grace period: 7 days
9. After grace: terminate (with data backup)

Reminders: Day -7, Day -3, Day -1, Day 0 (due), Day +3, Day +5, Day +7 (suspend)
```

### Nepal Tax Compliance (Research-Backed)

| Requirement | Detail |
|-------------|--------|
| VAT Rate | 13% on all SaaS services |
| VAT Registration | Required if turnover > NPR 2,000,000/year |
| Filing | Monthly, due within 25 days |
| Record Retention | 5 years |
| TDS on USD (ResellerClub) | 15% — increases effective cost by ~17.52% |
| Invoice Format | Must include VAT number, breakdown |

### Dunning Workflow (Research-Backed)

```
Day -7:  Pre-dunning reminder (email)
Day 0:   Invoice due -> send payment link (email + SMS)
Day +3:  Reminder #1 (email + SMS)
Day +5:  Reminder #2 (urgent tone)
Day +7:  Service SUSPENDED (site shows maintenance page)
Day +14: Final warning
Day +21: Service TERMINATED (data backed up for 30 days)
```

### Billing API Endpoints
```
POST   /api/v1/orders              # Create order (single or bundle)
GET    /api/v1/orders              # List orders
GET    /api/v1/orders/:id          # Order details
POST   /api/v1/orders/:id/pay      # Initiate payment
POST   /api/v1/payments/webhook/khalti    # Khalti callback
POST   /api/v1/payments/webhook/esewa     # eSewa callback
POST   /api/v1/payments/webhook/connectips # ConnectIPS callback
GET    /api/v1/invoices            # List invoices
GET    /api/v1/invoices/:id        # Invoice details
GET    /api/v1/invoices/:id/pdf    # Download PDF
GET    /api/v1/billing/balance     # Wallet balance
POST   /api/v1/billing/topup       # Add funds
GET    /api/v1/billing/transactions # Transaction history
POST   /api/v1/promo/validate      # Validate promo code
POST   /api/v1/orders/:id/upgrade  # Upgrade plan
POST   /api/v1/orders/:id/refund   # Request refund
```

### Billing Flow
```
User selects product(s)
  -> Create Order (status: PENDING)
  -> Calculate total (subtotal + 13% VAT - discount)
  -> Generate Invoice
  -> User selects payment gateway (Khalti/eSewa/ConnectIPS)
  -> Redirect to gateway
  -> User pays
  -> Gateway webhook -> verify via lookup API
  -> Order status -> PAID
  -> Invoice status -> PAID
  -> Emit: OrderPaidEvent
  -> Saga Orchestrator picks up -> provisions services
```

---

## MODULE 3: DOMAIN (ResellerClub API)

### ResellerClub API Details (Research-Backed)

| Parameter | Value |
|-----------|-------|
| Production URL | `https://httpapi.com/api/` |
| Sandbox URL | `https://test.httpapi.com/api/` |
| Domain Check URL | `https://domaincheck.httpapi.com/api/` |
| Auth | `auth-userid` + `api-key` on every request |
| Response | `.json` or `.xml` suffix |
| IP Whitelist | Max 3 IPs (contact support for more) |
| Rate Limits | Undisclosed — 24hr IP block if exceeded |
| Webhooks | NONE — must poll for status changes |

### API Endpoints (Complete)

| Action | Endpoint | Method |
|--------|----------|--------|
| Check availability | `/api/domains/available.json` | GET |
| Suggest domains | `/api/domains/suggest-names.json` | GET |
| Register | `/api/domains/register.json` | POST |
| Renew | `/api/domains/renew.json` | POST |
| Transfer | `/api/domains/transfer.json` | POST |
| Get details | `/api/domains/details.json` | GET |
| Modify nameservers | `/api/domains/modify-ns.json` | POST |
| Enable lock | `/api/domains/enable-theft-protection.json` | POST |
| Privacy protection | `/api/domains/modify-privacy-protection.json` | POST |
| Search orders | `/api/domains/search.json` | GET |
| Get pricing | `/api/products/reseller-cost-price.json` | GET |

### DNS Management (via PowerDNS — NOT ResellerClub)
Use self-hosted PowerDNS for full control:

```
POST PowerDNS API: /api/v1/servers/localhost/zones
  -> Auto-create zone on domain purchase
  -> Auto-add A, AAAA, MX, SPF, DKIM, DMARC records
  -> Sub-second replication via Lightning Stream
```

### Domain Search UX (Research-Backed: 3-Tier Speed)

```
Tier 1: Zone file cache (instant) — pre-downloaded daily for .com/.net
Tier 2: DNS probe (50ms) — quick NXDOMAIN check
Tier 3: Registrar API (500ms-2s) — authoritative via ResellerClub
```

### API Gotchas (Research-Backed)
- NO webhooks — must implement polling system
- Test URL with live credentials = LIVE operations (DANGER!)
- Only a-z, 0-9 in customer data (no accented chars)
- Phone country code in separate `phone-cc` field
- URL-encode all values
- Max 3 whitelisted IPs by default

### Domain API Endpoints (Your Platform)
```
GET    /api/v1/domains/search?q=example&tlds=com,net,org
POST   /api/v1/domains/register
POST   /api/v1/domains/:id/renew
POST   /api/v1/domains/:id/transfer
GET    /api/v1/domains/:id
GET    /api/v1/domains/:id/dns
POST   /api/v1/domains/:id/dns
PUT    /api/v1/domains/:id/dns/:recordId
DELETE /api/v1/domains/:id/dns/:recordId
PUT    /api/v1/domains/:id/nameservers
PUT    /api/v1/domains/:id/privacy
PUT    /api/v1/domains/:id/lock
GET    /api/v1/domains/:id/whois
```

---

## MODULE 4: VPS HOSTING (Proxmox)

### Infrastructure (Research-Backed)

| Component | Spec |
|-----------|------|
| Hypervisor | Proxmox VE 8/9 (KVM) |
| Min cluster | 3 nodes (for Ceph HA) |
| CPU/node | AMD EPYC 7443P (24C/48T) |
| RAM/node | 256GB DDR4 ECC |
| Storage | 4x 2TB NVMe (Ceph distributed) |
| Network | 2x 25GbE (Ceph) + 2x 10GbE (public) |
| Customer panel | VirtFusion ($15/node) or Virtualizor ($7/node) |

### VPS Plans

| Plan | vCPU | RAM | NVMe | BW | Price/mo |
|------|------|-----|------|-----|---------|
| VPS-S | 1 | 1GB | 25GB | 1TB | NPR 499 ($3.75) |
| VPS-M | 2 | 4GB | 50GB | 2TB | NPR 999 ($7.50) |
| VPS-L | 4 | 8GB | 100GB | 4TB | NPR 1,999 ($15) |
| VPS-XL | 8 | 16GB | 200GB | 8TB | NPR 3,999 ($30) |
| VDS-S | 2 (dedicated) | 4GB | 50GB | 2TB | NPR 1,999 ($15) |
| VDS-M | 4 (dedicated) | 8GB | 100GB | 4TB | NPR 3,999 ($30) |
| VDS-L | 8 (dedicated) | 16GB | 200GB | 8TB | NPR 7,999 ($60) |

### Provisioning Flow (Research-Backed: 45-90 seconds)

```
[T+0s]    OrderPaidEvent received
[T+1s]    STEP 1: Validate payment ✓
[T+2s]    STEP 2: Select best node (resource scoring algorithm)
[T+3s]    STEP 3: Allocate IP from pool (PostgreSQL FOR UPDATE SKIP LOCKED)
[T+5s]    STEP 4: Create VM (Proxmox API: POST /nodes/{node}/qemu)
[T+7s]    STEP 5: Cloud-init config (hostname, IP, SSH key, password)
[T+9s]    STEP 6: Start VM (POST /nodes/{node}/qemu/{vmid}/status/start)
[T+50s]   STEP 7: Wait for cloud-init (QEMU guest agent ping)
[T+52s]   STEP 8: PTR record (PowerDNS API)
[T+54s]   STEP 9: Firewall rules (SSH:22, HTTP:80, HTTPS:443)
[T+56s]   STEP 10: Add to Prometheus monitoring
[T+57s]   STEP 11: VNC console enabled (built-in Proxmox)
[T+60s]   STEP 12: Send credentials (email + SMS)
[T+60s]   DONE — VPS LIVE
```

Each step has COMPENSATION (rollback):
| Step | Forward | Compensation |
|------|---------|-------------|
| IP allocation | Reserve IP | Release IP |
| VM creation | Proxmox create | Proxmox delete |
| DNS record | PowerDNS add | PowerDNS delete |
| Monitoring | Add target | Remove target |

### VPS Customer Features
- Power: Start / Stop / Restart / Force Reset
- Console: noVNC browser-based (no Java)
- OS Reinstall: Select template -> 2 minutes
- Snapshots: Create / restore / delete
- Backups: Daily automated + on-demand
- Firewall: Add/remove port rules from dashboard
- Resource Graphs: CPU, RAM, Disk I/O, Network (real-time via WebSocket)
- Reverse DNS: Set PTR record
- ISO Mount: Upload custom ISO
- Rescue Mode: Boot into rescue OS
- SSH Keys: Manage from dashboard

### VPS API Endpoints
```
POST   /api/v1/vps                          # Create VPS
GET    /api/v1/vps                          # List VPS
GET    /api/v1/vps/:id                      # Details
DELETE /api/v1/vps/:id                      # Delete
POST   /api/v1/vps/:id/actions/start
POST   /api/v1/vps/:id/actions/stop
POST   /api/v1/vps/:id/actions/restart
POST   /api/v1/vps/:id/actions/reinstall
POST   /api/v1/vps/:id/actions/resize
GET    /api/v1/vps/:id/console              # noVNC URL + token
GET    /api/v1/vps/:id/metrics?period=24h
GET    /api/v1/vps/:id/bandwidth
POST   /api/v1/vps/:id/snapshots
GET    /api/v1/vps/:id/snapshots
POST   /api/v1/vps/:id/snapshots/:snap/restore
GET    /api/v1/vps/:id/firewall
POST   /api/v1/vps/:id/firewall
DELETE /api/v1/vps/:id/firewall/:ruleId
GET    /api/v1/vps/:id/backups
POST   /api/v1/vps/:id/backups
POST   /api/v1/vps/:id/backups/:id/restore
```

---

## MODULE 5: SHARED HOSTING

### Stack (Research-Backed)
```
[CloudLinux OS] -> User isolation (LVE: per-user CPU/RAM/IO limits)
[OpenLiteSpeed] -> Web server (5x faster HTTP/2 than Nginx, free)
[CyberPanel]    -> Server management (API for automation)
[MariaDB 10.11] -> Database
[Redis]         -> Object caching
[Imunify360]    -> Security (WAF, malware scanner)
[acme.sh]       -> SSL automation
```

### Shared Hosting Plans

| Plan | Sites | NVMe | RAM | BW | Email | Price/mo |
|------|-------|------|-----|-----|-------|---------|
| Starter | 1 | 5GB | 512MB | 50GB | 2 | NPR 199 |
| Business | 5 | 20GB | 1GB | 200GB | 10 | NPR 499 |
| Pro | 25 | 50GB | 2GB | Unlimited | 50 | NPR 999 |
| Enterprise | Unlimited | 100GB | 4GB | Unlimited | Unlimited | NPR 1,999 |

### SiteGround-like "Site Tools" Dashboard (Research-Backed)

Architecture: **React frontend + Central API + Server Agent (Go via gRPC over mTLS)**

| Tool | Technology |
|------|-----------|
| File Manager | FileBrowser (Go, open-source) |
| FTP Accounts | Pure-FTPd / SFTP |
| MySQL Manager | phpMyAdmin / Custom |
| Backups | rsync + rclone to Backblaze B2 |
| SSL Manager | acme.sh + PowerDNS |
| HTTPS Enforce | OLS config API |
| Blocked Traffic | nftables + fail2ban |
| Site Scanner | ClamAV + Imunify360 |
| Caching | OLS Cache + Redis + Memcached |
| CDN | Cloudflare API |
| WordPress Install | WP-CLI |
| Staging | rsync + mysqldump + search-replace |
| Migration | WP-CLI + rsync + SSH |
| Auto-updates | WP-CLI + pre-update snapshots |

---

## MODULE 6: WORDPRESS HOSTING

### Performance Stack (Research-Backed)
```
Layer 1: Cloudflare Edge (HTTP/3, Brotli, DDoS)
Layer 2: OpenLiteSpeed + LiteSpeed Cache plugin
Layer 3: OPcache (PHP bytecode cache)
Layer 4: Redis object cache
Layer 5: MariaDB + query cache
```

### WordPress Plans

| Plan | Sites | NVMe | RAM | Features | Price/mo |
|------|-------|------|-----|----------|---------|
| WP Starter | 1 | 5GB | 512MB | Basic | NPR 299 |
| WP Business | 3 | 20GB | 1GB | Staging, Redis | NPR 799 |
| WP Pro | 10 | 50GB | 2GB | All + priority support | NPR 1,999 |
| WP Enterprise | 25 | 100GB | 4GB | All + dedicated resources | NPR 4,999 |
| WooCommerce | 1 store | 30GB | 2GB | Nepal payments pre-config | NPR 1,499 |

### WordPress Auto-Hardening (Applied on Install)
1. Disable PHP execution in `/wp-content/uploads/`
2. Custom `wp_` table prefix
3. Disable XML-RPC
4. Remove WP version meta tag
5. `DISALLOW_FILE_EDIT` in wp-config.php
6. Force HTTPS + HSTS headers
7. Secure file permissions (644/755)
8. Hide wp-config.php from web
9. Disable directory listing
10. Security headers (CSP, X-Frame-Options)

### Provisioning Flow (60-120 seconds)
```
[T+0s]    Payment confirmed
[T+3s]    Select least-loaded hosting server
[T+5s]    Create Linux user + CloudLinux LVE limits
[T+8s]    Create directory structure
[T+10s]   Create MySQL database + user
[T+15s]   Configure OpenLiteSpeed vhost
[T+25s]   Issue SSL (acme.sh + PowerDNS DNS-01)
[T+30s]   Configure DNS A record (PowerDNS API)
[T+40s]   Install WordPress (WP-CLI)
[T+50s]   Configure wp-config.php (DB, salts, cache, security)
[T+55s]   Install starter theme + essential plugins
[T+60s]   Enable LiteSpeed Cache + Redis
[T+65s]   Apply 10-point security hardening
[T+70s]   Create SFTP account
[T+75s]   Setup daily backup CRON
[T+80s]   Add to uptime monitoring
[T+85s]   Send credentials (email + SMS)
[T+90s]   DONE
```

---

## MODULE 7: SSL

### Strategy
| Type | Source | Automation |
|------|--------|-----------|
| Free DV | Let's Encrypt (acme.sh) | Auto-issue + CRON renewal |
| Paid DV | ResellerClub (Sectigo PositiveSSL) | API order |
| Wildcard | acme.sh DNS-01 + PowerDNS | Auto with DNS challenge |
| EV | ResellerClub | API + manual verification |

### ResellerClub SSL API
```
POST /api/sslcert/add.json       # Order
POST /api/sslcert/enroll.json    # Activate
POST /api/sslcert/renew.json     # Renew
POST /api/sslcert/reissue.json   # Reissue
GET  /api/sslcert/details.json   # Details
```

### Let's Encrypt Rate Limits (Research-Backed)
| Limit | Value | Strategy |
|-------|-------|----------|
| Certs/domain/week | 50 | Bundle SANs (100 domains/cert) |
| New orders/3 hours | 300 | Queue issuance |
| Renewals | Unlimited | CRON 30 days before |
| Elevated limits | Available | Contact Let's Encrypt |

---

## MODULE 8: EMAIL

### Strategy
| Tier | Provider | API |
|------|----------|-----|
| Free | CyberPanel built-in | Local |
| Business | Titan Email | ResellerClub `/api/eelite/` |
| Enterprise | Google Workspace | ResellerClub `/api/gapps/` |

### Auto-DNS for Email (PowerDNS API)
```
MX     @ -> mail.domain.com (priority 10)
TXT    @ -> "v=spf1 mx include:titan.email ~all"
TXT    _dkim._domainkey -> DKIM public key
TXT    _dmarc -> "v=DMARC1; p=quarantine"
```

---

## MODULE 9: RESELLER / B2B

### Features
- White-label dashboard (custom logo, colors, domain)
- Custom pricing per reseller
- Sub-customer management
- Reseller wallet (prepaid model)
- Commission tracking
- REST API access for resellers
- Multi-tier hierarchy
- Branded nameservers (ns1.reseller.com)
- Branded email communications

### Reseller API (for their automation)
```
Base: https://api.hostingnepal.com/v1
Auth: Bearer <api_key>
Rate: 100 requests/minute

Full CRUD for: domains, hosting, VPS, SSL, email, billing
```

---

## MODULE 10: ADMIN PANEL

### Dashboard Sections
- **Overview**: Revenue, signups, active services, tickets (today/week/month)
- **Users**: CRUD, roles, suspension, impersonation
- **Orders**: All orders, status, manual provisioning
- **Revenue**: Daily/monthly, ARPU, churn, LTV, MRR
- **Services**: Enable/disable products, pricing management
- **API Logs**: ResellerClub + Proxmox API call logs, errors
- **Fraud Detection**: Suspicious signups, payment fraud, abuse
- **Servers**: Uptime, resource usage, alerts per node
- **Support**: Ticket queue, SLA tracking, CSAT
- **Content**: Knowledge base, blog, announcements
- **System**: CRON status, queue health, DNS status

---

# PART 4: ORCHESTRATION ENGINE (CRITICAL)

## 4.1 Saga Pattern (Event-Driven)

```
OrderPaidEvent
  -> Saga Orchestrator creates saga (PostgreSQL state machine)
  -> Step 1: DOMAIN_REGISTER (ResellerClub API)
     -> on success: emit DomainCreatedEvent
     -> on failure: compensation -> refund
  -> Step 2: HOSTING_CREATE (Proxmox/CyberPanel API)
     -> on success: emit HostingCreatedEvent
     -> on failure: compensation -> delete domain
  -> Step 3: SSL_ASSIGN (acme.sh)
     -> on success: emit SSLIssuedEvent
     -> on failure: compensation -> (cert expires naturally)
  -> Step 4: EMAIL_CREATE (ResellerClub Titan API)
     -> on success: emit EmailCreatedEvent
     -> on failure: compensation -> continue (email optional)
  -> Step 5: NOTIFY_USER (SendGrid + Sparrow SMS)
     -> Send all credentials
  -> Saga COMPLETED
```

## 4.2 Saga State Table
```sql
CREATE TABLE sagas (
    saga_id       UUID PRIMARY KEY,
    saga_type     VARCHAR(50),    -- 'vps_provision', 'wp_provision', 'bundle'
    order_id      UUID NOT NULL,
    customer_id   UUID NOT NULL,
    current_step  INTEGER DEFAULT 0,
    status        VARCHAR(20) DEFAULT 'pending', -- pending/running/completed/compensating/failed
    context       JSONB NOT NULL,  -- carries state between steps
    steps         JSONB NOT NULL,  -- step list with status
    error_message TEXT,
    retry_count   INTEGER DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    completed_at  TIMESTAMPTZ
);
```

## 4.3 Events
```typescript
// Events emitted through NATS JetStream
OrderPaidEvent        { orderId, customerId, products[], totalAmount }
DomainCreatedEvent    { orderId, domainName, rcOrderId, expiryDate }
VPSCreatedEvent       { orderId, vmid, ip, credentials }
HostingCreatedEvent   { orderId, username, ip, credentials }
SSLIssuedEvent        { orderId, domain, expiryDate, certPath }
EmailCreatedEvent     { orderId, email, provider }
ProvisioningComplete  { orderId, allCredentials }
ProvisioningFailed    { orderId, failedStep, error, compensationStatus }
```

## 4.4 Idempotency
Every operation uses `saga_id + step_name` as idempotency key. Workers check-before-act.

## 4.5 Circuit Breakers
On every external API (Proxmox, ResellerClub, PowerDNS, payment gateways):
- Failure threshold: 5 consecutive failures -> OPEN
- Reset timeout: 60 seconds -> HALF_OPEN -> test one call
- Alert ops team when circuit opens

---

# PART 5: DATABASE SCHEMA (COMPLETE — 20 TABLES)

```sql
-- See ENHANCED_PROJECT_SPECIFICATION.md for full schema
-- Tables: users, domains, hosting_accounts, wordpress_sites,
-- ssl_certificates, email_accounts, orders, payments, invoices,
-- support_tickets, ticket_messages, resellers, backups,
-- uptime_checks, activity_log, notifications, promo_codes,
-- sagas, saga_events, ip_pool
```

---

# PART 6: QUEUE SYSTEM

### BullMQ Jobs
| Job | Queue | Retry | Timeout |
|-----|-------|-------|---------|
| create-vps | vps-provisioning | 3x (exponential backoff) | 5 min |
| register-domain | domain-provisioning | 3x | 2 min |
| issue-ssl | ssl-provisioning | 3x | 2 min |
| create-email | email-provisioning | 3x | 2 min |
| send-notification | notifications | 2x | 30s |
| generate-invoice | billing | 2x | 1 min |
| check-domain-expiry | cron-daily | 1x | 5 min |
| ssl-renewal | cron-daily | 3x | 5 min |
| backup-site | cron-nightly | 2x | 30 min |
| sync-resellerclub | cron-30min | 1x | 5 min |

### CRON Schedule
| Job | Frequency | Time |
|-----|-----------|------|
| Domain expiry check | Daily | 6:00 AM NPT |
| SSL renewal | Daily | 2:00 AM NPT |
| Payment retry | Every 6 hours | -- |
| WordPress updates | Weekly | Tuesday 3:00 AM |
| Malware scan | Daily | 5:00 AM |
| Usage metrics | Every 15 min | -- |
| Invoice generation | Monthly 1st | 1:00 AM |
| RC order sync (polling) | Every 30 min | -- |
| Backup | Daily | 3:00 AM |
| DB optimization | Weekly Sunday | 2:00 AM |
| Uptime check | Every 60 seconds | -- |

---

# PART 7: SECURITY

### Application Security
- JWT + refresh token rotation
- bcrypt (cost 12)
- CSRF (double-submit cookie)
- Rate limiting: 100 req/min general, 5 req/min auth
- Input sanitization (class-validator + DOMPurify)
- SQL injection prevention (Prisma parameterized)
- XSS prevention (CSP headers)
- API key encryption at rest (AES-256)
- 2FA (TOTP + SMS)

### Infrastructure Security
- Cloudflare WAF + DDoS
- Imunify360 (WordPress WAF, 24hr CVE patching)
- CloudLinux CageFS (filesystem isolation)
- nftables + fail2ban
- Wazuh (IDS/SIEM)
- Proxmox IP whitelist
- VPN for admin access
- TLS 1.3 everywhere

---

# PART 8: MONITORING

```
[App] -> [Prometheus] -> [Grafana Dashboards]
  |
  +-> [Sentry] (errors)
  +-> [ELK Stack] (logs)
  +-> [Uptime Kuma] (site monitoring + status page)
  +-> [Zabbix] (hardware sensors)
  +-> [LibreNMS] (network)
  +-> [PagerDuty/Slack] (alerting)
```

### Key Metrics
| Metric | Target |
|--------|--------|
| Uptime | 99.9% |
| API response | <200ms p95 |
| VPS provisioning | <90 seconds |
| WP provisioning | <120 seconds |
| Support response | <1 hour |
| Payment conversion | >80% |
| Customer churn | <5%/month |

---

# PART 9: TESTING

| Type | Tool | Coverage |
|------|------|----------|
| Unit tests | Jest | All services, >80% coverage |
| Integration tests | Supertest | All API endpoints |
| E2E tests | Playwright | Critical user flows |
| API testing | Swagger/OpenAPI | Auto-generated docs + tests |
| Load testing | k6 | 1000 concurrent users |
| Security testing | OWASP ZAP | OWASP Top 10 |

---

# PART 10: DEPLOYMENT (CI/CD)

### Pipeline (GitHub Actions)
```yaml
1. Lint + TypeScript check
2. Unit tests (Jest)
3. Integration tests (Supertest)
4. Build Docker images
5. Push to Container Registry (GHCR)
6. Deploy to staging (auto)
7. E2E tests on staging (Playwright)
8. Deploy to production (manual approval)
9. Health check
10. Rollback on failure (auto)
```

### Environments
| Env | URL | Deploy |
|-----|-----|--------|
| Development | localhost:3000 | Manual |
| Staging | staging.hostingnepal.com | Auto on push to develop |
| Production | hostingnepal.com | Manual approval |

---

# PART 11: NOTIFICATION SYSTEM

| Channel | Provider | Use Cases |
|---------|----------|-----------|
| Email | SendGrid / AWS SES | Invoices, credentials, renewals |
| SMS | Sparrow SMS (Nepal) | OTP, payment confirmations |
| Push | Firebase Cloud Messaging | Real-time alerts |
| In-App | WebSocket (Socket.io) | Dashboard notifications |
| WhatsApp | WhatsApp Business API | Premium support (Phase 2) |

---

# PART 12: MVP BUILD ORDER

### Phase 1: Foundation (Months 1-3) — $700-1,000 startup

| Week | Deliverable |
|------|-------------|
| 1-2 | Project setup, Auth module (JWT + 2FA + RBAC) |
| 3-4 | Domain search + registration (ResellerClub API) |
| 5-6 | Basic hosting provisioning (ResellerClub shared hosting API) |
| 7-8 | Billing + Khalti/eSewa payment integration |
| 9-10 | Customer dashboard (domains, hosting, invoices) |
| 11-12 | Admin panel + testing + deployment |

**Phase 1 Deliverables:** Users can register, buy domains, buy shared hosting, pay via Nepal gateways, manage from dashboard.

### Phase 2: VPS + WordPress (Months 4-6) — $24,000 infrastructure

| Week | Deliverable |
|------|-------------|
| 13-14 | Proxmox cluster setup + VPS provisioning automation |
| 15-16 | VirtFusion/Virtualizor integration + noVNC console |
| 17-18 | WordPress managed hosting (CyberPanel + CloudLinux) |
| 19-20 | SSL automation (acme.sh + PowerDNS) |
| 21-22 | Email integration (Titan + Google Workspace) |
| 23-24 | Saga orchestration + full automation pipeline |

### Phase 3: Scale (Months 7-9) — $37,000 expansion

| Week | Deliverable |
|------|-------------|
| 25-26 | Reseller/white-label module |
| 27-28 | WooCommerce hosting + Nepal payment pre-config |
| 29-30 | Staging environments + migration tools |
| 31-32 | AI domain suggestions + Nepali language dashboard |
| 33-34 | Affiliate/referral program |
| 35-36 | Mobile responsive + performance optimization |

### Phase 4: Market Leadership (Months 10-12+)

- Dedicated server automation (MAAS + IPMI)
- VDS hosting (CPU pinning)
- Mobile app (React Native)
- AI website builder
- Container hosting (Docker/K8s)
- Public API for developers
- Status page (Uptime Kuma)

---

# PART 13: STARTUP COSTS SUMMARY

| Phase | Investment | Monthly OpEx | Timeline |
|-------|-----------|-------------|----------|
| Phase 1 (Reseller MVP) | $700-1,000 | $70-100/mo | Months 1-3 |
| Phase 2 (Own Infrastructure) | $24,000 | $650-1,100/mo | Months 4-6 |
| Phase 3 (Scale) | $37,000 | $400-650/mo | Months 7-9 |
| Phase 4 (Leadership) | $30,000+ | $500-1,000/mo | Months 10-12+ |
| **TOTAL Year 1** | **~$62,000-92,000** | | |
| **Break-even** | | | **~Month 18** |

---

# PART 14: RULES (NON-NEGOTIABLE)

1. NO hardcoding — use .env configs everywhere
2. All services MODULAR (NestJS modules)
3. Fully API-driven (REST endpoints for everything)
4. Fully AUTOMATED (zero manual provisioning)
5. Event-driven architecture (saga pattern)
6. Every external API call has circuit breaker
7. Every provisioning step has compensation (rollback)
8. All operations are idempotent
9. Secrets NEVER in code (use vault/env)
10. TypeScript STRICT mode everywhere
11. Prisma for all DB access (no raw SQL)
12. 13% VAT on all Nepal invoices
13. Multi-language ready from day 1 (i18n)
14. Mobile-responsive from day 1
15. Accessibility (WCAG 2.1 AA)

---

# PART 15: FINAL GOAL

Build a system combining:
- **GoDaddy** (domain management)
- **Hostinger** (shared/WordPress hosting)
- **DigitalOcean** (VPS)
- **Contabo** (VDS + cheap VPS)
- **SiteGround** (Site Tools dashboard)
- **Hetzner** (dedicated servers)

Optimized for:
- Nepal market (NPR, Nepali language)
- Local payments (eSewa, Khalti, ConnectIPS)
- Reseller ecosystem (B2B white-label)
- 100% self-service automation

---

# RESEARCH FILES REFERENCE

All research backing this document:
```
/Users/sandeep/Documents/Hosting_Nepal/
├── FINAL_PRODUCTION_SPEC_v4.md                            <- THIS FILE
├── COMPLETE_INFRASTRUCTURE_v3.md                          <- Infrastructure layers
├── COMPLETE_HOSTING_INFRASTRUCTURE_ARCHITECTURE.md        <- Deep infra research
├── ENHANCED_PROJECT_SPECIFICATION.md                      <- v2.1 (DB schema)
├── SITEGROUND_SITE_TOOLS_ARCHITECTURE.md                  <- Site Tools clone
├── DEDICATED_SERVER_HOSTING_PLATFORM_ARCHITECTURE.md      <- Dedicated + IPAM
├── WORDPRESS_HOSTING_RESEARCH.md                          <- WP hosting
├── HOSTING_FEATURES_RESEARCH.md                           <- Global features
├── Nepal_Hosting_Market_Competitive_Analysis.md            <- Competitors
└── research/
    └── domain-management-and-hosting-automation-research.md
```

---

**END OF SPECIFICATION v4.0**
**Document: FINAL_PRODUCTION_SPEC_v4.md**
**Date: March 30, 2026**
**Status: READY TO BUILD**
