# Dedicated Server Hosting Platform Architecture
# 100% Automation + IPAM + SSL at Scale

## Complete Reference Architecture for Hosting Nepal

---

## TABLE OF CONTENTS

1. [Platform Overview](#1-platform-overview)
2. [Dedicated Server Automation](#2-dedicated-server-automation)
3. [IP Address Management (IPAM)](#3-ip-address-management-ipam)
4. [SSL Automation at Scale](#4-ssl-automation-at-scale)
5. [DNS Automation at Scale](#5-dns-automation-at-scale)
6. [Firewall Automation](#6-firewall-automation)
7. [Complete Integration Architecture](#7-complete-integration-architecture)
8. [Implementation Roadmap](#8-implementation-roadmap)

---

## 1. PLATFORM OVERVIEW

### High-Level Architecture

```
Customer Purchase (WHMCS)
         |
         v
+------------------+     +------------------+     +------------------+
|  Billing Layer   |---->| Provisioning     |---->| Infrastructure   |
|  WHMCS/HostBill  |     | Orchestrator     |     | Layer            |
+------------------+     +------------------+     +------------------+
                                |
                    +-----------+-----------+
                    |           |           |
                    v           v           v
              +---------+ +---------+ +---------+
              | Server  | | Network | | Storage |
              | Mgmt    | | Mgmt   | | Mgmt    |
              | (IPMI)  | | (Switch)| | (RAID)  |
              +---------+ +---------+ +---------+
                    |           |           |
                    v           v           v
              +---------+ +---------+ +---------+
              | NetBox  | | PowerDNS| | SSL/TLS |
              | (DCIM + | | (DNS)   | | (ACME)  |
              | IPAM)   | |         | |         |
              +---------+ +---------+ +---------+
```

### Core Technology Stack

| Layer               | Technology                              |
|---------------------|-----------------------------------------|
| Billing/Client      | WHMCS + SynergyCP                       |
| Bare Metal Mgmt     | MAAS or Foreman or Tinkerbell           |
| DCIM + IPAM         | NetBox                                  |
| DNS (Authoritative) | PowerDNS                                |
| SSL/TLS             | acme.sh + Let's Encrypt                 |
| Configuration Mgmt  | Ansible + Cloud-Init                    |
| Firewall            | nftables + Fail2Ban + Cloudflare        |
| OS Installation     | PXE + Kickstart/Preseed/Autoinstall     |
| Monitoring          | Prometheus + Grafana                    |
| Orchestration       | Custom API (Python/Go) or SynergyCP     |

---

## 2. DEDICATED SERVER AUTOMATION

### 2.1 How Major Providers Auto-Provision Servers

The provisioning flow used by providers like Hetzner, OVH, and Contabo follows this pattern:

```
Customer Order --> Inventory Check --> Server Assignment --> IPMI Power On
     --> PXE Boot --> OS Install (Kickstart/Preseed) --> Network Config
     --> IP Assignment --> DNS Setup --> Customer Notification
```

The entire flow takes 5-30 minutes depending on OS and configuration.

### 2.2 IPMI/BMC for Remote Server Management

**What it is:** IPMI (Intelligent Platform Management Interface) provides out-of-band
management capabilities independent of the server's OS. Modern servers use Redfish API
as the successor to IPMI.

**Capabilities:**
- Remote power on/off/reset
- KVM-over-IP (remote console access)
- Hardware sensor monitoring (temperature, fan speed, voltage)
- Boot device selection (PXE, disk, USB)
- Serial-over-LAN (SOL)
- Virtual media mounting (ISO images)
- Firmware updates

**Security Best Practices:**
- ALWAYS place BMC/IPMI on an isolated management VLAN (never on public internet)
- Change all default credentials immediately
- Use Redfish over IPMI where available (better security, REST API)
- Enable TLS for all BMC web interfaces
- Implement certificate-based authentication where supported

**Common IPMI Tools:**
```bash
# ipmitool examples
ipmitool -I lanplus -H <bmc-ip> -U admin -P password power on
ipmitool -I lanplus -H <bmc-ip> -U admin -P password power off
ipmitool -I lanplus -H <bmc-ip> -U admin -P password power status
ipmitool -I lanplus -H <bmc-ip> -U admin -P password chassis bootdev pxe
ipmitool -I lanplus -H <bmc-ip> -U admin -P password sol activate

# Redfish API example
curl -k -u admin:password https://<bmc-ip>/redfish/v1/Systems/1/Actions/ComputerSystem.Reset \
  -X POST -H "Content-Type: application/json" \
  -d '{"ResetType": "On"}'
```

### 2.3 PXE Boot for OS Installation Automation

**Architecture:**
```
Server (BIOS/UEFI PXE) --> DHCP Server (next-server + filename)
     --> TFTP Server (boot loader: pxelinux.0 / grubx64.efi)
     --> HTTP Server (kernel + initrd + kickstart/preseed file)
     --> OS Installation begins automatically
```

**Required Infrastructure:**
1. **DHCP Server** - Provides IP and points to TFTP/PXE server
2. **TFTP Server** - Serves boot loaders (pxelinux.0, grubx64.efi, iPXE)
3. **HTTP Server** - Serves OS images, kickstart/preseed files, cloud-init configs
4. **NFS/HTTP Mirror** - Local OS package repository for fast installs

### 2.4 OS Installation Methods

#### Kickstart (RHEL/CentOS/Rocky/AlmaLinux)
```kickstart
# Example kickstart file for dedicated server
install
url --url="http://pxe-server/centos/9/"
lang en_US.UTF-8
keyboard us
network --bootproto=static --ip=203.0.113.50 --netmask=255.255.255.0 \
        --gateway=203.0.113.1 --nameserver=8.8.8.8
rootpw --iscrypted $6$rounds=4096$...
firewall --enabled --ssh
authconfig --enableshadow --passalgo=sha512
selinux --enforcing
timezone Asia/Kathmandu --isUtc
bootloader --location=mbr

# RAID Configuration
part raid.01 --size=500 --ondisk=sda
part raid.02 --size=500 --ondisk=sdb
raid /boot --level=1 --device=md0 raid.01 raid.02

part raid.11 --size=1 --grow --ondisk=sda
part raid.12 --size=1 --grow --ondisk=sdb
raid pv.01 --level=1 --device=md1 raid.11 raid.12

volgroup vg00 pv.01
logvol / --vgname=vg00 --size=50000 --name=root
logvol swap --vgname=vg00 --size=16000 --name=swap

%packages
@base
@core
openssh-server
cloud-init
%end

%post
# Post-install automation
curl -o /tmp/setup.sh http://pxe-server/scripts/post-install.sh
bash /tmp/setup.sh
%end
```

#### Preseed (Debian/Ubuntu Legacy)
```preseed
d-i debian-installer/locale string en_US.UTF-8
d-i netcfg/choose_interface select auto
d-i netcfg/get_hostname string server01
d-i partman-auto/method string raid
d-i partman-auto-raid/recipe string 1 2 0 ext4 / /dev/sda1#/dev/sdb1
d-i pkgsel/include string openssh-server cloud-init
d-i preseed/late_command string \
  in-target curl -o /tmp/setup.sh http://pxe-server/scripts/post-install.sh; \
  in-target bash /tmp/setup.sh
```

#### Ubuntu Autoinstall (Cloud-Init Based, Modern)
```yaml
#cloud-config
autoinstall:
  version: 1
  locale: en_US.UTF-8
  keyboard:
    layout: us
  network:
    ethernets:
      ens3:
        addresses: [203.0.113.50/24]
        gateway4: 203.0.113.1
        nameservers:
          addresses: [8.8.8.8, 8.8.4.4]
  storage:
    config:
      - {type: disk, id: disk0, ptable: gpt, path: /dev/sda}
      - {type: disk, id: disk1, ptable: gpt, path: /dev/sdb}
      - {type: raid, id: md0, raidlevel: 1, devices: [disk0, disk1]}
      - {type: partition, id: part1, device: md0, size: -1}
      - {type: format, id: fs1, volume: part1, fstype: ext4}
      - {type: mount, id: mount1, device: fs1, path: /}
  identity:
    hostname: server01
    password: "$6$rounds=4096$..."
  ssh:
    install-server: true
    authorized-keys:
      - ssh-rsa AAAA...
  late-commands:
    - curtin in-target -- bash -c 'curl http://pxe-server/scripts/post-install.sh | bash'
```

### 2.5 Bare Metal Provisioning Platforms

#### Option A: MAAS (Metal as a Service) by Canonical
**Best for:** Ubuntu-centric environments, cloud-like provisioning

**Architecture:**
```
                    +-------------------+
                    |  Region Controller|
                    |  (PostgreSQL,     |
                    |   REST API,       |
                    |   Web UI)         |
                    +--------+----------+
                             |
              +--------------+--------------+
              |                             |
     +--------+--------+          +--------+--------+
     | Rack Controller  |          | Rack Controller  |
     | (DHCP, TFTP,     |          | (DHCP, TFTP,     |
     |  DNS, PXE, HTTP) |          |  DNS, PXE, HTTP) |
     +--------+---------+          +--------+---------+
              |                             |
     +--------+--------+          +--------+--------+
     | Physical Servers |          | Physical Servers |
     | (BMC/IPMI)       |          | (BMC/IPMI)       |
     +------------------+          +------------------+
```

**Key capabilities:**
- Automatic hardware discovery and inventory
- API-driven provisioning (REST API)
- Supports IPMI, Redfish, and vendor-specific BMCs
- Integrated DHCP, DNS, and NTP
- Under-120-second provisioning achievable
- Supports Ubuntu, CentOS, RHEL, Windows, ESXi
- Role-based access control
- Machine lifecycle: New -> Commissioning -> Ready -> Deployed -> Released

**MAAS API Example:**
```bash
# List all machines
maas admin machines read

# Commission a machine
maas admin machine commission <system-id>

# Deploy Ubuntu on a machine
maas admin machine deploy <system-id> distro_series=jammy

# Release a machine (return to pool)
maas admin machine release <system-id>
```

#### Option B: Foreman + Puppet
**Best for:** Multi-OS environments, full lifecycle management

**Key capabilities:**
- Provisioning via PXE + Kickstart/Preseed templates
- Deep Puppet/Ansible integration for post-install config
- Host discovery (boot unknown hardware, register automatically)
- ERB-based templating for OS installation recipes
- Supports bare metal, VMware, EC2, OpenStack, oVirt, Libvirt
- Puppet CA integration for automatic cert signing
- Puppet ENC (External Node Classifier)

**Provisioning workflow:**
```
1. Hardware boots via PXE
2. Foreman's DHCP assigns IP, points to TFTP
3. TFTP serves boot loader
4. Boot loader loads kernel + initrd
5. Installer fetches Kickstart/Preseed from Foreman (ERB-rendered)
6. OS installs with RAID, networking, packages
7. Post-install script registers with Puppet master
8. Puppet applies configuration (users, services, security)
9. Foreman marks host as "built"
```

#### Option C: Tinkerbell (by Equinix Metal)
**Best for:** Cloud-native, Kubernetes-native bare metal

**Components:**
- **Smee** - DHCP server
- **Tootles** - Metadata service
- **HookOS** - In-memory OS installation environment (LinuxKit-based)
- **Tink Server** - Workflow engine (API + state management)
- **Tink Worker** - Runs on target hardware, executes workflow actions
- **Rufio** - BMC management (power on/off via Redfish/IPMI)
- **PBnJ** - Power and boot management

**Key capabilities:**
- Declarative, API-driven (Kubernetes-style CRDs)
- Workflow-based provisioning (define steps as actions)
- Supports ESXi, RHEL, Windows Server, Ubuntu, Flatcar, NixOS, and more
- CNCF Sandbox project
- Used by Equinix Metal to provision thousands of servers daily
- Action images built in 90 seconds (via Hook)

#### Option D: SynergyCP (Commercial, Purpose-Built for Hosting)
**Best for:** Hosting providers who want turnkey solution with WHMCS

**Key capabilities:**
- Full WHMCS integration (order -> provision -> suspend -> terminate)
- PXE-based OS reloads with custom profiles
- IPMI power management and KVM console
- Client self-service panel (power, reboot, OS reload, rDNS)
- Switch/VLAN management (Brocade, Cisco, etc.)
- Custom shell scripts in OS reload profiles
- APC PDU support
- Automatic IP assignment
- License key activation and protection

### 2.6 Hardware Inventory Management

**NetBox as Source of Truth:**
```
Region (Asia)
  └── Site (Kathmandu DC)
       └── Location (Hall A)
            └── Rack (Row-1-Rack-3)
                 ├── Device: Dell R740xd (U1-U2)
                 │    ├── Serial: ABC123
                 │    ├── BMC IP: 10.0.1.50
                 │    ├── Interfaces: eno1 (203.0.113.50), eno2 (10.0.2.50)
                 │    ├── Power: PDU-A Port 5, PDU-B Port 5
                 │    └── Status: Active / Customer: Client-XYZ
                 ├── Device: Dell R740xd (U3-U4)
                 └── ...
```

### 2.7 Automated RAID Configuration

RAID is configured during OS installation via Kickstart/Preseed/Autoinstall:

| RAID Level | Use Case | Drives | Capacity |
|------------|----------|--------|----------|
| RAID 0     | Maximum performance (no redundancy) | 2+ | Sum of all drives |
| RAID 1     | OS drive mirroring | 2 | Half of total |
| RAID 5     | Balanced performance + redundancy | 3+ | (n-1) x drive size |
| RAID 10    | High performance + redundancy | 4+ | Half of total |

For hardware RAID (Dell PERC, HP SmartArray), use vendor tools:
```bash
# Dell PERC (perccli)
perccli /c0 add vd type=raid1 drives=252:0,252:1

# HP SmartArray (ssacli)
ssacli ctrl slot=0 create type=ld drives=1I:1:1,1I:1:2 raid=1
```

For software RAID, configure via mdadm in Kickstart/Preseed (see examples above).

---

## 3. IP ADDRESS MANAGEMENT (IPAM)

### 3.1 Recommended Tool: NetBox (DCIM + IPAM Combined)

**Why NetBox over phpIPAM for hosting providers:**

| Feature | NetBox | phpIPAM |
|---------|--------|---------|
| DCIM (rack/device tracking) | Full built-in | Limited |
| API quality | Extensive REST API | Basic REST API |
| Scalability | Mid-to-large scale | Small-to-mid |
| Backend | Python/PostgreSQL | PHP/MySQL |
| Network scanning | No (use external tools) | Built-in |
| Community | Very large, DigitalOcean-backed | Moderate |
| Extensibility | Plugin system | Limited |
| Webhooks | Built-in | No |
| Config templates | Jinja2 rendering | No |

**Verdict:** Use **NetBox** as the primary DCIM+IPAM for a hosting platform.
phpIPAM is simpler for pure IP management but lacks the device/rack/cabling
tracking that hosting providers need.

### 3.2 IPv4 Pool Management

**Hierarchy in NetBox:**
```
RIR (RIPE NCC / APNIC)
  └── Aggregate: 203.0.113.0/24 (your allocated block)
       └── Prefix: 203.0.113.0/28 (Dedicated Servers - Rack 1)
       │    ├── IP: 203.0.113.1/32 (Gateway)
       │    ├── IP: 203.0.113.2/32 (Assigned to Customer A - Server 1)
       │    ├── IP: 203.0.113.3/32 (Assigned to Customer B - Server 2)
       │    └── IP: 203.0.113.4/32 (Available)
       └── Prefix: 203.0.113.16/28 (VPS Pool)
            ├── IP: 203.0.113.17/32 (VPS-001)
            └── ...
```

**IP Lifecycle States:**
- **Active** - Assigned and in use
- **Reserved** - Held for specific purpose (gateways, DNS, etc.)
- **Deprecated** - Scheduled for removal
- **DHCP** - Assigned via DHCP pool
- **SLAAC** - IPv6 auto-configured

**Automation via NetBox API:**
```python
import pynetbox

nb = pynetbox.api('https://netbox.example.com', token='your-token')

# Find next available IP in a prefix
prefix = nb.ipam.prefixes.get(prefix='203.0.113.0/28')
next_ip = prefix.available_ips.create({
    'description': 'Customer A - Dedicated Server',
    'status': 'active',
    'tenant': tenant_id,
    'dns_name': 'server1.customer-a.example.com'
})

# Release an IP
ip = nb.ipam.ip_addresses.get(address='203.0.113.5/32')
ip.status = 'deprecated'
ip.save()
```

### 3.3 IPv6 Subnet Management

**Allocation Strategy:**
```
Your IPv6 Allocation: 2001:db8::/32 (from RIR)
  └── /48 per customer (65,536 /64 subnets per customer)
       └── /64 per service/VLAN
            └── Individual addresses (/128)
```

| Customer Type | IPv6 Allocation | Addresses Available |
|---------------|-----------------|---------------------|
| Dedicated Server | /64 (default) or /48 (on request) | 18.4 quintillion per /64 |
| VPS | /64 per VPS | 18.4 quintillion |
| Colocation | /48 per cage/rack | 65,536 x /64 subnets |

### 3.4 Automated PTR/rDNS Record Management

**Architecture:**
```
NetBox (IPAM)                    PowerDNS
    |                                |
    | Webhook on IP create/update    |
    v                                |
Custom Middleware/Script  ---------> PowerDNS API
    |                                |
    | Creates PTR record:            |
    | 50.113.0.203.in-addr.arpa      |
    | -> server1.example.com         |
    +--------------------------------+
```

**Implementation approaches:**

1. **PowerDNS LUA Records (Wildcard PTR)** - For default hostnames:
   ```lua
   -- Single wildcard record generates PTR for entire /24
   -- 50.113.0.203.in-addr.arpa -> 203-0-113-50.ptr.example.com
   ```

2. **NetBox Webhook + PowerDNS API** - For custom hostnames:
   ```python
   # When IP is assigned in NetBox, webhook triggers:
   def create_ptr_record(ip_address, hostname):
       # Convert IP to reverse zone format
       reverse_name = ip_to_ptr(ip_address)  # e.g., 50.113.0.203.in-addr.arpa

       # Create PTR via PowerDNS API
       requests.patch(
           f'http://powerdns:8081/api/v1/servers/localhost/zones/{reverse_zone}',
           headers={'X-API-Key': 'your-api-key'},
           json={
               'rrsets': [{
                   'name': f'{reverse_name}.',
                   'type': 'PTR',
                   'ttl': 3600,
                   'changetype': 'REPLACE',
                   'records': [{'content': f'{hostname}.', 'disabled': False}]
               }]
           }
       )
   ```

3. **phpIPAM + PowerDNS** - phpIPAM has native PowerDNS integration with
   auto-PTR creation option per subnet.

### 3.5 IP Allocation Strategies

| Service Type | Strategy | Details |
|-------------|----------|---------|
| Dedicated Server | Static /32 from prefix pool | 1 primary IP + additional IPs on request |
| VPS/VDS | Static /32 from VPS prefix | Drawn from separate prefix pool |
| Shared Hosting | Shared IP (SNI-based) | Multiple domains per IP |
| CDN/Load Balancer | Anycast IPs | Same IP announced from multiple locations |

### 3.6 How to Obtain IP Blocks

**Regional Internet Registries (RIRs):**

| RIR | Region | Current IPv4 Policy |
|-----|--------|---------------------|
| RIPE NCC | Europe, Middle East, Central Asia | Max /24 per LIR (exhausted pool) |
| ARIN | North America | Waitlist-based, 12-18+ month wait |
| APNIC | Asia Pacific | Small allocations from last /8 |
| LACNIC | Latin America | Limited allocations |
| AFRINIC | Africa | Some availability remaining |

**Obtaining IPv4 in practice (2025+):**

1. **Become an LIR** (Local Internet Registry) - Apply to RIPE/APNIC (for Nepal: APNIC)
   - Cost: ~$1,500-2,500/year membership + per-allocation fees
   - Receive initial /24 (256 IPs) from remaining pool

2. **Secondary market** - Purchase IP blocks from brokers
   - Prices: $40-60 per IPv4 address (2025 market rate)
   - Brokers: IPv4 Global, IPv4.deals, Prefix Broker, Hilco Streambank
   - RIPE transfers are easier than ARIN (less justification required)

3. **Lease from upstream providers** - Monthly cost per IP
   - Typical: $1-5/IP/month from transit providers
   - No ownership, but no upfront capital

4. **IPv6** - Freely available from RIRs
   - /32 allocation is standard for LIRs
   - Minimal cost, massive address space

**Post-acquisition checklist:**
- Configure RPKI (Route Origin Authorization)
- Create/update PeeringDB profile
- Check blacklist databases (Spamhaus, etc.)
- Verify MaxMind/IP2Location geolocation data
- Announce via BGP from your ASN

---

## 4. SSL AUTOMATION AT SCALE

### 4.1 Let's Encrypt with ACME Protocol

**How it works:**
```
1. ACME Client (acme.sh) --> Let's Encrypt API: "I want cert for example.com"
2. Let's Encrypt --> Client: "Prove you control example.com" (challenge)
3. Client places proof:
   - HTTP-01: file at http://example.com/.well-known/acme-challenge/TOKEN
   - DNS-01: TXT record _acme-challenge.example.com = TOKEN
4. Let's Encrypt verifies challenge from multiple vantage points
5. Let's Encrypt --> Client: Signed certificate (valid 90 days)
```

### 4.2 Challenge Types for Hosting Providers

| Challenge | Best For | Wildcard Support | Requires |
|-----------|----------|-----------------|----------|
| HTTP-01 | Shared hosting, single domains | No | Web server on port 80 |
| DNS-01 | Wildcard certs, servers without port 80 | Yes | DNS API access |
| TLS-ALPN-01 | TLS-terminating reverse proxies | No | Port 443 control |

**Recommendation for hosting providers:**
- Use **HTTP-01** for standard domain certificates (simplest)
- Use **DNS-01** for wildcard certificates and domains not yet pointed to your servers
- Implement both for maximum flexibility

### 4.3 ACME Client Comparison

| Feature | certbot | acme.sh | Caddy |
|---------|---------|---------|-------|
| Language | Python | Shell script | Go |
| DNS plugins | ~20 providers | 150+ DNS APIs | Built-in |
| Wildcard | Yes (DNS-01) | Yes (DNS-01) | Yes (DNS-01) |
| Auto-renewal | systemd timer | cron job | Built-in |
| Hosting scale | Good | Excellent | Good (as web server) |
| Disk footprint | ~50MB | ~1MB | ~40MB |
| Root required | Usually | No | No (>1024 ports) |

**Recommendation:** Use **acme.sh** for hosting provider automation.

### 4.4 SSL Architecture for a Hosting Platform

```
                    +---------------------------+
                    |   SSL Certificate Store   |
                    |   (HashiCorp Vault or     |
                    |    filesystem + DB)       |
                    +---------------------------+
                              |
              +---------------+---------------+
              |               |               |
              v               v               v
         +---------+    +---------+    +---------+
         | acme.sh |    | acme.sh |    | acme.sh |
         | Node 1  |    | Node 2  |    | Node 3  |
         +---------+    +---------+    +---------+
              |               |               |
              v               v               v
         +---------+    +---------+    +---------+
         | Nginx   |    | Nginx   |    | Nginx   |
         | (SNI)   |    | (SNI)   |    | (SNI)   |
         +---------+    +---------+    +---------+
```

### 4.5 Scaling SSL Certificate Issuance

**Let's Encrypt Rate Limits (2025):**
| Limit | Value | Notes |
|-------|-------|-------|
| Certificates per Registered Domain | 50/week | Renewals don't count |
| Names per Certificate | 100 | Combine domains to save quota |
| New Orders per Account | 300/3 hours | Refills at 1 per 36 seconds |
| Failed Authorizations | 5/hour/identifier | Refills at 1 per 12 minutes |
| Duplicate Certificates | 5/week | Exact same set of names |
| Accounts per IP | 10/3 hours | Use different IPs if needed |

**Strategies for high-volume hosting:**

1. **Request higher rate limits** - Let's Encrypt has a form for hosting providers
   to request increased limits. Takes a few weeks to process.

2. **Use wildcard certificates** where possible:
   ```bash
   # Issue wildcard cert via DNS-01
   acme.sh --issue -d '*.example.com' -d 'example.com' \
     --dns dns_pdns \
     --dnssleep 30
   ```

3. **Bundle multiple domains per certificate** (up to 100 SANs):
   ```bash
   acme.sh --issue \
     -d domain1.com -d www.domain1.com \
     -d domain2.com -d www.domain2.com \
     -d domain3.com -d www.domain3.com \
     --webroot /var/www/html
   ```

4. **Distribute across multiple ACME accounts** to parallelize

5. **Use staging environment for testing** (much higher limits)

### 4.6 Wildcard SSL Automation

```bash
# Using acme.sh with PowerDNS API for wildcard certs
export PDNS_Url="http://powerdns:8081"
export PDNS_ServerId="localhost"
export PDNS_Token="your-api-key"

acme.sh --issue \
  -d '*.example.com' \
  -d 'example.com' \
  --dns dns_pdns \
  --keylength ec-256

# Auto-renewal is handled by cron (acme.sh installs this automatically)
# Certificates renew at 60 days (30 days before expiry)
```

### 4.7 SSL Certificate Monitoring

**Monitoring checklist:**
```yaml
# Prometheus blackbox exporter config for SSL monitoring
modules:
  tls_connect:
    prober: tcp
    tls: true
    tls_config:
      insecure_skip_verify: false
    tcp:
      tls: true

# Alert rule: certificate expiring in < 14 days
- alert: SSLCertExpiringSoon
  expr: probe_ssl_earliest_cert_expiry - time() < 86400 * 14
  for: 1h
  labels:
    severity: warning
  annotations:
    summary: "SSL cert for {{ $labels.instance }} expires in < 14 days"
```

### 4.8 How Large Hosts Handle SSL

Providers like SiteGround and Hostinger:
- Run centralized ACME automation services
- Use HTTP-01 for most domains (web server is already running)
- Use DNS-01 for wildcard certificates
- Store certs in centralized certificate stores
- Push certs to edge servers via configuration management
- Monitor expiry with alerting pipelines
- Have elevated rate limits from Let's Encrypt

### 4.9 Commercial SSL via API

For customers wanting EV/OV certificates:
- **Sectigo (Comodo)** - Reseller API available
- **DigiCert** - CertCentral API
- **GoGetSSL** - Reseller API with competitive pricing
- **ZeroSSL** - ACME-compatible alternative to Let's Encrypt

---

## 5. DNS AUTOMATION AT SCALE

### 5.1 PowerDNS as Primary DNS

**Why PowerDNS for hosting providers:**
- Scales to millions of domains per server
- Full REST API for zone and record management
- Supports MySQL, PostgreSQL, LMDB, SQLite backends
- DNSSEC with one-click signing
- Lua scripting for dynamic responses (GeoDNS, filtering)
- Lightning Stream for multi-DC replication (LMDB backend)

**Architecture:**
```
                  +-------------------+
                  |   PowerDNS API    |
                  |   (Port 8081)     |
                  +--------+----------+
                           |
              +------------+------------+
              |                         |
     +--------+--------+      +--------+--------+
     | PowerDNS Auth   |      | PowerDNS Auth   |
     | ns1.example.com |      | ns2.example.com |
     | (Primary)       |      | (Secondary)     |
     | Backend: LMDB   |      | Backend: LMDB   |
     +--------+--------+      +--------+--------+
              |                         |
              +--- Lightning Stream ----+
              (bi-directional replication)
```

### 5.2 Auto-Create DNS Zones on Domain Purchase

```python
# When customer purchases hosting, automatically create DNS zone
import requests

PDNS_API = "http://powerdns:8081/api/v1/servers/localhost"
HEADERS = {"X-API-Key": "your-api-key", "Content-Type": "application/json"}

def create_hosting_zone(domain, server_ip, mail_server):
    """Create a complete DNS zone with standard records."""

    zone_data = {
        "name": f"{domain}.",
        "kind": "Native",
        "nameservers": [
            "ns1.hostingnepal.com.",
            "ns2.hostingnepal.com."
        ],
        "rrsets": [
            # A record for domain
            {
                "name": f"{domain}.",
                "type": "A",
                "ttl": 3600,
                "records": [{"content": server_ip, "disabled": False}]
            },
            # A record for www
            {
                "name": f"www.{domain}.",
                "type": "A",
                "ttl": 3600,
                "records": [{"content": server_ip, "disabled": False}]
            },
            # AAAA record (IPv6)
            {
                "name": f"{domain}.",
                "type": "AAAA",
                "ttl": 3600,
                "records": [{"content": "2001:db8::1", "disabled": False}]
            },
            # MX record
            {
                "name": f"{domain}.",
                "type": "MX",
                "ttl": 3600,
                "records": [{"content": f"10 {mail_server}.", "disabled": False}]
            },
            # SPF record
            {
                "name": f"{domain}.",
                "type": "TXT",
                "ttl": 3600,
                "records": [{
                    "content": '"v=spf1 mx a ip4:' + server_ip + ' ~all"',
                    "disabled": False
                }]
            },
            # DMARC record
            {
                "name": f"_dmarc.{domain}.",
                "type": "TXT",
                "ttl": 3600,
                "records": [{
                    "content": '"v=DMARC1; p=quarantine; rua=mailto:dmarc@' + domain + '"',
                    "disabled": False
                }]
            },
            # DKIM placeholder (actual key added by mail server)
            {
                "name": f"default._domainkey.{domain}.",
                "type": "TXT",
                "ttl": 3600,
                "records": [{
                    "content": '"v=DKIM1; k=rsa; p=PLACEHOLDER"',
                    "disabled": False
                }]
            }
        ]
    }

    response = requests.post(
        f"{PDNS_API}/zones",
        headers=HEADERS,
        json=zone_data
    )
    return response.json()
```

### 5.3 DNS Cluster Synchronization

**Option A: PowerDNS Lightning Stream (Recommended)**
- LMDB-based bi-directional replication
- No zone transfers (AXFR/IXFR) needed
- Sub-second replication between data centers
- No single point of failure

**Option B: Native Replication via Database**
- Use MySQL/PostgreSQL replication
- PowerDNS reads from replicated database
- Slight delay but proven at scale

**Option C: Traditional AXFR/IXFR**
- Primary/Secondary model
- PowerDNS supports NOTIFY for instant updates
- Works with mixed DNS server environments

### 5.4 GeoDNS for Multi-Region Hosting

PowerDNS supports GeoDNS via Lua records:
```lua
-- Return closest server IP based on client location
function preresolve(dq)
    if dq.qname:equal(newDN("cdn.example.com")) then
        local location = dq:getEDNSSubnet()
        -- Logic to determine closest server
        -- Return appropriate A record
    end
end
```

### 5.5 Web UI Options

| Tool | Features | License |
|------|----------|---------|
| PowerDNS Admin | Open source, zone/record management, user RBAC | MIT |
| PDNS Console | Commercial, DNSSEC lifecycle, Dynamic DNS, multi-tenant | Commercial |
| Poweradmin | Open source, basic zone management, batch PTR | GPL |

---

## 6. FIREWALL AUTOMATION

### 6.1 Architecture Overview

```
                    +-------------------+
                    |  Cloudflare       |
                    |  (L7 DDoS, WAF)  |
                    +--------+----------+
                             |
                    +--------+----------+
                    |  Edge Router      |
                    |  (BGP Flowspec    |
                    |   for L3/L4 DDoS)|
                    +--------+----------+
                             |
              +--------------+--------------+
              |              |              |
     +--------+-----+  +----+-------+  +---+--------+
     | Host nftables |  | Host nftables| | Host nftables|
     | + Fail2Ban    |  | + Fail2Ban   | | + Fail2Ban   |
     | (Per-Server)  |  | (Per-Server) | | (Per-Server) |
     +--------------+   +--------------+ +--------------+
```

### 6.2 nftables Base Configuration (Per Server)

```nft
#!/usr/sbin/nft -f

table inet filter {
    # Fail2Ban set (populated dynamically)
    set f2b-sshd {
        type ipv4_addr
        flags timeout
    }

    chain input {
        type filter hook input priority filter; policy drop;

        # Allow established connections
        ct state established,related accept

        # Allow loopback
        iifname "lo" accept

        # Drop invalid packets
        ct state invalid drop

        # Rate limit ICMP
        ip protocol icmp limit rate 10/second accept

        # Fail2Ban SSH bans
        ip saddr @f2b-sshd drop

        # Allow SSH (rate limited)
        tcp dport 22 ct state new limit rate 10/minute accept

        # Allow HTTP/HTTPS
        tcp dport { 80, 443 } accept

        # Allow DNS
        tcp dport 53 accept
        udp dport 53 accept

        # Customer-specific rules inserted here via API
        # include "/etc/nftables.d/customer-*.nft"

        # Log and drop everything else
        log prefix "nftables-drop: " limit rate 5/minute
        drop
    }

    chain forward {
        type filter hook forward priority filter; policy drop;
    }

    chain output {
        type filter hook output priority filter; policy accept;
    }
}
```

### 6.3 Per-Customer Firewall Rules

```python
# Generate per-customer nftables rules
def generate_customer_firewall(customer_id, allowed_ports, blocked_ips):
    rules = f"""
# Customer {customer_id} firewall rules
# Auto-generated - do not edit manually

table inet customer_{customer_id} {{
    set blocked_ips {{
        type ipv4_addr
        elements = {{ {', '.join(blocked_ips)} }}
    }}

    chain input {{
        type filter hook input priority filter + 10; policy accept;

        # Block customer-specified IPs
        ip saddr @blocked_ips drop

        # Allow only customer-specified ports
        # tcp dport {{ {', '.join(str(p) for p in allowed_ports)} }} accept
    }}
}}
"""
    with open(f'/etc/nftables.d/customer-{customer_id}.nft', 'w') as f:
        f.write(rules)

    # Reload nftables
    os.system('nft -f /etc/nftables.conf')
```

### 6.4 DDoS Mitigation Strategy

| Layer | Attack Type | Mitigation |
|-------|-------------|------------|
| L3/L4 | Volumetric (UDP/TCP flood) | Upstream provider null-routing, BGP Flowspec |
| L4 | SYN flood | nftables synproxy, syncookies |
| L7 | HTTP flood | Cloudflare WAF, rate limiting |
| L7 | Slowloris | Nginx timeout tuning |
| Application | Brute force | Fail2Ban, CrowdSec |

**BGP Flowspec for volumetric DDoS:**
```
# Announce flowspec rule to upstream to drop attack traffic
# before it reaches your network
route-policy DDoS-Mitigation
  if destination in (203.0.113.50/32) then
    set flowspec match source-port eq 0-65535
    set flowspec match protocol udp
    set flowspec action discard
  endif
end
```

### 6.5 Fail2Ban Configuration for Hosting

```ini
# /etc/fail2ban/jail.local
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
banaction = nftables-multiport
backend = systemd

[sshd]
enabled = true
port = ssh
filter = sshd
maxretry = 3

[nginx-http-auth]
enabled = true
port = http,https
filter = nginx-http-auth

[postfix-sasl]
enabled = true
port = smtp,465,587,imap,993
filter = postfix[mode=auth]

[dovecot]
enabled = true
port = pop3,pop3s,imap,imaps,submission,465,sieve
filter = dovecot

# Custom: Block aggressive scanners
[nginx-botsearch]
enabled = true
port = http,https
filter = nginx-botsearch
maxretry = 2
```

### 6.6 Cloudflare API Integration

```python
import CloudFlare

cf = CloudFlare.CloudFlare(token='your-api-token')

# Create firewall rule for a customer's domain
def block_country(zone_id, country_code):
    cf.zones.firewall.rules.post(zone_id, data=[{
        'filter': {
            'expression': f'ip.geoip.country eq "{country_code}"',
            'paused': False
        },
        'action': 'block',
        'description': f'Block traffic from {country_code}'
    }])

# Rate limit an endpoint
def add_rate_limit(zone_id, url_pattern, threshold):
    cf.zones.rate_limits.post(zone_id, data={
        'threshold': threshold,
        'period': 60,
        'match': {
            'request': {'url_pattern': url_pattern}
        },
        'action': {
            'mode': 'ban',
            'timeout': 3600
        }
    })
```

---

## 7. COMPLETE INTEGRATION ARCHITECTURE

### 7.1 End-to-End Provisioning Flow

```
CUSTOMER ORDERS DEDICATED SERVER
         |
         v
[1] WHMCS receives order, payment confirmed
         |
         v
[2] WHMCS webhook --> Provisioning API
         |
         v
[3] Provisioning API queries NetBox:
    - Find available server matching specs (CPU, RAM, Disk)
    - Allocate next available IP from prefix pool
    - Update server status: Available --> Provisioning
         |
         v
[4] Provisioning API triggers bare metal automation (MAAS/Foreman):
    - Set boot device to PXE via IPMI
    - Power on server via IPMI
    - PXE boots, loads OS installer
    - Kickstart/Preseed configures: OS, RAID, network, SSH keys
         |
         v
[5] Post-install script runs:
    - Configure static IP (from NetBox allocation)
    - Set hostname
    - Install monitoring agent (Prometheus node_exporter)
    - Configure nftables base rules
    - Install Fail2Ban
    - Set up SSH keys (disable password auth)
         |
         v
[6] DNS automation:
    - PowerDNS API: Create PTR record for assigned IP
    - PowerDNS API: Create A record (server.customer.hostingnepal.com)
         |
         v
[7] SSL automation:
    - acme.sh: Issue certificate for server hostname
    - Deploy cert to web server
         |
         v
[8] NetBox update:
    - Server status: Provisioning --> Active
    - IP status: Available --> Active
    - Assign tenant (customer)
    - Record serial number, BMC IP, installed OS
         |
         v
[9] WHMCS notification:
    - Email customer: server IP, hostname, credentials
    - Update product status: Active
    - Start billing cycle
```

### 7.2 System Integration Diagram

```
+------------------------------------------------------------------+
|                         CUSTOMER LAYER                            |
|  +------------+  +-------------+  +----------------------------+ |
|  | WHMCS      |  | Client Panel|  | API (REST)                 | |
|  | (Billing)  |  | (SynergyCP) |  | (Custom or SynergyCP API) | |
|  +-----+------+  +------+------+  +-------------+--------------+ |
|        |                |                        |                |
+--------+----------------+------------------------+----------------+
         |                |                        |
         v                v                        v
+------------------------------------------------------------------+
|                    ORCHESTRATION LAYER                            |
|  +-----------------------------------------------------------+  |
|  |              Provisioning Orchestrator                     |  |
|  |  (Custom Python/Go service or SynergyCP)                  |  |
|  |  - Receives orders from WHMCS                             |  |
|  |  - Coordinates all subsystems                             |  |
|  |  - Manages provisioning state machine                     |  |
|  +-----------------------------------------------------------+  |
+------------------------------------------------------------------+
         |          |          |          |          |
         v          v          v          v          v
+----------+ +----------+ +----------+ +--------+ +----------+
| NetBox   | | MAAS/    | | PowerDNS | | acme.sh| | nftables |
| (DCIM +  | | Foreman  | | (DNS)    | | (SSL)  | | Fail2Ban |
| IPAM)    | | (Bare    | |          | |        | | (FW)     |
|          | |  Metal)  | |          | |        | |          |
| - Racks  | | - PXE    | | - Zones  | | - Cert | | - Rules  |
| - Devices| | - IPMI   | | - Records| |  issue | | - Bans   |
| - IPs    | | - OS     | | - PTR    | | - Renew| | - DDoS   |
| - VLANs  | |  Install | | - DNSSEC | | - Store| |          |
+----------+ +----------+ +----------+ +--------+ +----------+
         |          |          |          |          |
         v          v          v          v          v
+------------------------------------------------------------------+
|                    INFRASTRUCTURE LAYER                           |
|  +----------+  +----------+  +----------+  +------------------+ |
|  | Physical  |  | Network  |  | Storage  |  | Power (PDU)      | |
|  | Servers   |  | Switches |  | (SAN/DAS)|  | UPS              | |
|  | (BMC/IPMI)|  | (VLANs)  |  |          |  |                  | |
|  +----------+  +----------+  +----------+  +------------------+ |
+------------------------------------------------------------------+
```

### 7.3 Database/State Management

| System | Database | Purpose |
|--------|----------|---------|
| WHMCS | MySQL | Billing, customers, orders, products |
| NetBox | PostgreSQL | DCIM, IPAM, device inventory |
| PowerDNS | MySQL/PostgreSQL/LMDB | DNS zones and records |
| MAAS | PostgreSQL | Machine state, commissioning data |
| Foreman | PostgreSQL | Host data, provisioning templates |
| Fail2Ban | SQLite (local) | Ban history |
| acme.sh | Filesystem | Certificates, keys, account data |

### 7.4 API Integration Map

```
WHMCS ----webhook----> Orchestrator
Orchestrator --REST--> NetBox (allocate IP, update device)
Orchestrator --REST--> MAAS API (deploy machine)
Orchestrator --REST--> PowerDNS API (create zone, PTR)
Orchestrator --SSH---> Target Server (post-install config)
Orchestrator --shell-> acme.sh (issue certificate)
Orchestrator --REST--> WHMCS API (update order status)
NetBox -----webhook--> PowerDNS (auto PTR on IP change)
Monitoring --alert---> Orchestrator (hardware failure)
```

---

## 8. IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Month 1-2)
- [ ] Set up NetBox instance (DCIM + IPAM)
- [ ] Register all existing hardware in NetBox (racks, devices, IPs)
- [ ] Deploy PowerDNS (authoritative) with API enabled
- [ ] Set up PXE boot infrastructure (DHCP + TFTP + HTTP)
- [ ] Create Kickstart/Preseed templates for each supported OS
- [ ] Obtain IP address blocks (apply to APNIC as LIR or lease from upstream)

### Phase 2: Bare Metal Automation (Month 2-3)
- [ ] Deploy MAAS or Foreman (choose one based on your OS preference)
- [ ] Configure IPMI/BMC access for all servers
- [ ] Test automated OS installation for: Ubuntu, Rocky Linux, Debian
- [ ] Implement automated RAID configuration
- [ ] Build post-install scripts (SSH hardening, monitoring agent, base config)
- [ ] Integrate NetBox with MAAS/Foreman for inventory sync

### Phase 3: DNS + SSL Automation (Month 3-4)
- [ ] Integrate PowerDNS with NetBox (webhook-based PTR automation)
- [ ] Build zone creation API (auto-create zones with standard records)
- [ ] Deploy acme.sh on all web-serving nodes
- [ ] Implement SSL issuance pipeline (HTTP-01 + DNS-01)
- [ ] Set up SSL monitoring with Prometheus blackbox exporter
- [ ] Request elevated rate limits from Let's Encrypt

### Phase 4: Billing Integration (Month 4-5)
- [ ] Install WHMCS with SynergyCP module (or build custom integration)
- [ ] Build orchestration layer connecting WHMCS -> NetBox -> MAAS -> PowerDNS
- [ ] Implement automated provisioning workflow (order to server delivery)
- [ ] Build client self-service panel (power management, OS reload, rDNS)
- [ ] Test end-to-end: order -> payment -> provisioning -> delivery

### Phase 5: Security + Hardening (Month 5-6)
- [ ] Deploy nftables base configuration on all servers
- [ ] Configure Fail2Ban with nftables backend
- [ ] Implement per-customer firewall rules
- [ ] Set up Cloudflare integration for L7 protection
- [ ] Implement DDoS detection and mitigation procedures
- [ ] Security audit of all automation scripts and API endpoints

### Phase 6: Monitoring + Operations (Month 6+)
- [ ] Deploy Prometheus + Grafana for infrastructure monitoring
- [ ] Build dashboards: server utilization, IP pool usage, SSL cert status
- [ ] Implement alerting (hardware failure, SSL expiry, IP exhaustion)
- [ ] Document runbooks for common operations
- [ ] Implement automated server decommissioning (release -> wipe -> available)
- [ ] Build capacity planning reports

---

## TECHNOLOGY DECISION MATRIX

| Decision | Small Scale (<50 servers) | Medium Scale (50-500) | Large Scale (500+) |
|----------|---------------------------|------------------------|---------------------|
| Bare Metal Provisioning | Foreman | MAAS | Tinkerbell / Custom |
| DCIM + IPAM | NetBox | NetBox | NetBox + Custom API |
| DNS | PowerDNS (single) | PowerDNS (Primary + Secondary) | PowerDNS + Lightning Stream |
| SSL | acme.sh (per server) | Centralized acme.sh + Vault | Custom ACME service |
| Billing | WHMCS | WHMCS + SynergyCP | Custom billing platform |
| Firewall | nftables + Fail2Ban | nftables + CrowdSec | Hardware firewall + nftables |
| DDoS | Cloudflare Free | Cloudflare Pro + BGP null-route | Dedicated DDoS appliance |

---

## KEY REFERENCES

- MAAS: https://maas.io/docs
- Foreman: https://theforeman.org/
- Tinkerbell: https://tinkerbell.org/
- NetBox: https://github.com/netbox-community/netbox
- PowerDNS: https://www.powerdns.com/
- acme.sh: https://github.com/acmesh-official/acme.sh
- SynergyCP: https://synergycp.com/
- Let's Encrypt Rate Limits: https://letsencrypt.org/docs/rate-limits/
- APNIC (for Nepal): https://www.apnic.net/
- phpIPAM: https://phpipam.net/
