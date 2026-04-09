# HOSTING NEPAL - COMPLETE INFRASTRUCTURE ARCHITECTURE v3.0
## Full-Scale Hosting Provider: Contabo + SiteGround + GoDaddy
## 100% Automated | Top to Bottom | Production-Grade

---

# LAYER 0: OVERVIEW - WHAT WE'RE BUILDING

```
+======================================================================+
|                    HOSTING NEPAL - FULL STACK                          |
+======================================================================+
|                                                                        |
|  PRODUCTS OFFERED:                                                     |
|  1. Domain Registration (GoDaddy-like)                                |
|  2. Shared Hosting (cPanel/custom panel)                              |
|  3. WordPress Hosting (SiteGround Site Tools-like)                    |
|  4. WooCommerce Hosting (Nepal payments pre-configured)               |
|  5. VPS Hosting (Contabo-like, KVM)                                   |
|  6. VDS Hosting (Dedicated CPU cores)                                 |
|  7. Dedicated Servers (bare metal, IPMI)                              |
|  8. SSL Certificates (free + paid)                                    |
|  9. Business Email (Titan + Google Workspace)                         |
| 10. Reseller Hosting (white-label B2B)                                |
|                                                                        |
|  100% AUTOMATED: Customer pays -> Service live in 45-90 seconds       |
+======================================================================+
```

---

# LAYER 1: PHYSICAL INFRASTRUCTURE

## 1.1 Data Center Strategy

| Option | Cost | Best For |
|--------|------|----------|
| **Colocation India (Mumbai)** | $300-1,500/mo per rack | Startup phase - RECOMMENDED |
| Own Data Center | $500K+ investment | Scale phase (Year 3+) |

### Recommended Colocation Providers (Mumbai)

| Provider | Tier | Key Feature | Contact |
|----------|------|-------------|---------|
| **Web Werks (Iron Mountain)** | Tier III/IV | Carrier-neutral, affordable | webwerks.in |
| **Cyfuture Cloud** | Tier III/IV | HPC-ready, Indian govt clients | cyfuture.cloud |
| **ServerBasket** | Tier III | Budget colocation, unlimited BW | serverbasket.com |
| **Yotta (Hiranandani)** | Tier IV | Asia's largest DC campus | yotta.com |
| **Equinix Mumbai** | Tier IV | Enterprise, 99.999% uptime | equinix.com |

**Why Mumbai:** 60% of India's DC expansion, most submarine cable landing stations, lowest latency to Nepal (nearest major hub).

## 1.2 Server Hardware

### Minimum Starter Hardware (3-Node Cluster)

| Component | Spec | Purpose | Est. Cost/Server |
|-----------|------|---------|-----------------|
| CPU | AMD EPYC 7443P (24C/48T) | VPS/VDS hypervisor | $1,200 |
| RAM | 256GB DDR4 ECC (8x32GB) | VM allocation | $800 |
| Boot Drive | 2x 480GB SSD (RAID 1) | Proxmox OS | $100 |
| VM Storage | 4x 2TB NVMe U.2 | Customer VMs (Ceph) | $1,200 |
| Network | 2x 25GbE (Ceph) + 2x 10GbE (public) | Network | $400 |
| Chassis | 1U/2U Supermicro | Rack mount | $300 |
| **Total/Server** | | | **~$4,000** |
| **3 Servers** | | | **~$12,000** |

### Additional Servers (Phase 1)

| Server | Purpose | Spec | Est. Cost |
|--------|---------|------|-----------|
| Web Hosting Node | Shared/WordPress hosting | EPYC 7313P, 128GB, 2x2TB NVMe | $3,000 |
| DNS Server x2 | PowerDNS (primary + secondary) | 4-core, 16GB, 500GB SSD | $500 each |
| Backup Server | Proxmox Backup Server | 8-core, 64GB, 4x4TB HDD | $2,000 |
| **Total Additional** | | | **~$6,000** |

### Network Equipment

| Equipment | Purpose | Est. Cost |
|-----------|---------|-----------|
| Managed Switch (48-port 10GbE) | Server interconnect | $2,000 |
| Router (MikroTik CCR2004) | BGP/routing | $500 |
| Firewall (pfSense/OPNsense on hardware) | Perimeter security | $800 |
| **Total Network** | | **~$3,300** |

## 1.3 How Hetzner/Contabo Keep Costs Low

