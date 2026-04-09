# Building a SiteGround-Like "Site Tools" Hosting Platform
## Complete Architecture & Implementation Guide

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [How SiteGround Built Their Platform](#2-how-siteground-built-their-platform)
3. [System Architecture Overview](#3-system-architecture-overview)
4. [Server Agent Architecture](#4-server-agent-architecture)
5. [Multi-Tenancy & Isolation](#5-multi-tenancy--isolation)
6. [Site Tools Dashboard - Feature-by-Feature Implementation](#6-site-tools-dashboard)
7. [Open-Source Panels to Build On or Learn From](#7-open-source-panels)
8. [Technology Stack Recommendations](#8-technology-stack-recommendations)
9. [Deployment Architecture](#9-deployment-architecture)
10. [Build vs Buy Decision Matrix](#10-build-vs-buy-decision-matrix)

---

## 1. Executive Summary

Building a SiteGround-like hosting platform with a custom "Site Tools" dashboard requires three major components:

1. **A React/Next.js frontend dashboard** - site-centric (one panel per site, not per account)
2. **A central API layer** - RESTful APIs with JWT authentication, CRUD operations on all resources
3. **Server agents** - lightweight daemons on each hosting server that execute commands and report metrics

SiteGround moved away from cPanel in 2019 and built their entire platform custom. Their approach: API-based architecture, JWT authentication (not cookies), site-centric design (each site gets its own independent panel), and modular microservices for PHP, MySQL, DNS, caching, and security.

---

## 2. How SiteGround Built Their Platform

### The Transition (2019)

SiteGround abandoned cPanel because it was third-party software that blocked them from:
- Creating their own access control system
- Optimizing for their specific infrastructure
- Building a site-centric (not account-centric) management model
- Integrating deeply with their caching and security layers

### Architecture Decisions

| Decision | SiteGround's Choice | Rationale |
|----------|---------------------|-----------|
| **Authentication** | JWT (JSON Web Tokens) | Cookies were not scalable, especially with CORS; JWT eliminates session-backend scaling problems |
| **API Design** | RESTful, CRUD-based | Every object supports create/read/update/delete; enables partner API access |
| **Panel Scope** | Site-centric (1 panel per site) | Unlike cPanel (1 panel per account), each site gets independent settings |
| **Access Control** | Custom roles: Owner, Collaborator, White-label Client | Granular permissions (e.g., create mail accounts without seeing existing ones) |
| **Infrastructure** | Google Cloud Premium Tier | Distributed SSD storage, premium network, near-zero server failures |
| **DNS** | Centralized DNS service in 5 geo-locations | Faster resolving, DDoS resilience, simplified management |

### SuperCacher (3-Layer Caching System)

SiteGround's proprietary caching system delivers up to 5x performance improvement:

```
Layer 1: NGINX Direct Delivery (Static Cache)
   - Caches images, CSS, JS, fonts
   - Active by default for all sites
   - Serves static files directly from NGINX without hitting PHP

Layer 2: Dynamic Cache (PHP Output Cache)
   - Caches HTML output from PHP
   - Serves from RAM instead of re-executing PHP
   - Enabled by default for all sites
   - Biggest performance impact for WordPress

Layer 3: Memcached (Object Cache)
   - Caches database queries, API calls, page rendering data
   - Reduces database load
   - Best for database-heavy sites
```

### Custom PHP Setup
SiteGround developed a custom PHP setup that reduces TTFB (Time to First Byte) by 30% compared to standard PHP setups through more efficient resource usage.

### CDN
In-house built CDN service with content cached on multiple global servers, one-click setup, and smart defaults.

**Sources:**
- https://www.siteground.com/blog/technology-behind-new-client-area-and-site-tools/
- https://www.siteground.com/technology
- https://www.siteground.com/blog/supercacher/
- https://www.siteground.com/blog/supercacher-for-all/

---

## 3. System Architecture Overview

### High-Level Architecture

```
+------------------------------------------------------------------+
|                        CLIENTS                                    |
|  [Web Browser]  [Mobile App]  [Partner API]  [WHMCS/Billing]     |
+------------------------------------------------------------------+
          |                    |                    |
          v                    v                    v
+------------------------------------------------------------------+
|                     API GATEWAY / LOAD BALANCER                   |
|              (NGINX / Traefik / Kong / AWS ALB)                   |
|         - Rate limiting, JWT validation, routing                  |
+------------------------------------------------------------------+
          |
          v
+------------------------------------------------------------------+
|                     CENTRAL API LAYER                             |
|                  (Node.js / Go / Python)                          |
|                                                                   |
|  +------------------+  +------------------+  +----------------+  |
|  | Auth Service     |  | Site Management  |  | Billing Service|  |
|  | (JWT, RBAC)      |  | (CRUD sites)     |  | (Plans, Usage) |  |
|  +------------------+  +------------------+  +----------------+  |
|                                                                   |
|  +------------------+  +------------------+  +----------------+  |
|  | DNS Service      |  | SSL Service      |  | Backup Service |  |
|  | (PowerDNS API)   |  | (ACME/Certbot)   |  | (Scheduler)    |  |
|  +------------------+  +------------------+  +----------------+  |
|                                                                   |
|  +------------------+  +------------------+  +----------------+  |
|  | Email Service    |  | CDN Service      |  | Monitoring     |  |
|  | (Postfix/Dovecot)|  | (Cloudflare API) |  | (Prometheus)   |  |
|  +------------------+  +------------------+  +----------------+  |
+------------------------------------------------------------------+
          |
          | gRPC / REST over mTLS
          v
+------------------------------------------------------------------+
|                     SERVER AGENTS                                 |
|              (One per hosting server)                             |
|                                                                   |
|  +------------------+  +------------------+  +----------------+  |
|  | Web Server Mgmt  |  | PHP Manager      |  | DB Manager     |  |
|  | (NGINX/OLS conf) |  | (php-fpm pools)  |  | (MySQL/PgSQL)  |  |
|  +------------------+  +------------------+  +----------------+  |
|                                                                   |
|  +------------------+  +------------------+  +----------------+  |
|  | File Manager     |  | FTP Manager      |  | Backup Agent   |  |
|  | (FileBrowser)    |  | (Pure-FTPd)      |  | (rsync/rclone) |  |
|  +------------------+  +------------------+  +----------------+  |
|                                                                   |
|  +------------------+  +------------------+  +----------------+  |
|  | Security Agent   |  | WP Manager       |  | Metrics Agent  |  |
|  | (ClamAV/Fail2ban)|  | (WP-CLI)         |  | (node_exporter)|  |
|  +------------------+  +------------------+  +----------------+  |
+------------------------------------------------------------------+
          |
          v
+------------------------------------------------------------------+
|                     HOSTING SERVERS                               |
|                                                                   |
|  [Server 1]     [Server 2]     [Server 3]     [Server N]        |
|  CloudLinux OS   CloudLinux OS   CloudLinux OS   CloudLinux OS   |
|  LVE + CageFS    LVE + CageFS   LVE + CageFS   LVE + CageFS   |
+------------------------------------------------------------------+
```

### Database & Storage Layer

```
+------------------------------------------------------------------+
|                     DATA STORES                                   |
|                                                                   |
|  +------------------+  +------------------+  +----------------+  |
|  | PostgreSQL       |  | Redis            |  | Object Storage |  |
|  | (Platform DB)    |  | (Cache, Sessions)|  | (Backups: S3/  |  |
|  | Users, Sites,    |  | JWT tokens,      |  |  Backblaze B2) |  |
|  | Plans, Billing   |  | rate limiting    |  |                |  |
|  +------------------+  +------------------+  +----------------+  |
|                                                                   |
|  +------------------+  +------------------+                      |
|  | Message Queue    |  | Prometheus +     |                      |
|  | (RabbitMQ/NATS)  |  | Grafana          |                      |
|  | Async tasks,     |  | (Metrics,        |                      |
|  | backup jobs      |  |  Alerting)       |                      |
|  +------------------+  +------------------+                      |
+------------------------------------------------------------------+
```

---

## 4. Server Agent Architecture

### What is the Server Agent?

A lightweight daemon running on each hosting server that:
- Receives commands from the central API (create site, issue SSL, run backup)
- Executes server-level operations (manage NGINX configs, PHP-FPM pools, MySQL users)
- Reports metrics back (CPU, RAM, disk, bandwidth, per-user resource usage)
- Maintains a heartbeat with the central platform

### Communication Protocol: gRPC over mTLS

**Why gRPC over REST for agent communication:**
- Binary protocol (Protobuf) - significantly faster than JSON/REST
- HTTP/2 multiplexing - multiple requests over a single connection
- Bidirectional streaming - agents can stream metrics, central API can push commands
- Strong typing via .proto files - automatic code generation for both sides
- Built-in load balancing and failover

**Why mTLS (mutual TLS):**
- Both the central API and the agent authenticate each other
- Prevents rogue agents or man-in-the-middle attacks
- Each agent gets a unique certificate signed by an internal CA

### Agent Architecture

```
+------------------------------------------+
|           SERVER AGENT (Go/Rust)          |
|                                          |
|  +------------------------------------+  |
|  |       gRPC Server (Port 50051)     |  |
|  |  - Receives commands from central  |  |
|  |  - Authenticates via mTLS          |  |
|  +------------------------------------+  |
|                                          |
|  +------------------------------------+  |
|  |       Command Executor             |  |
|  |  - Site creation (vhost, php-fpm)  |  |
|  |  - SSL management (certbot)        |  |
|  |  - Database operations (mysql CLI) |  |
|  |  - File operations (rsync, cp)     |  |
|  |  - User management (useradd, etc)  |  |
|  |  - Firewall rules (iptables)       |  |
|  |  - WP-CLI operations              |  |
|  +------------------------------------+  |
|                                          |
|  +------------------------------------+  |
|  |       Metrics Collector            |  |
|  |  - CPU, RAM, Disk, Network         |  |
|  |  - Per-user resource usage (LVE)   |  |
|  |  - Service health (nginx, mysql)   |  |
|  |  - Exports to Prometheus           |  |
|  +------------------------------------+  |
|                                          |
|  +------------------------------------+  |
|  |       Task Scheduler               |  |
|  |  - Cron-like backup scheduling     |  |
|  |  - SSL renewal checks             |  |
|  |  - WordPress auto-updates          |  |
|  |  - Security scans                  |  |
|  +------------------------------------+  |
|                                          |
|  +------------------------------------+  |
|  |       Config Manager               |  |
|  |  - NGINX vhost templates           |  |
|  |  - PHP-FPM pool configs            |  |
|  |  - SSL certificate storage         |  |
|  |  - Atomic config reloads           |  |
|  +------------------------------------+  |
+------------------------------------------+
```

### Proto Definition Example

```protobuf
syntax = "proto3";

service HostingAgent {
  // Site Management
  rpc CreateSite(CreateSiteRequest) returns (SiteResponse);
  rpc DeleteSite(DeleteSiteRequest) returns (StatusResponse);
  rpc ListSites(Empty) returns (SiteListResponse);

  // SSL Management
  rpc IssueCertificate(SSLRequest) returns (SSLResponse);
  rpc RenewCertificate(SSLRequest) returns (SSLResponse);

  // Database Management
  rpc CreateDatabase(DBRequest) returns (DBResponse);
  rpc CreateDBUser(DBUserRequest) returns (DBResponse);

  // Backup Management
  rpc CreateBackup(BackupRequest) returns (BackupResponse);
  rpc RestoreBackup(RestoreRequest) returns (StatusResponse);

  // WordPress Management
  rpc InstallWordPress(WPInstallRequest) returns (WPResponse);
  rpc UpdateWordPress(WPUpdateRequest) returns (WPResponse);
  rpc CreateStaging(StagingRequest) returns (StagingResponse);

  // Metrics (Server Streaming)
  rpc StreamMetrics(MetricsRequest) returns (stream MetricsResponse);

  // Health Check
  rpc HealthCheck(Empty) returns (HealthResponse);
}

message CreateSiteRequest {
  string domain = 1;
  string username = 2;
  string php_version = 3;
  string web_server_type = 4; // nginx, openlitespeed
  ResourceLimits limits = 5;
}

message ResourceLimits {
  int32 cpu_percent = 1;    // e.g., 100 = 1 core
  int64 ram_bytes = 2;      // e.g., 1073741824 = 1GB
  int64 disk_bytes = 3;
  int32 io_kbps = 4;
  int32 max_processes = 5;
  int32 max_connections = 6;
}
```

### Implementation Options

| Approach | Pros | Cons |
|----------|------|------|
| **Custom Agent in Go** | Fast, single binary, excellent for system tasks | Must build from scratch |
| **Custom Agent in Rust** | Maximum performance, memory safety | Steeper learning curve |
| **Custom Agent in Node.js** | Same stack as frontend, faster dev | Higher resource usage, not ideal for system tasks |
| **SaltStack** | Mature, built for server management, event-driven | Complex, Python-based, heavier |
| **Ansible (push-based)** | Agentless, huge module library | Not real-time, polling-based |

**Recommendation:** Custom agent in **Go** - it compiles to a single binary, has excellent system-level libraries, native gRPC support, low resource footprint, and is the language used by Docker, Kubernetes, and most cloud-native infrastructure tools.

---

## 5. Multi-Tenancy & Isolation

### The CloudLinux Stack (Industry Standard for Shared Hosting)

CloudLinux OS is the de facto standard for multi-tenant shared hosting. It provides:

#### LVE (Lightweight Virtual Environment) - Resource Isolation

```
Per-User Resource Limits:
+----------------------------------+
| User: john_doe                   |
| CPU:     100% (1 core)           |
| RAM:     1 GB                    |
| I/O:     10 MB/s                 |
| IOPS:    1024                    |
| Processes: 20                    |
| Entry Processes: 5               |
+----------------------------------+

When limits are hit:
- CPU: Process is throttled (not killed)
- RAM: Process receives ENOMEM (out of memory)
- I/O: Disk operations are slowed
- User sees 508 "Resource Limit Reached" error
```

#### CageFS - File System Isolation

```
Without CageFS:
  User A can see: /home/user_b/, /etc/passwd (all users), /proc (all processes)

With CageFS:
  User A sees only:
  - /home/user_a/ (own files)
  - /etc/passwd (only own entry)
  - /proc (only own processes)
  - /tmp (own private tmp)
  - Curated set of binaries and libraries

  User A CANNOT:
  - See other users exist
  - Read server configuration files
  - Access other users' files or processes
  - Execute arbitrary system binaries
```

#### Per-Site Isolation (New in 2026 Beta)

CloudLinux now offers per-SITE isolation within multi-site accounts, so even sites belonging to the same user are isolated from each other.

#### PHP Selector

```
Each user can independently choose:
- PHP Version: 5.6, 7.0, 7.1, 7.2, 7.3, 7.4, 8.0, 8.1, 8.2, 8.3, 8.4
- PHP Handler: CGI, FastCGI, LSAPI
- PHP Extensions: Enable/disable per user
- php.ini values: Custom per user (memory_limit, etc.)
```

#### MySQL Governor

```
- Tracks CPU and disk I/O for every MySQL user in real-time
- Throttles MySQL queries using LVE-style per-user limits
- Prevents a single user's bad queries from bringing down the database server
```

### Alternative Isolation: Container-Based (Enhance Panel Approach)

```
Each website runs in its own Docker container:
- Separate PHP-FPM process
- Separate cron daemon
- Separate SSH access
- Isolated filesystem
- Cannot see other sites' document roots

Pros: Stronger isolation than CageFS, modern approach
Cons: Higher resource overhead per site, more complex orchestration
```

### Jailed SSH/SFTP Access

```bash
# Using OpenSSH ChrootDirectory
Match User hosting_user
    ChrootDirectory /home/%u
    ForceCommand internal-sftp
    AllowTcpForwarding no
    X11Forwarding no

# Or using jailkit
jk_init /home/jail basicshell netutils ssh
jk_jailuser /home/jail hosting_user
```

**Sources:**
- https://cloudlinux.com/getting-started-with-cloudlinux-os/41-security-features/934-cagefs-tenant-isolation/
- https://cloudlinux.com/features/
- https://blog.cloudlinux.com/per-site-cagefs-isolation-now-available-in-beta-for-cloudlinux-customers

---

## 6. Site Tools Dashboard - Feature-by-Feature Implementation

### 6.1 File Manager

| Approach | Technology | Notes |
|----------|-----------|-------|
| **FileBrowser** (recommended) | Go binary, web UI | Self-hosted, multi-user, upload/download/edit, lightweight, no database needed |
| **FileBrowser Quantum** | Fork with advanced features | Real-time search, OIDC auth, multi-source support |
| **Custom** | Node.js + React | Full control, use `fs` API for operations, Monaco editor for code editing |
| **Filestash** | Go, supports S3/SFTP/FTP backends | Good if you want multi-protocol support |

**Implementation:**

```
Central API                    Server Agent                    FileBrowser
    |                              |                               |
    |-- GET /sites/{id}/files ---->|                               |
    |                              |-- Proxy to FileBrowser ------>|
    |                              |   (scoped to user's docroot)  |
    |<----- File listing ----------|<------------------------------|
```

Each site gets a FileBrowser instance (or scoped access) limited to its document root. The server agent proxies requests and enforces permissions.

### 6.2 FTP Accounts

**Technology:** Pure-FTPd with virtual users (MySQL/PostgreSQL backend)

```bash
# Agent creates FTP account:
# 1. Insert into pureftpd virtual users table
INSERT INTO ftpd (user, password, uid, gid, dir)
VALUES ('user_ftp', MD5('password'), 1001, 1001, '/home/user/public_html');

# 2. Or manage via Pure-FTPd's pure-pw tool
pure-pw useradd ftpuser -u www-data -d /home/user/public_html
pure-pw mkdb

# API endpoint:
POST /api/sites/{site_id}/ftp-accounts
{
  "username": "deploy_user",
  "password": "...",
  "directory": "/public_html",
  "permissions": "read_write"
}
```

### 6.3 MySQL Manager

| Approach | Technology | Notes |
|----------|-----------|-------|
| **phpMyAdmin** (embedded) | PHP, iframe/proxy | Industry standard, full-featured, embed via reverse proxy |
| **Adminer** | Single PHP file | Lightweight alternative to phpMyAdmin |
| **Custom** | React + mysql2 library | Full control over UX, query editor with Monaco |

**Agent operations:**

```bash
# Create database
mysql -e "CREATE DATABASE site123_wp;"

# Create user with limited privileges
mysql -e "CREATE USER 'site123_user'@'localhost' IDENTIFIED BY 'password';"
mysql -e "GRANT ALL ON site123_wp.* TO 'site123_user'@'localhost';"

# Expose via API:
POST /api/sites/{site_id}/databases
POST /api/sites/{site_id}/databases/{db_id}/users
GET  /api/sites/{site_id}/databases/{db_id}/tables
POST /api/sites/{site_id}/databases/{db_id}/query  (with query sandboxing)
```

### 6.4 PostgreSQL Manager

Same pattern as MySQL but using:
- **pgAdmin** for embedding (or custom React UI)
- PostgreSQL CLI commands via agent
- `createdb`, `createuser`, `psql` commands

### 6.5 Backup Manager

```
Architecture:
+-------------------+     +-------------------+     +-------------------+
|   Backup Scheduler|     |   Backup Agent    |     |  Object Storage   |
|   (Central API)   |---->|  (On each server) |---->|  (Backblaze B2 /  |
|                   |     |                   |     |   AWS S3 / Wasabi)|
| - Daily schedule  |     | - rsync files     |     |                   |
| - On-demand       |     | - mysqldump DBs   |     | - Encrypted       |
| - Retention policy|     | - Compress (zstd) |     | - Versioned       |
+-------------------+     | - Encrypt (GPG)   |     | - Lifecycle rules |
                          | - Upload (rclone) |     +-------------------+
                          +-------------------+

Backup Types:
1. Full backup: Complete site files + database (weekly)
2. Incremental backup: Only changed files since last backup (daily)
3. Database-only backup: mysqldump/pg_dump (every 6 hours)

Restore Options:
- Full restore (overwrite everything)
- Selective restore (specific files/folders)
- Database-only restore
- Point-in-time restore (from any daily snapshot)
```

**Tools:**

```bash
# File backup with rsync (incremental)
rsync -avz --link-dest=/backups/latest /home/user/public_html/ /backups/$(date +%Y%m%d)/

# Database backup
mysqldump --single-transaction --quick site123_wp | zstd > backup.sql.zst

# Upload to B2/S3 with rclone
rclone copy /backups/20260330/ b2:hosting-backups/site123/20260330/

# Encryption
gpg --symmetric --cipher-algo AES256 backup.tar.zst
```

### 6.6 SSL Manager

**Technology:** ACME protocol with Certbot or acme.sh

```
Flow:
1. User clicks "Get Free SSL" in dashboard
2. Central API sends SSL request to server agent
3. Agent runs: certbot certonly --webroot -w /home/user/public_html -d example.com
4. Certificate issued and stored
5. NGINX/Apache config updated automatically
6. Agent sets up auto-renewal cron

API Endpoints:
POST /api/sites/{site_id}/ssl/issue         # Issue new cert
GET  /api/sites/{site_id}/ssl/status        # Check cert status/expiry
POST /api/sites/{site_id}/ssl/renew         # Force renewal
POST /api/sites/{site_id}/ssl/upload        # Upload custom cert
DELETE /api/sites/{site_id}/ssl             # Remove SSL

Auto-Renewal:
- Certbot auto-renewal runs via systemd timer (twice daily)
- Agent monitors expiry dates and alerts if renewal fails
- Fallback: DNS-01 challenge for wildcard certs via Cloudflare API
```

**ACME Client Options:**
- **Certbot** - Most popular, Python-based, EFF-maintained
- **acme.sh** - Shell script, lightweight, great for automation
- **Caddy** - Has built-in ACME (if using Caddy as web server)
- **lego** - Go-based, easy to integrate into Go agents

### 6.7 HTTPS Enforce

```bash
# NGINX approach (agent modifies vhost config):
server {
    listen 80;
    server_name example.com;
    return 301 https://$host$request_uri;
}

# Apache/.htaccess approach:
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# API:
PUT /api/sites/{site_id}/ssl/enforce
{ "enabled": true }
```

### 6.8 Protected URLs (Password Protection)

```bash
# Agent creates .htpasswd file:
htpasswd -bc /home/user/.htpasswd admin_user password123

# Agent adds to NGINX config:
location /admin {
    auth_basic "Restricted Area";
    auth_basic_user_file /home/user/.htpasswd;
}

# Or for Apache, agent adds .htaccess:
AuthType Basic
AuthName "Restricted"
AuthUserFile /home/user/.htpasswd
Require valid-user

# API:
POST /api/sites/{site_id}/protected-urls
{
  "path": "/staging",
  "username": "reviewer",
  "password": "..."
}
```

### 6.9 Blocked Traffic (Firewall/IP Blocking)

```bash
# Using iptables (agent executes):
iptables -A INPUT -s 192.168.1.100 -j DROP
iptables -A INPUT -s 10.0.0.0/8 -j DROP

# Using fail2ban for automated blocking:
# Agent manages fail2ban jails and filters

# Using NGINX deny directives (per-site):
location / {
    deny 192.168.1.100;
    deny 10.0.0.0/8;
    allow all;
}

# Country-based blocking with GeoIP:
# Agent configures NGINX GeoIP module

# API:
POST /api/sites/{site_id}/firewall/block
{ "ip": "192.168.1.100", "reason": "Brute force" }

GET  /api/sites/{site_id}/firewall/blocked
DELETE /api/sites/{site_id}/firewall/block/{rule_id}

POST /api/sites/{site_id}/firewall/block-country
{ "country_code": "XX" }
```

### 6.10 Site Scanner (Security)

```
Components:
1. ClamAV - Open-source antivirus/malware scanner
2. Imunify360 - Commercial security suite (CloudLinux product)
3. Custom file integrity monitoring

Flow:
- Scheduled scans (daily): Agent runs clamscan on user directories
- On-demand scans: User triggers from dashboard
- Real-time monitoring: inotify watches for suspicious file changes
- Results stored and displayed in dashboard

Agent Implementation:
  clamscan -ri /home/user/public_html/ --log=/var/log/clamav/user_scan.log

  # Or with Imunify360 API:
  imunify360-agent malware on-demand start --path /home/user/public_html

API:
POST /api/sites/{site_id}/security/scan          # Start scan
GET  /api/sites/{site_id}/security/scan/{scan_id} # Get results
GET  /api/sites/{site_id}/security/threats        # List threats
POST /api/sites/{site_id}/security/clean/{threat_id} # Clean threat
```

### 6.11 SuperCacher (Multi-Layer Caching)

Implementing SiteGround's 3-layer caching approach:

```
Layer 1: Static Cache (NGINX)
  # Already built into NGINX - configure proper cache headers
  location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff2)$ {
      expires 1y;
      add_header Cache-Control "public, immutable";
  }

Layer 2: Dynamic Cache (NGINX FastCGI Cache or Varnish)

  Option A - NGINX FastCGI Cache:
    fastcgi_cache_path /var/cache/nginx levels=1:2 keys_zone=SITE123:10m;
    fastcgi_cache_key "$scheme$request_method$host$request_uri";
    fastcgi_cache_valid 200 60m;
    fastcgi_cache_use_stale error timeout updating;

  Option B - Varnish (separate caching layer):
    - Sits in front of NGINX/Apache
    - Caches full-page HTML in RAM
    - Extremely fast for WordPress

  Option C - OpenLiteSpeed LSCache:
    - Built-in page caching with LiteSpeed
    - WordPress plugin: LiteSpeed Cache
    - Best performance for WordPress hosting

Layer 3: Object Cache (Redis or Memcached)
  # Redis (preferred over Memcached for persistence):
  - Install Redis per-server
  - Each site gets its own Redis database (SELECT 0-15) or key prefix
  - WordPress: Use redis-cache plugin with WP_REDIS_HOST

  # Per-site Redis isolation:
  redis-server --port 6380 --maxmemory 64mb --maxmemory-policy allkeys-lru

API:
PUT /api/sites/{site_id}/cache/static    { "enabled": true, "ttl": 86400 }
PUT /api/sites/{site_id}/cache/dynamic   { "enabled": true, "ttl": 3600 }
PUT /api/sites/{site_id}/cache/object    { "enabled": true, "engine": "redis" }
POST /api/sites/{site_id}/cache/purge    { "type": "all" | "url" | "path" }
```

### 6.12 CDN Integration

```
Cloudflare API Integration:

# Create DNS zone
POST https://api.cloudflare.com/client/v4/zones
{ "name": "example.com", "type": "full" }

# Enable CDN (proxy mode)
PUT https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records/{record_id}
{ "proxied": true }

# Purge cache
POST https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache
{ "purge_everything": true }

# Or build your own CDN:
- Use multiple edge servers with NGINX caching
- GeoDNS to route users to nearest edge
- Origin pull from hosting server
- Similar to what SiteGround built in-house

API:
POST /api/sites/{site_id}/cdn/enable
POST /api/sites/{site_id}/cdn/purge
GET  /api/sites/{site_id}/cdn/stats
PUT  /api/sites/{site_id}/cdn/settings
```

### 6.13 WordPress Install & Manage

```bash
# All via WP-CLI (agent executes):

# Install WordPress
wp core download --path=/home/user/public_html
wp config create --dbname=site123_wp --dbuser=site123_user --dbpass=xxx
wp core install --url=example.com --title="My Site" --admin_user=admin \
  --admin_password=xxx --admin_email=user@example.com

# List installed plugins
wp plugin list --format=json

# Update WordPress core
wp core update
wp core update-db

# Install/activate plugins
wp plugin install woocommerce --activate

# Install/activate themes
wp theme install flavor --activate

API:
POST /api/sites/{site_id}/wordpress/install
{
  "version": "latest",
  "admin_user": "admin",
  "admin_email": "user@example.com",
  "site_title": "My WordPress Site"
}

GET  /api/sites/{site_id}/wordpress/info          # WP version, plugins, themes
POST /api/sites/{site_id}/wordpress/plugins/install
POST /api/sites/{site_id}/wordpress/update
```

### 6.14 Staging Copies

```
Staging Workflow:
1. User clicks "Create Staging" in dashboard
2. Central API sends staging request to server agent
3. Agent executes:

   # Clone files
   rsync -avz /home/user/public_html/ /home/user/staging/

   # Clone database
   mysqldump site123_wp | mysql site123_wp_staging

   # Update wp-config.php in staging
   wp config set DB_NAME site123_wp_staging --path=/home/user/staging

   # Search & replace URLs
   wp search-replace 'example.com' 'staging.example.com' --path=/home/user/staging

   # Create staging subdomain NGINX vhost
   # staging.example.com -> /home/user/staging/

4. Staging site available at staging.example.com

Push Staging to Production:
   # Reverse the process:
   rsync -avz /home/user/staging/ /home/user/public_html/
   mysqldump site123_wp_staging | mysql site123_wp
   wp search-replace 'staging.example.com' 'example.com'

API:
POST /api/sites/{site_id}/staging/create
POST /api/sites/{site_id}/staging/push-live
DELETE /api/sites/{site_id}/staging
GET  /api/sites/{site_id}/staging/status
```

### 6.15 WordPress Migrator

```
Migration Flow:
1. User provides source site URL and credentials (FTP/SSH or plugin-based)
2. Agent on target server:

   Option A - Plugin-based migration:
   # Install migration plugin on source (via WP-CLI over SSH)
   # Export site data, download to target, import

   Option B - Manual migration:
   # Download files via SFTP/rsync from source
   rsync -avz source_server:/home/user/public_html/ /home/new_user/public_html/

   # Export database from source
   ssh source_server "mysqldump old_db" | mysql new_db

   # Update wp-config.php
   wp config set DB_NAME new_db
   wp config set DB_USER new_user
   wp config set DB_PASSWORD new_pass

   # Search & replace old domain with new
   wp search-replace 'old-domain.com' 'new-domain.com' --all-tables

   Option C - All-in-One WP Migration plugin API
   # Use the plugin's CLI interface for export/import

API:
POST /api/sites/{site_id}/migrate
{
  "source_url": "https://old-site.com",
  "source_type": "sftp",  // sftp, ftp, ssh, plugin
  "credentials": { ... }
}
GET /api/sites/{site_id}/migrate/status
```

### 6.16 WordPress Auto-Update

```bash
# WP-CLI based auto-update system:

# Check for updates
wp core check-update --format=json
wp plugin list --update=available --format=json
wp theme list --update=available --format=json

# Auto-update workflow (agent cron job):
1. Create automatic backup (pre-update snapshot)
2. Run updates:
   wp core update
   wp core update-db
   wp plugin update --all
   wp theme update --all
3. Run health check (HTTP request to site, check for 200 status)
4. If health check fails:
   - Restore from pre-update backup (automatic rollback)
   - Notify user of failed update
5. If health check passes:
   - Log successful update
   - Notify user of completed updates

# Configurable per site:
API:
PUT /api/sites/{site_id}/wordpress/autoupdate
{
  "core": "minor",        // "all", "minor", "none"
  "plugins": true,
  "themes": true,
  "schedule": "weekly",   // "daily", "weekly"
  "backup_before": true,
  "rollback_on_failure": true
}
```

### 6.17 WordPress Search & Replace

```bash
# WP-CLI search-replace:
wp search-replace 'http://example.com' 'https://example.com' --all-tables --dry-run
wp search-replace 'http://example.com' 'https://example.com' --all-tables

# Handles serialized data properly (unlike raw SQL REPLACE)

API:
POST /api/sites/{site_id}/wordpress/search-replace
{
  "search": "http://old-domain.com",
  "replace": "https://new-domain.com",
  "tables": "all",    // or specific table names
  "dry_run": true     // preview changes first
}
```

### 6.18 Parked Domains (Domain Aliases)

```bash
# Agent adds domain alias to NGINX config:
server {
    listen 80;
    listen 443 ssl;
    server_name example.com parked-domain.com alias-domain.com;
    # ... same config as primary domain
}

# Issue SSL for parked domain
certbot certonly --webroot -d parked-domain.com

# DNS: Point parked domain to same server IP

API:
POST /api/sites/{site_id}/domains/park
{ "domain": "parked-domain.com" }

GET  /api/sites/{site_id}/domains
DELETE /api/sites/{site_id}/domains/{domain_id}
```

---

## 7. Open-Source Panels to Build On or Learn From

### Comparison Matrix

| Panel | Web Server | License | Multi-Server | API | White-Label | Best For |
|-------|-----------|---------|-------------|-----|------------|---------|
| **CyberPanel** | OpenLiteSpeed | Free (Enterprise: $$$) | No | REST API (Apiary docs) | Limited (manual template edits) | WordPress speed |
| **CloudPanel** | NGINX | Free | No | CLI-based | No | Raw performance (1,248 req/s) |
| **HestiaCP** | Apache+NGINX | Free (GPLv3) | No | REST API | Limited | All-in-one (email, DNS, mail) |
| **Enhance** | Configurable | Per-site fee | Yes (1-10,000+) | Full API + hooks | Yes | Multi-server hosting business |
| **ISPConfig** | Apache/NGINX | BSD | Yes (multi-server) | REST API | Limited | Large hosting operations |
| **Webmin/Virtualmin** | Apache | GPL | Yes | REST API | No | Sysadmins, comprehensive |
| **aaPanel** | NGINX/Apache | Free | No | API | Limited | Beginners, quick setup |
| **KeyHelp** | NGINX/Apache | Free | No | REST API | Yes | German market, modern UI |
| **ApisCP** | Apache/NGINX | Commercial | No | 2,000+ API commands | No | Power users, automation |

### Recommended Approaches

**Option 1: Build on Enhance (Best for hosting business)**
- Already has multi-server architecture, per-site isolation, Docker containers
- API-first design with hooks for CI/CD
- White-label support built in
- Per-site licensing (no per-server cost)
- Build your custom React frontend that talks to Enhance's API
- Add custom features (WordPress management, staging, CDN) on top

**Option 2: Fork/Extend HestiaCP (Best for full control)**
- Open-source (GPLv3), active community
- Already has email, DNS, web, database, FTP management
- Add CloudLinux integration, WordPress tools, caching management
- Replace the UI with a custom React dashboard
- Add server agent layer for multi-server support

**Option 3: Fork/Extend CyberPanel (Best for WordPress-focused hosting)**
- OpenLiteSpeed = best WordPress performance out of the box
- LSCache integration built in
- Has API (Apiary-documented)
- Add multi-server support, better UI, more WordPress tools
- WHMCS integration already exists

**Option 4: Build Custom from Scratch (Best for SiteGround-like differentiation)**
- Most work but maximum control and differentiation
- Use this document as the blueprint
- Start with: Auth + Site CRUD + Agent + NGINX management + SSL
- Then add: WordPress tools, Backup, Caching, CDN, Security
- This is what SiteGround, Hostinger (hPanel), and Cloudways did

**Sources:**
- https://cyberpanel.docs.apiary.io/
- https://enhance.com/
- https://apiscp.com/
- https://underhost.com/blog/top-free-web-hosting-control-panels-2025/

---

## 8. Technology Stack Recommendations

### Frontend (Dashboard)

```
Framework:     Next.js 14+ (React, SSR, API routes)
UI Library:    Tailwind CSS + shadcn/ui (or Ant Design)
State:         Zustand or React Query (TanStack Query)
Auth:          JWT stored in httpOnly cookies
Code Editor:   Monaco Editor (for file editing, SQL queries)
File Manager:  FileBrowser embedded or custom React component
Terminal:      xterm.js (web-based terminal for SSH access)
Charts:        Recharts or Chart.js (for metrics/analytics)
Real-time:     WebSocket (for live logs, metrics streaming)
```

### Central API

```
Language:      Node.js (Express/Fastify) or Go (Gin/Fiber)
Auth:          JWT + RBAC (role-based access control)
Database:      PostgreSQL (platform data)
Cache:         Redis (sessions, rate limiting, caching)
Queue:         RabbitMQ or NATS (async tasks: backups, deployments)
API Docs:      OpenAPI/Swagger
Logging:       Structured logging (JSON) -> ELK or Loki
```

### Server Agent

```
Language:      Go (recommended) or Rust
Communication: gRPC over mTLS (to central API)
Config Mgmt:  Template-based (Go templates for NGINX/PHP configs)
Process Mgmt:  systemd unit file (auto-restart, logging)
Metrics:       Prometheus node_exporter + custom metrics
```

### Infrastructure

```
OS:            CloudLinux OS (for shared hosting with LVE + CageFS)
               or AlmaLinux/Rocky Linux (without CloudLinux)
Web Server:    NGINX (performance) or OpenLiteSpeed (WordPress optimization)
PHP:           PHP-FPM with per-user pools
Database:      MariaDB 10.11+ or MySQL 8.0+ (per-server)
               PostgreSQL 16+ (optional, per-server)
Cache:         Redis 7+ (object cache)
               Varnish 7+ (full-page cache, optional)
FTP:           Pure-FTPd (virtual users)
Email:         Postfix + Dovecot (or outsource to external provider)
DNS:           PowerDNS (API-driven, GeoDNS support)
SSL:           Certbot / acme.sh (Let's Encrypt ACME)
Backup:        rsync + rclone (to S3/B2/Wasabi)
Security:      ClamAV + Fail2ban + ModSecurity/Coraza WAF
Monitoring:    Prometheus + Grafana + Alertmanager
```

---

## 9. Deployment Architecture

### Single-Server Setup (Starting Point)

```
+-------------------------------------------------------+
|                    Single Server                       |
|                                                        |
|  [NGINX] -> [PHP-FPM] -> [MariaDB] -> [Redis]        |
|                                                        |
|  [Central API]  [Server Agent]  [FileBrowser]         |
|  [Certbot]  [Pure-FTPd]  [ClamAV]  [Fail2ban]       |
|                                                        |
|  OS: CloudLinux | Users isolated via LVE + CageFS     |
+-------------------------------------------------------+
```

### Multi-Server Setup (Scale-Out)

```
+------------------+     +------------------+     +------------------+
|  Control Server  |     |  Web Server 1    |     |  Web Server 2    |
|                  |     |                  |     |                  |
| - Central API    |     | - NGINX          |     | - NGINX          |
| - Dashboard      |     | - PHP-FPM        |     | - PHP-FPM        |
| - PostgreSQL     |     | - Server Agent   |     | - Server Agent   |
| - Redis          |     | - CloudLinux     |     | - CloudLinux     |
| - RabbitMQ       |     | - CageFS + LVE   |     | - CageFS + LVE   |
| - Prometheus     |     | - FileBrowser    |     | - FileBrowser    |
+------------------+     +------------------+     +------------------+
                                |                        |
                          +------------------+     +------------------+
                          |  DB Server       |     |  Backup Server   |
                          |                  |     |                  |
                          | - MariaDB Master |     | - rclone         |
                          | - MariaDB Slave  |     | - Backblaze B2   |
                          | - Redis          |     | - Backup Agent   |
                          | - MySQL Governor |     |                  |
                          +------------------+     +------------------+
                                                         |
                          +------------------+     +------------------+
                          |  DNS Server 1    |     |  DNS Server 2    |
                          |                  |     |                  |
                          | - PowerDNS       |     | - PowerDNS       |
                          | - GeoDNS         |     | - GeoDNS         |
                          +------------------+     +------------------+
                                                         |
                          +------------------+     +------------------+
                          |  Mail Server     |     |  CDN Edge 1      |
                          |                  |     |                  |
                          | - Postfix        |     | - NGINX Cache    |
                          | - Dovecot        |     | - Let's Encrypt  |
                          | - SpamAssassin   |     | - GeoDNS routed  |
                          +------------------+     +------------------+
```

### Cloud-Native Setup (Maximum Scale)

```
+---------------------------------------------------------------+
|                     Kubernetes Cluster                         |
|                                                                |
|  Control Plane:                                                |
|  +------------------+  +------------------+  +-------------+  |
|  | API Pods (HPA)   |  | Dashboard Pods   |  | Worker Pods |  |
|  | (Auto-scaling)   |  | (Next.js SSR)    |  | (Queue      |  |
|  |                  |  |                  |  |  consumers) |  |
|  +------------------+  +------------------+  +-------------+  |
|                                                                |
|  Data Plane:                                                   |
|  +------------------+  +------------------+  +-------------+  |
|  | PostgreSQL       |  | Redis Cluster    |  | RabbitMQ    |  |
|  | (Cloud SQL /     |  | (ElastiCache /   |  | (CloudAMQP /|  |
|  |  RDS)            |  |  Memorystore)    |  |  managed)   |  |
|  +------------------+  +------------------+  +-------------+  |
+---------------------------------------------------------------+
          |
          | gRPC over mTLS
          v
+---------------------------------------------------------------+
|  Bare Metal / VM Hosting Servers (not in K8s)                 |
|  [Server 1] [Server 2] [Server 3] ... [Server N]             |
|  Each running: CloudLinux + Agent + NGINX + PHP + MariaDB     |
+---------------------------------------------------------------+
```

---

## 10. Build vs Buy Decision Matrix

### For a Nepal-based Hosting Startup

| Approach | Time to Market | Cost (Year 1) | Differentiation | Recommended? |
|----------|---------------|----------------|-----------------|-------------|
| **Use Enhance + Custom Frontend** | 3-4 months | $2-5K (licensing) + dev | Medium | YES - Best balance |
| **Fork HestiaCP + Custom UI** | 6-9 months | $0 (open source) + dev | High | YES - If you have strong devs |
| **CyberPanel + Customization** | 2-3 months | $0-500 + dev | Low-Medium | For WordPress-only hosting |
| **Build 100% Custom** | 12-18 months | $0 + heavy dev | Maximum | Only if VC-funded |
| **Resell cPanel/WHM** | 1 month | $45/mo per server | None | Quickest but no moat |

### Recommended Phased Approach

```
Phase 1 (Months 1-3): Foundation
  - Set up CloudLinux servers
  - Deploy CyberPanel or HestiaCP as base
  - Build custom Next.js dashboard (basic: site list, login)
  - Implement JWT auth + user management API
  - Basic WordPress install via WP-CLI API

Phase 2 (Months 3-6): Core Site Tools
  - File Manager (embed FileBrowser)
  - SSL Manager (Certbot API wrapper)
  - Backup system (rsync + B2)
  - MySQL Manager (phpMyAdmin embed or custom)
  - FTP account management

Phase 3 (Months 6-9): Advanced Features
  - WordPress staging (rsync + mysqldump + search-replace)
  - Auto-updates with rollback
  - 3-layer caching (NGINX + Redis + Varnish/LSCache)
  - CDN integration (Cloudflare API)
  - Security scanner (ClamAV integration)

Phase 4 (Months 9-12): Scale & Polish
  - Server agent (Go) for multi-server management
  - gRPC communication layer
  - Migration tool
  - Monitoring dashboard (Grafana embed or custom)
  - WHMCS/billing integration
  - White-label capabilities

Phase 5 (Months 12+): Differentiation
  - Custom CDN with Nepal edge nodes
  - AI-powered recommendations
  - One-click WordPress optimization
  - Automated performance audits
  - Nepal-specific payment gateway integration
```

---

## Summary

Building a SiteGround-like platform is achievable but requires careful architectural planning. The key insights are:

1. **SiteGround's approach** - They built everything custom with a site-centric model, JWT auth, RESTful APIs, and deep integration with their infrastructure (SuperCacher 3-layer caching, custom PHP, Google Cloud).

2. **Server agents are the backbone** - A lightweight Go agent on each server, communicating via gRPC over mTLS, is the industry-standard pattern for hosting platforms.

3. **CloudLinux is essential** for shared hosting - LVE for resource limits, CageFS for file isolation, PHP Selector for per-user PHP versions, MySQL Governor for database throttling.

4. **Do not build from scratch initially** - Start with an existing panel (Enhance, HestiaCP, or CyberPanel) as the server-side engine, and build your custom React dashboard on top. Replace components as you grow.

5. **WP-CLI is the key** to WordPress automation - Install, update, staging, migration, search-replace, plugin management - all automatable via WP-CLI commands wrapped in your API.

6. **Every feature is an API endpoint** backed by a server agent command. The dashboard is just a pretty frontend for API calls that trigger agent operations.