| Strategy | Hetzner | Contabo |
|----------|---------|---------|
| Data Centers | **Own land + build DCs** | Lease DC space |
| Servers | **Build in-house** (no fancy cases) | Bulk purchase |
| Hardware Lifecycle | Use proven components for years | Maximize specs/$ |
| Energy | Germany's cool climate = low cooling | Self-service model |
| Support | Minimal, self-service | Minimal, lean team |
| CPU Model | Fair resource allocation | **4:1 to 10:1 oversubscription** |
| Features | Cloud + bare metal + storage | VPS only, no extras |

**Your Strategy:** Start with colocation (low capex), build VPS with 3:1-5:1 CPU oversubscription for standard VPS, 1:1 for VDS (premium product).

---

# LAYER 2: NETWORK

## 2.1 IP Address Management

### Obtaining IP Addresses

| Option | Source | Cost | Recommended? |
|--------|--------|------|-------------|
| Lease from colocation provider | DC provider | $2-5/IP/mo | YES for start |
| Buy /24 block (256 IPs) | APNIC/secondary market | $40-60/IP (~$10K-15K) | Phase 2 |
| Become an LIR | APNIC | $1,500-2,500/yr + IP cost | Phase 3 |
| IPv6 /48 block | APNIC | Free with LIR membership | Phase 2 |

### IP Pool Architecture

```sql
CREATE TABLE ip_pool (
    id SERIAL PRIMARY KEY,
    ip_address INET NOT NULL UNIQUE,
    version INTEGER NOT NULL, -- 4 or 6
    subnet_id INTEGER REFERENCES subnets(id),
    status VARCHAR(20) DEFAULT 'available', -- available, reserved, allocated, quarantine
    assigned_to UUID, -- references VPS/hosting/dedicated
    assigned_type VARCHAR(20), -- 'vps', 'hosting', 'dedicated'
    ptr_record VARCHAR(255),
    node_id VARCHAR(50), -- which hypervisor node
    created_at TIMESTAMPTZ DEFAULT NOW(),
    allocated_at TIMESTAMPTZ,
    released_at TIMESTAMPTZ
);

CREATE TABLE subnets (
    id SERIAL PRIMARY KEY,
    network CIDR NOT NULL,
    gateway INET NOT NULL,
    vlan_id INTEGER,
    location VARCHAR(50),
    purpose VARCHAR(50), -- 'customer_vps', 'hosting', 'management', 'dedicated'
    total_ips INTEGER,
    available_ips INTEGER
);
```

### IPAM Tool: NetBox

- **Free, open-source** (by DigitalOcean)
- Combines DCIM (Data Center Infrastructure Management) + IPAM
- REST API for automation
- Tracks: racks, devices, serial numbers, BMC IPs, power, IP assignments
- URL: github.com/netbox-community/netbox

## 2.2 Network Architecture

```
                    INTERNET
                       |
              [DDoS Protection]
              (Cloudflare/Path.net)
                       |
              [Border Router]
              (BGP + your ASN)
                       |
         +-------------+-------------+
         |             |             |
   [VLAN 10]     [VLAN 20]     [VLAN 30]     [VLAN 100]
   Management    Customer       Ceph/Storage  Dedicated
   (internal)    VPS Traffic    (25GbE)       Servers
         |             |             |             |
   [Proxmox      [VPS VMs]    [Ceph OSDs]   [Bare Metal]
    Cluster]
```

## 2.3 DDoS Protection

| Layer | Solution | Cost |
|-------|----------|------|
| L3/L4 (Network) | Cloudflare Spectrum or Path.net | $200-1,000/mo |
| L7 (Application) | Cloudflare Pro/Business | $20-200/mo |
| Local | nftables synproxy + fail2ban | Free |

---

# LAYER 3: VIRTUALIZATION (VPS/VDS)

## 3.1 Hypervisor: Proxmox VE 8.x

**Why Proxmox:** Free, KVM + LXC, built-in Ceph, REST API, noVNC, largest ecosystem of billing/panel integrations.

### Cluster Architecture

```
[Proxmox Node 1]  <--Corosync-->  [Proxmox Node 2]  <--Corosync-->  [Proxmox Node 3]
     |                                  |                                  |
  [Ceph OSD]                        [Ceph OSD]                        [Ceph OSD]
  [Ceph MON]                        [Ceph MON]                        [Ceph MON]
     |                                  |                                  |
  [VPS VMs]                          [VPS VMs]                         [VPS VMs]
```

### Storage Options

| Option | Performance | Redundancy | Cost | Recommended |
|--------|-------------|------------|------|-------------|
| **Local NVMe** | Fastest IOPS | None (single node) | Lowest | Dev/budget |
| **ZFS Mirror** | Fast | Per-node redundancy | Low | Small clusters |
| **Ceph (3 nodes)** | Good | Full cluster redundancy | 3x storage overhead | **Production** |

### VPS vs VDS Implementation

| Feature | VPS (Standard) | VDS (Premium) |
|---------|---------------|---------------|
| CPU | Shared (oversubscribed 3:1-5:1) | Dedicated (CPU pinning, 1:1) |
| RAM | Dedicated (not oversubscribed) | Dedicated |
| Price | $5-15/mo | $15-45/mo (2-3x VPS price) |
| Proxmox Config | Default `cpu: host` | Add `affinity: 0-3` for core pinning |
| Kernel Param | None | `isolcpus=X-Y` to reserve cores |

## 3.2 VPS Provisioning Flow (45-90 seconds)

```
[T+0s]   Customer pays for VPS
[T+1s]   Payment validated
[T+2s]   Best node selected (resource scoring algorithm)
[T+3s]   IP allocated from pool (IPv4 + IPv6)
[T+5s]   VM created via Proxmox API (clone from template)
[T+7s]   Cloud-init config attached (hostname, IP, SSH key, password)
[T+9s]   VM started
[T+15s]  Wait for cloud-init completion (QEMU guest agent ping)
[T+50s]  PTR/rDNS record created (PowerDNS API)
[T+52s]  Firewall rules applied (SSH, HTTP, HTTPS open)
[T+54s]  Added to Prometheus monitoring
[T+55s]  VNC console enabled (built-in Proxmox)
[T+60s]  Credentials emailed + SMS sent
[T+60s]  DONE - VPS is LIVE
```

## 3.3 VPS Customer Panel

### Recommended: VirtFusion ($15/node/mo) or Virtualizor ($7/node/mo)

| Feature | VirtFusion | Virtualizor |
|---------|-----------|-------------|
| Price | $15/node/mo | $7/node/mo |
| UI Quality | Best (modern, customer-loved) | Good (functional) |
| API | REST API-first | REST API |
| Hypervisors | KVM only | KVM, OpenVZ, Xen, LXC, Proxmox |
| WHMCS | Yes | Yes (built-in module) |
| noVNC Console | Yes | Yes |
| OS Reinstall | Yes | Yes |
| Snapshots | Yes | Yes |
| Firewall Mgmt | Yes | Yes |
| Resource Graphs | Yes | Yes |
| ISO Mount | Yes | Yes |
| Rescue Mode | Yes | Yes |
| Reverse DNS | Yes | Yes |
| Creator | Original SolusVM creator | Softaculous team |

### Customer VPS Dashboard Features
- Power: Start / Stop / Restart / Force Reset
- Console: noVNC browser-based console (no Java)
- OS Reinstall: Choose OS template -> click -> 2 minutes
- Snapshots: Create / restore / delete
- Backups: Automated daily + on-demand
- Firewall: Add/remove port rules
- Resource Graphs: CPU, RAM, Disk I/O, Network (real-time)
- Reverse DNS: Set PTR record
- ISO Mount: Upload/mount custom ISO
- Rescue Mode: Boot into rescue OS
- SSH Keys: Manage SSH keys
- Reinstall: Fresh OS install

---

# LAYER 4: DEDICATED SERVER AUTOMATION

## 4.1 Bare Metal Provisioning Stack

```
[Customer Orders Dedicated Server]
        |
[WHMCS -> SynergyCP/EasyDCIM]
        |
[NetBox] (inventory check -> select available server)
        |
[IPMI/iDRAC/iLO] (power management)
        |
[PXE Boot -> MAAS] (OS installation)
        |
[Cloud-init] (post-install config)
        |
[PowerDNS] (PTR record)
        |
[Prometheus] (monitoring)
        |
[Customer Gets Credentials]
```

### Automation Tools

| Tool | Purpose | Cost |
|------|---------|------|
| **SynergyCP** | Turnkey dedicated server management + WHMCS | Commercial |
| **EasyDCIM** | DCIM + server management | Commercial |
| **MAAS** (Canonical) | PXE bare metal provisioning (<120s) | Free |
| **NetBox** | Hardware inventory + IPAM | Free |
| **IPMI/Redfish** | Remote power/console management | Built into server |

### Provisioning Time: 20-60 minutes
- Boot to PXE: 30-60 seconds
- OS Install (Linux): 10-20 minutes
- OS Install (Windows): 15-30 minutes
- Post-install config: 2-5 minutes

---

# LAYER 5: SHARED/WORDPRESS HOSTING

## 5.1 Architecture (SiteGround-like)

```
[Customer Browser]
        |
[Cloudflare CDN + WAF + DDoS]
        |
[Custom Dashboard (Next.js)] <--- Site Tools UI
        |
[Central API (NestJS/Go)]
        |
[Server Agent (Go, gRPC over mTLS)] <--- Runs on each hosting server
        |
[Hosting Server]
  |- OpenLiteSpeed (web server)
  |- CloudLinux OS (user isolation via LVE)
  |- PHP 8.1/8.2/8.3/8.4 (per-user selector)
  |- MariaDB 10.11+ (database)
  |- Redis (object caching)
  |- CyberPanel (server management API)
  |- Imunify360 (security)
  |- Certbot/acme.sh (SSL)
```

## 5.2 Multi-Tenancy Isolation: CloudLinux

| Feature | Purpose |
|---------|---------|
| **LVE** (Lightweight Virtual Environment) | Per-user CPU, RAM, I/O, process limits |
| **CageFS** | Filesystem isolation (users can't see each other) |
| **PHP Selector** | Per-user PHP version (5.6 through 8.4) |
| **MySQL Governor** | Per-user database throttling |
| **mod_lsapi** | Fastest PHP handler for OpenLiteSpeed |
| Cost | ~$14/mo per server |

## 5.3 SiteGround "Site Tools" Clone - Features Map

| SiteGround Tool | Your Implementation | Technology |
|----------------|--------------------:|------------|
| File Manager | Web file manager | FileBrowser (Go, open-source) |
| FTP Accounts | SFTP management | Pure-FTPd API |
| MySQL Manager | Database admin | phpMyAdmin / Custom |
| PostgreSQL Manager | PG admin | pgAdmin / Custom |
| Backups | Backup engine | rsync + rclone to Backblaze B2 |
| SSL Manager | Certificate management | acme.sh + PowerDNS API |
| HTTPS Enforce | Force HTTPS | .htaccess / OLS config API |
| Protected URLs | Password protection | .htpasswd management API |
| Blocked Traffic | IP blocking | iptables/nftables + fail2ban API |
| Site Scanner | Malware scanning | ClamAV + Imunify360 API |
| SuperCacher | 3-layer caching | OLS Cache + Redis + Memcached |
| CDN | Content delivery | Cloudflare API integration |
| Install WordPress | WP installer | WP-CLI automation |
| Staging Copies | Clone site | rsync + mysqldump + search-replace |
| WP Migrator | Import from other hosts | WP-CLI + rsync + SSH |
| WP Autoupdate | Auto updates | WP-CLI + pre-update snapshots |
| Search & Replace | URL migration tool | WP-CLI search-replace |
| Parked Domains | Domain parking | OLS vhost config API |

## 5.4 WordPress Provisioning Flow (60-120 seconds)

```
[T+0s]    Customer pays for WordPress hosting
[T+2s]    Select least-loaded hosting server
[T+5s]    Create Linux user + CloudLinux LVE limits
[T+8s]    Create directory structure (/home/user/public_html)
[T+10s]   Create MySQL database + user
[T+13s]   Configure OpenLiteSpeed vhost
[T+18s]   Issue SSL certificate (acme.sh + PowerDNS DNS-01)
[T+25s]   Configure DNS A record (PowerDNS API)
[T+30s]   Download + install WordPress (WP-CLI)
[T+40s]   Configure wp-config.php (DB, salts, cache, security)
[T+50s]   Install starter theme + essential plugins
[T+55s]   Enable LiteSpeed Cache + Redis
[T+60s]   Apply 10-point security hardening
[T+65s]   Create SFTP account
[T+70s]   Setup daily backup CRON job
[T+75s]   Add to uptime monitoring
[T+80s]   Send credentials email + SMS
[T+80s]   DONE - WordPress site is LIVE
```

## 5.5 Existing Panels to Build On

| Panel | Cost | Stack | Best For |
|-------|------|-------|----------|
| **CyberPanel** | Free | OpenLiteSpeed, MariaDB | WordPress speed |
| **CloudPanel** | Free | Nginx, MariaDB | Modern UI |
| **Enhance** | Commercial | Multi-server, API-first | White-label, scale |
| **HestiaCP** | Free | Apache/Nginx, all-in-one | Email + DNS + Web |
| **ISPConfig** | Free | Multi-server | Large deployments |

**Recommendation:** CyberPanel as backend engine + Custom Next.js frontend (like SiteGround did with Site Tools).

---

# LAYER 6: DNS AUTOMATION

## 6.1 PowerDNS (Authoritative DNS Server)

- Scales to **millions of domains per server**
- Full **REST API** for automation
- Backends: MySQL, PostgreSQL, LMDB
- **Lightning Stream** for sub-second replication between DCs

### Auto-Zone Creation on Domain Purchase

```bash
# PowerDNS API: Create zone
curl -X POST http://dns-server:8081/api/v1/servers/localhost/zones \
  -H "X-API-Key: ${PDNS_API_KEY}" \
  -d '{
    "name": "example.com.",
    "kind": "Native",
    "nameservers": ["ns1.hostingnepal.com.", "ns2.hostingnepal.com."],
    "rrsets": [
      {"name": "example.com.", "type": "A", "ttl": 3600, "records": [{"content": "SERVER_IP"}]},
      {"name": "www.example.com.", "type": "CNAME", "ttl": 3600, "records": [{"content": "example.com."}]},
      {"name": "example.com.", "type": "MX", "ttl": 3600, "records": [{"content": "10 mail.example.com."}]},
      {"name": "example.com.", "type": "TXT", "ttl": 3600, "records": [{"content": "\"v=spf1 mx ~all\""}]}
    ]
  }'
```

### DNS Architecture

```
[Customer changes DNS via dashboard]
        |
[Central API]
        |
[PowerDNS API (port 8081)]
        |
[PowerDNS Primary (ns1.hostingnepal.com)]
        |  (Lightning Stream / AXFR replication)
[PowerDNS Secondary (ns2.hostingnepal.com)] -- different DC/provider
```

---

# LAYER 7: SSL/TLS AUTOMATION

## 7.1 Let's Encrypt at Scale

| Tool | Best For | Footprint |
|------|----------|-----------|
| **acme.sh** | Hosting providers (150+ DNS APIs) | 1MB, no root needed |
| Certbot | Simple single-server | Heavier |
| Caddy | Automatic HTTPS built-in | Web server replacement |

### Rate Limits

| Limit | Value | Strategy |
|-------|-------|----------|
| Certificates/registered domain/week | 50 | Use SANs (100 domains/cert) |
| New orders/3 hours | 300 | Queue issuance |
| Renewals | Unlimited | Auto-renew 30 days before |
| Hosting providers | Can request elevated limits | Contact Let's Encrypt |

### Automation Flow

```
[Domain added to hosting]
    |
[acme.sh --issue -d domain.com --dns dns_pdns]
    |
[PowerDNS API creates TXT record for DNS-01 challenge]
    |
[Let's Encrypt validates]
    |
[Certificate issued -> stored in /home/user/ssl/]
    |
[OpenLiteSpeed vhost updated -> graceful reload]
    |
[CRON: daily check -> renew if expiry < 30 days]
```

---

# LAYER 8: EMAIL

## 8.1 Strategy: Hybrid

| Tier | Provider | API |
|------|----------|-----|
| Free email | Included with hosting (CyberPanel built-in) | Local |
| Business email | ResellerClub Titan API (`/api/eelite/`) | RC API |
| Enterprise email | ResellerClub Google Workspace (`/api/gapps/`) | RC API |

### Auto-DNS Configuration for Email

On email purchase, automatically add:
```
MX     @ -> mail.domain.com (priority 10)
TXT    @ -> "v=spf1 mx include:titan.email ~all"
TXT    _dkim._domainkey -> DKIM public key
TXT    _dmarc -> "v=DMARC1; p=quarantine; rua=mailto:admin@domain.com"
```

---

# LAYER 9: DOMAIN MANAGEMENT (GoDaddy-like)

## 9.1 ResellerClub API Integration

Full domain lifecycle via single API (already covered in v2.1 spec).

## 9.2 Domain Search UX

Three-tier availability checking for speed:
1. **Zone file cache** (instant, for .com/.net) - pre-downloaded daily
2. **DNS probe** (50ms) - quick NXDOMAIN check
3. **Registrar API** (500ms-2s) - authoritative check via ResellerClub

## 9.3 Domain Lifecycle After Expiry

```
Registration -> Active -> Expiry Date
    |
    +-> Grace Period (0-45 days, can renew at normal price)
    +-> Suspension (domain stops resolving)
    +-> Redemption Period (30 days, expensive to recover)
    +-> Pending Delete (5 days, cannot recover)
    +-> Released (available for anyone to register)
```

---

# LAYER 10: BILLING & PAYMENT

## 10.1 Billing Platform

| Platform | Cost | VPS Integration | Domain Integration |
|----------|------|-----------------|-------------------|
| **WHMCS** | $30/mo (250 clients) | ModulesGarden Proxmox module | ResellerClub module |
| **Paymenter** | FREE (open-source) | Native Proxmox module | Custom module |
| **Blesta** | $250 lifetime | ProxCP module | ResellerClub module |
| Custom | Dev cost | Direct Proxmox API | Direct RC API |

**Recommendation:** WHMCS for production (industry standard, most modules). Paymenter if bootstrapping.

## 10.2 Payment Gateways (Nepal)

| Gateway | Fee | Integration |
|---------|-----|-------------|
| Khalti (primary) | Contact merchant | REST API, sandbox available |
| eSewa (secondary) | Contact merchant | ePay v2, HMAC auth |
| ConnectIPS (bank) | NPR 2-8 flat | PFX certificate auth |
| FonePay (QR) | Free for QR | HMAC-SHA512 |
| API Nepal (aggregator) | Varies | Single API for all gateways |

## 10.3 Dunning (Failed Payment) Workflow

```
Day -7:  Pre-dunning reminder email
Day 0:   Invoice due -> auto-charge attempt (where possible)
Day 0:   If no auto-charge: send payment link (Khalti/eSewa)
Day 3:   Reminder #1 (email + SMS)
Day 5:   Reminder #2 (email + SMS, urgent tone)
Day 7:   Service SUSPENDED (site shows maintenance page)
Day 14:  Final warning (email + SMS)
Day 21:  Service TERMINATED (data backed up, then deleted after 30 more days)
```

---

# LAYER 11: ORCHESTRATION ENGINE (100% AUTOMATION)

## 11.1 Architecture: Event-Driven Saga Orchestrator

```
[Billing/WHMCS] --webhook--> [API Gateway]
                                   |
                          [Saga Orchestrator]
                          (PostgreSQL state machine)
                                   |
                    +--------------+--------------+
                    |      |       |      |       |
               [Proxmox  [IPAM  [DNS   [SSL   [Monitoring
                Worker]  Worker] Worker] Worker] Worker]
                    |      |       |      |       |
                    +------+-------+------+-------+
                                   |
                          [NATS JetStream]
                          (Event Bus)
```

## 11.2 Saga Pattern

Every provisioning is a **saga** — a sequence of steps where each has a **forward action** + **compensation (rollback)**:

| Step | Forward | Compensation (Rollback) |
|------|---------|------------------------|
| 1. Allocate IP | Reserve IP in pool | Release IP back |
| 2. Create VM | Proxmox API create | Proxmox API delete |
| 3. Cloud-init | Attach config | (VM delete handles) |
| 4. Start VM | Proxmox API start | Proxmox API stop |
| 5. DNS Record | PowerDNS API add | PowerDNS API delete |
| 6. SSL Cert | acme.sh issue | (cert expires naturally) |
| 7. Monitoring | Add Prometheus target | Remove target |
| 8. Firewall | Add iptables rules | Remove rules |

If Step 5 fails -> run compensations for steps 4, 3, 2, 1 in reverse.

## 11.3 Key Principles

1. **Every step is idempotent** — safe to retry
2. **Every step has compensation** — clean rollback
3. **Circuit breakers** on all external APIs
4. **All operations are async** — customer sees WebSocket progress bar
5. **State persisted in PostgreSQL** — survives orchestrator crashes
6. **Secrets never over WebSocket** — credentials via email/SMS only
7. **Monitoring is a first-class step** — every resource monitored from birth
8. **Predictive capacity** — alert 30 days before resource exhaustion

---

# LAYER 12: CUSTOMER-FACING PLATFORM

## 12.1 Unified Dashboard Architecture

```
[Next.js App (SSR)]
     |
     +-- /dashboard (overview: all products)
     +-- /domains (search, register, manage DNS)
     +-- /hosting (shared hosting management)
     +-- /wordpress (WP sites, staging, plugins)
     +-- /vps (VPS list, console, power, snapshots)
     +-- /dedicated (server management, IPMI)
     +-- /email (email accounts, webmail)
     +-- /ssl (certificates, auto-renew status)
     +-- /billing (invoices, payments, wallet)
     +-- /support (tickets, knowledge base)
     +-- /api (API keys, documentation)
     +-- /settings (profile, 2FA, SSH keys)
```

## 12.2 Real-Time Features (WebSocket)

| Feature | WebSocket Channel | Data |
|---------|------------------|------|
| VPS Console | `ws/vps/{id}/console` | noVNC binary frames |
| Provisioning Progress | `ws/provisioning/{order_id}` | Step-by-step % |
| Real-time Metrics | `ws/vps/{id}/metrics` | CPU, RAM, I/O every 5s |
| Notifications | `ws/notifications` | Alerts, maintenance |

## 12.3 Public Status Page

- URL: `status.hostingnepal.com`
- Tool: Uptime Kuma (free, open-source) or custom
- Shows: All services uptime, incidents, maintenance schedule
- **No Nepal competitor has this** — competitive advantage

---

# LAYER 13: MONITORING & SECURITY

## 13.1 Monitoring Stack

```
[Infrastructure]
     |
     +-> [Prometheus] -> [Grafana] (dashboards + alerts)
     +-> [Uptime Kuma] (HTTP/TCP checks for customer sites)
     +-> [LibreNMS] (network monitoring, SNMP)
     +-> [Zabbix] (hardware monitoring, IPMI sensors)
     +-> [ELK Stack] (centralized logging)
     +-> [Sentry] (application error tracking)
     +-> [PagerDuty/Slack] (alerting)
```

## 13.2 Security Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| Edge | Cloudflare WAF | L7 DDoS, bot protection |
| Network | nftables + fail2ban | Firewall + brute force |
| Server | Imunify360 | WordPress WAF, malware scanner |
| OS | CloudLinux CageFS | User filesystem isolation |
| App | OSSEC/Wazuh | Intrusion detection |
| Monitor | Prometheus alerts | Anomaly detection |

---

# LAYER 14: STARTUP COST ANALYSIS

## 14.1 Phase-by-Phase Investment

### Phase 1: MVP (Months 1-3) — RESELLER + BASIC VPS

| Item | One-Time | Monthly |
|------|----------|---------|
| Company registration (Nepal) | NPR 50,000 | -- |
| 3x VPS from Contabo/Hetzner (for hosting customers) | -- | $24-50 |
| CyberPanel (free) | -- | -- |
| WHMCS license | -- | $30 |
| ResellerClub deposit | $100-500 | -- |
| Domain + SSL for your site | $30 | -- |
| Khalti/eSewa merchant account | Free | -- |
| CloudLinux license (1 server) | -- | $14 |
| **Phase 1 Total** | **~$700-1,000** | **~$70-100/mo** |

### Phase 2: OWN INFRASTRUCTURE (Months 4-8)

| Item | One-Time | Monthly |
|------|----------|---------|
| 3x bare metal servers (Proxmox cluster) | $12,000 | -- |
| Web hosting server | $3,000 | -- |
| 2x DNS servers | $1,000 | -- |
| Backup server | $2,000 | -- |
| Network equipment | $3,300 | -- |
| Colocation (Mumbai, 6U) | $500 setup | $500-800 |
| IP block lease (/25 = 128 IPs) | $2,000 | $100-200 |
| VirtFusion or Virtualizor (3 nodes) | -- | $21-45 |
| WHMCS Proxmox module | $250 | -- |
| **Phase 2 Total** | **~$24,000** | **~$650-1,100/mo** |

### Phase 3: SCALE (Months 9-12)

| Item | One-Time | Monthly |
|------|----------|---------|
| 3 more hypervisor nodes | $12,000 | -- |
| Dedicated server inventory (3-5 servers) | $15,000 | -- |
| IPv4 /24 purchase (256 IPs) | $10,000-15,000 | -- |
| ASN + BGP setup | $500 | $50 |
| SynergyCP (dedicated automation) | -- | $50-100 |
| Additional colocation space | -- | $300-500 |
| **Phase 3 Total** | **~$37,000-42,000** | **~$400-650/mo** |

## 14.2 Revenue Projections

### Per-Cluster Revenue (3-node Proxmox)

| VPS Size | Count | Price/mo | Revenue/mo |
|----------|-------|----------|------------|
| 1C/1GB (small) | 60 | $5 | $300 |
| 2C/4GB (medium) | 30 | $12 | $360 |
| 4C/8GB (large) | 15 | $24 | $360 |
| **Total** | **105 VPS** | | **$1,020/mo** |

### WordPress Hosting Revenue

| Plan | Customers | Price/mo | Revenue/mo |
|------|-----------|----------|------------|
| Starter | 200 | NPR 299 ($2.25) | $450 |
| Business | 100 | NPR 799 ($6) | $600 |
| Pro | 30 | NPR 1,999 ($15) | $450 |
| **Total** | **330** | | **$1,500/mo** |

### Domain + SSL + Email Revenue

| Product | Orders/mo | Avg Revenue | Revenue/mo |
|---------|-----------|-------------|------------|
| .com domains | 50 | $3 margin | $150 |
| SSL (paid) | 10 | $15 margin | $150 |
| Email (Titan) | 30 | $2/mo margin | $60 |
| **Total** | | | **$360/mo** |

### Year 1 Summary (Starting Phase 2)

| | Monthly | Annual |
|---|---------|--------|
| Revenue | $2,880 | $34,560 |
| Operating costs | $1,500 | $18,000 |
| **Gross Profit** | **$1,380** | **$16,560** |
| Hardware investment | | -$24,000 |
| **Net Year 1** | | **-$7,440** |
| **Break-even** | | **~Month 18** |

### Year 2 (Growth)

| | Monthly | Annual |
|---|---------|--------|
| Revenue (3x growth) | $8,640 | $103,680 |
| Operating costs | $3,000 | $36,000 |
| **Gross Profit** | **$5,640** | **$67,680** |

---

# SUMMARY: COMPLETE TECHNOLOGY STACK

| Layer | Technology | Cost |
|-------|-----------|------|
| Hypervisor | Proxmox VE 8.x | Free |
| VPS Panel | VirtFusion ($15/node) or Virtualizor ($7/node) | $21-45/mo |
| Web Hosting | CyberPanel + OpenLiteSpeed | Free |
| User Isolation | CloudLinux OS | $14/mo/server |
| DNS | PowerDNS (authoritative) | Free |
| IPAM | NetBox | Free |
| SSL | acme.sh + Let's Encrypt | Free |
| Domains | ResellerClub API | Pay-per-use |
| Email | ResellerClub Titan/GW API | Pay-per-use |
| Billing | WHMCS | $30/mo |
| Monitoring | Prometheus + Grafana + Uptime Kuma | Free |
| Security | Imunify360 + CloudLinux + Cloudflare | $14-30/mo |
| Logging | ELK Stack | Free |
| Backup | Proxmox Backup Server + Backblaze B2 | $6/TB/mo |
| Orchestration | Custom (NestJS + NATS JetStream + PostgreSQL) | Dev cost |
| Dashboard | Custom (Next.js + TypeScript) | Dev cost |
| Dedicated Mgmt | SynergyCP or EasyDCIM | Commercial |
| Bare Metal | MAAS (Canonical) | Free |
| IDS | Wazuh/OSSEC | Free |
| Network Monitor | LibreNMS | Free |

---

# TOTAL STARTUP COST SUMMARY

| Phase | Investment | Monthly OpEx | Timeline |
|-------|-----------|-------------|----------|
| Phase 1 (Reseller MVP) | $700-1,000 | $70-100 | Months 1-3 |
| Phase 2 (Own Infrastructure) | $24,000 | $650-1,100 | Months 4-8 |
| Phase 3 (Scale) | $37,000-42,000 | $400-650 | Months 9-12 |
| **TOTAL Year 1** | **~$62,000-67,000** | **~$1,100-1,850** | |
| **Break-even** | | | **~Month 18** |

---

**Document Version:** 3.0
**Date:** March 30, 2026
**Research Sources:** Proxmox docs, VirtFusion, Virtualizor, PowerDNS, NetBox, MAAS, SynergyCP, CloudLinux, Hetzner/Contabo architecture analysis, SiteGround platform research, ResellerClub API docs, Nepal NRB regulations, APNIC IP allocation, Let's Encrypt rate limits, Cloudflare security, Mumbai colocation providers
