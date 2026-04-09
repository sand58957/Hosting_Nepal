# Complete Hosting Provider Infrastructure Architecture
## From Physical Hardware to Customer-Facing Dashboard

**Target:** Full-scale hosting provider (Contabo + SiteGround + GoDaddy combined)
**Market:** Nepal-targeting business with India (Mumbai) infrastructure
**Date:** March 2026

---

## TABLE OF CONTENTS

1. [Physical Infrastructure Layer](#1-physical-infrastructure-layer)
2. [Network Layer](#2-network-layer)
3. [Virtualization Layer (VPS/VDS)](#3-virtualization-layer)
4. [VPS/VDS Customer Panel](#4-vpsvds-customer-panel)
5. [Dedicated Server Automation](#5-dedicated-server-automation)
6. [Shared/WordPress Hosting Layer](#6-sharedwordpress-hosting-layer)
7. [Domain Management Layer](#7-domain-management-layer)
8. [SSL/TLS Layer](#8-ssltls-layer)
9. [Email Layer](#9-email-layer)
10. [Billing & Automation Layer](#10-billing--automation-layer)
11. [Monitoring & Operations](#11-monitoring--operations)
12. [Security Layer](#12-security-layer)
13. [Customer-Facing Platform](#13-customer-facing-platform)
14. [Startup Cost Analysis & Phased Plan](#14-startup-cost-analysis--phased-plan)

---

## 1. PHYSICAL INFRASTRUCTURE LAYER

### 1.1 Colocation vs Own Data Center

**Recommendation: Colocation in Mumbai (Phase 1-3), Own DC consideration only at massive scale (Phase 4+)**

Rationale:
- Building a DC requires $2M+ minimum investment, land acquisition, power infrastructure, cooling systems
- Colocation provides Tier III/IV infrastructure immediately
- Mumbai accounts for ~60% of India's data center expansion
- Mumbai hosts the most submarine cable landing stations in India -- excellent global connectivity
- Indian colocation undercuts global pricing by 20-40%

### 1.2 Mumbai Colocation Providers (Ranked)

| Provider | Tier | Key Specs | Estimated Full Rack Cost |
|----------|------|-----------|-------------------------|
| **Web Werks (Iron Mountain)** | III+ | MUM-1: 50K sqft, 800 racks, 2.3MW; MUM-2: 120K sqft, 6MW | INR 80,000 - 1,50,000/mo |
| **CtrlS** | IV | 3M+ sqft campus planned, 5,555 racks, 50% renewable, N+N UPS | INR 1,00,000 - 2,00,000/mo |
| **GPX/Equinix** | IV | MB1+MB2: 90K sqft, 1,850 cabinets, 16MW, 52U cabinets | INR 1,50,000 - 3,00,000/mo |
| **Yotta (Hiranandani)** | IV | Asia's largest Tier IV campus in Navi Mumbai | INR 1,00,000 - 2,00,000/mo |
| **Cyfuture** | III/IV-ready | HPC-ready racks, suitable for AI/GPU workloads | INR 60,000 - 1,20,000/mo |
| **ServerBasket** | III | Budget option, unlimited bandwidth plans | INR 40,000 - 80,000/mo |

**Pricing Breakdown:**
- 1U colocation (shared rack): INR 3,000 - 8,000/month
- Full rack space (42U): INR 25,000 - 75,000+/month
- Power: INR 8,000 - 20,000/month per kVA
- Full rack total (space + power + bandwidth): INR 80,000 - 2,00,000+/month
- Long-term contracts (1-3 years): 10-20% discount

**Recommended Starting Provider:** Web Werks (Iron Mountain) or Cyfuture -- best price/performance ratio, good connectivity, and flexible plans for startups.

### 1.3 Minimum Hardware to Start

**Phase 1 Minimum Viable Setup (3-5 servers):**

| Server Role | Qty | Recommended Specs | Estimated Cost (USD) |
|-------------|-----|-------------------|---------------------|
| VPS Hypervisor Node | 2 | 2x AMD EPYC 7443 (24C/48T), 256GB DDR4 ECC, 4x 1.92TB NVMe Enterprise SSD, 2x 25GbE NIC | $8,000-12,000 each |
| Shared Hosting Node | 1 | 2x Intel Xeon Silver 4314 (16C/32T), 128GB DDR4 ECC, 2x 960GB NVMe + 4x 4TB SAS SSD, 2x 10GbE | $6,000-9,000 |
| Management/Billing/DNS | 1 | 1x Intel Xeon E-2388G (8C/16T), 64GB DDR4 ECC, 2x 480GB NVMe, 2x 1GbE | $3,000-5,000 |
| Backup/Storage | 1 | 1x AMD EPYC 7313P (16C/32T), 128GB DDR4, 2x 480GB NVMe (OS) + 8x 8TB HDD (RAIDZ2), 2x 10GbE | $5,000-8,000 |

**Total Phase 1 Hardware: $30,000 - $46,000**

### 1.4 Server Hardware Recommendations

**Supermicro (Best value -- Hetzner/Contabo strategy):**
- Up to 3x cheaper than Dell for equivalent configs
- Highly modular -- customize motherboard layouts, storage, GPU expansion
- Trade-off: basic IPMI vs Dell's iDRAC, less enterprise support
- Best for: Budget-focused hosting startup, custom builds

**Dell PowerEdge (Enterprise reliability):**
- R760/R660 rack servers (latest generation)
- iDRAC 9 remote management -- far superior to basic IPMI
- OpenManage for fleet management
- 3.5x more security features than Supermicro
- Best for: Customer-facing dedicated servers, managed hosting

**HPE ProLiant (Premium option):**
- DL380 Gen11 for compute-heavy workloads
- iLO 6 remote management
- Best for: Enterprise clients requiring HPE brand

**Recommendation for startup: Supermicro for VPS/internal nodes (cost savings), Dell PowerEdge for dedicated server products (customer trust + iDRAC).**

### 1.5 Network Equipment

| Equipment | Recommendation | Estimated Cost |
|-----------|---------------|----------------|
| Top-of-Rack Switch | Juniper EX4300-48T or Arista 7050TX (48x 10GbE + 6x 40GbE uplinks) | $3,000-6,000 |
| Core Router | MikroTik CCR2216-1G-12XS-2XQ (100GbE capable, BGP support) | $2,000-4,000 |
| Firewall | Fortinet FortiGate 100F or pfSense on dedicated hardware | $2,000-5,000 |
| Out-of-band Management Switch | Dedicated 1GbE switch for IPMI/iDRAC network | $500-1,000 |
| Cabling | Cat6a for management, DAC/AOC for 10/25GbE inter-server | $500-2,000 |

### 1.6 Power & Cooling

- Plan for 4-8 kVA per full rack
- Colocation handles cooling (included in pricing)
- UPS: Provided by colocation facility (N+1 or N+N redundancy)
- Budget for dual-PSU servers (all production servers must have redundant power supplies)
- Estimated power cost in Mumbai: INR 8,000-20,000/month per kVA

### 1.7 Uplink Bandwidth

- Start with 1 Gbps committed (burstable to 10 Gbps)
- Typical colocation bandwidth pricing in India: INR 5,000-15,000 per Mbps/month (committed)
- Alternative: 95th percentile billing at INR 50-100 per Mbps
- Target providers with direct peering to Tata Communications, Airtel, Jio
- Nepal connectivity: Ensure uplink to providers peering at NIXI (National Internet Exchange of India)

### 1.8 How Hetzner/Contabo Keep Costs Low

**Hetzner's Strategy (emulate this):**
1. **Own the infrastructure top to bottom** -- land, DC, servers
2. **Build servers in-house** -- no Dell/HPE markup, custom chassis (no fancy 1U rackmount cases)
3. **Energy efficiency** -- Germany's cooler climate helps; every kWh saved = lower prices
4. **Reuse proven hardware** -- extend service life of components as long as technically viable
5. **Setup fees** -- highest cost is new hardware; setup fee aligns price with actual depreciation
6. **Extreme automation** -- minimize human intervention in provisioning

**Contabo's Strategy:**
1. **Maximize specs per dollar** -- huge RAM/CPU allocations at every tier
2. **Minimal features** -- no object storage, no GPU servers, no Kubernetes
3. **Self-service model** -- minimal support overhead
4. **Trade performance consistency for price** -- overcommit resources aggressively

**Our Recommended Approach:**
- Phase 1-2: Use Supermicro hardware (Hetzner approach) in colocation
- Custom assemble where possible to save 30-50% vs branded servers
- Automate everything from day one
- Offer generous specs (Contabo approach) to win Nepal market
- Add premium tiers with SiteGround-style managed features for higher margin

---

## 2. NETWORK LAYER

### 2.1 IP Address Acquisition

**APNIC (Asia-Pacific region) -- required for India/Nepal:**

| Item | Cost |
|------|------|
| APNIC Sign-up Fee | AUD 500 (one-time, ~USD 325) |
| Annual Membership Fee | Based on address holdings (Base Fee x Bit Factor) |
| First 2 ASNs | Free |
| Additional ASNs | AUD 500 allocation + AUD 100/year each |
| LDC Discount (Nepal qualifies) | 50% off all fees |
| IPv4 Transfer Fee | Based on block size |

**IPv4 Market Pricing (2025-2026):**
- Per IP purchase: $35-65/IP
- /24 block (256 IPs): $9,000-16,600 to buy outright
- /24 block lease: $150-250/month
- Prices rising 10-20% annually -- IPv6 adoption still slow
- /22 block (1,024 IPs): $35,000-65,000 to buy

**Minimum IP blocks to start:**
- Phase 1: Lease 1x /24 (256 IPs) -- ~$200/month
- Phase 2: Buy 1x /22 (1,024 IPs) -- ~$40,000-50,000
- Phase 3: Buy additional /22 blocks as needed

**Alternative: Get IPs from colocation/transit provider**
- Many colocation providers include a /24 or small allocation
- Announce their space under their ASN initially
- Transition to own ASN + IPs when justified

### 2.2 BGP and ASN Setup

**Requirements for own ASN:**
1. APNIC membership (AUD 500 sign-up + annual fee)
2. ASN allocation (first 2 free under APNIC)
3. Minimum /24 IPv4 block to announce
4. At least 2 upstream transit providers (for multi-homing)
5. BGP-capable router (MikroTik CCR, Juniper MX, or Linux + BIRD/FRR)
6. Route Origin Authorization (ROA) configured in RPKI
7. PeeringDB profile created

**BGP Setup Steps:**
1. Apply for APNIC membership
2. Request ASN allocation
3. Acquire or lease IPv4 space (/24 minimum)
4. Create ROA records in APNIC's RPKI portal
5. Configure BGP router with FRRouting (FRR) on Linux or MikroTik RouterOS
6. Establish BGP sessions with upstream providers (IP Transit)
7. Announce your prefixes
8. Register on PeeringDB

**BGP Hosting Provider Costs:**
- Per-subnet setup: ~$50 one-time
- Per-subnet monthly: ~$20/month
- IP Transit bandwidth: EUR 0.25/Mbps (95th percentile) for 5 Gbps

### 2.3 Network Architecture

```
                    Internet
                       |
            +----------+----------+
            |                     |
      Transit Provider 1    Transit Provider 2
      (Tata/Airtel)         (Jio/NTT)
            |                     |
            +----------+----------+
                       |
              [Border Router]
              (BGP / FRRouting)
              MikroTik CCR2216
                       |
              [Core Firewall]
              FortiGate 100F
                       |
         +-------------+-------------+
         |             |             |
   [VLAN 100]    [VLAN 200]    [VLAN 300]
   Management    VPS Nodes     Shared Hosting
         |             |             |
   [ToR Switch]  [ToR Switch]  [ToR Switch]
         |             |             |
   Mgmt Servers  Proxmox      Web Servers
   Billing/DNS   Hypervisors  CloudLinux
   Monitoring    Storage
```

### 2.4 VLAN Design for Customer Isolation

| VLAN ID | Purpose | Subnet |
|---------|---------|--------|
| 10 | Management / IPMI / iDRAC | 10.0.10.0/24 |
| 20 | Storage Network (Ceph/NFS) | 10.0.20.0/22 |
| 30 | Proxmox Cluster (Corosync) | 10.0.30.0/24 |
| 100 | VPS Public Network | Public /22 |
| 101-199 | VPS Private Networks (per-customer) | 10.100.x.0/24 |
| 200 | Shared Hosting Public | Public /25 |
| 300 | Dedicated Servers | Public /24 |
| 400 | Monitoring/Logging | 10.0.40.0/24 |
| 500 | Backup Network | 10.0.50.0/24 |

**Modern Approach - VXLAN BGP EVPN:**
- VXLAN uses 24-bit VNI -- supports up to 16 million isolated virtual networks
- Proxmox VE 9.0 supports VXLAN, BGP, and EVPN overlays natively
- Recommended for multi-tenant VPS isolation at scale
- Requires 10GbE+ fabric

### 2.5 DDoS Protection

| Solution | Type | Cost | Best For |
|----------|------|------|----------|
| **Cloudflare Spectrum** | L3/L4 TCP/UDP proxy | $5,000+/month (Enterprise) | Web traffic, premium clients |
| **Cloudflare Magic Transit** | Full network protection | $5,000+/month | Own IP space announcement |
| **Path.net** | L3/L4, modern XDP stack, API automation | Competitive | Automation-focused, gaming |
| **Voxility** | Upstream filtering | Cheaper than CF | European hosting, budget DDoS |
| **Cloudflare Free/Pro** | L7 HTTP/HTTPS only | Free-$200/month | Shared hosting customers |
| **In-house: fastnetmon + iptables** | Detection + local mitigation | Free (open source) | Basic protection, small attacks |

**Recommended DDoS Strategy:**
1. **Layer 1 (all customers):** Cloudflare proxy for HTTP/HTTPS (free tier)
2. **Layer 2 (VPS customers):** Path.net or Voxility for TCP/UDP protection
3. **Layer 3 (premium):** Cloudflare Magic Transit for own IP announcements
4. **Layer 4 (detection):** fastnetmon Community for real-time attack detection + BGP blackhole

---

## 3. VIRTUALIZATION LAYER (VPS/VDS)

### 3.1 Proxmox VE Architecture

**Why Proxmox VE:**
- Open source, no per-socket licensing (unlike VMware)
- Type-1 hypervisor built on Debian
- Combines KVM (full VMs) + LXC (containers)
- Built-in HA, Ceph, ZFS, clustering
- Full REST API for automation
- Scales to 100+ nodes per cluster
- Current version: Proxmox VE 9.0 (Debian 13 "Trixie")

**Cluster Architecture:**

```
Proxmox Cluster (3+ nodes minimum for quorum)
+------------------+  +------------------+  +------------------+
| Node 1           |  | Node 2           |  | Node 3           |
| AMD EPYC 7443    |  | AMD EPYC 7443    |  | AMD EPYC 7443    |
| 256GB RAM        |  | 256GB RAM        |  | 256GB RAM        |
| 4x 1.92TB NVMe   |  | 4x 1.92TB NVMe   |  | 4x 1.92TB NVMe   |
| KVM VMs          |  | KVM VMs          |  | KVM VMs          |
| LXC Containers   |  | LXC Containers   |  | LXC Containers   |
+--------+---------+  +--------+---------+  +--------+---------+
         |                     |                     |
         +----------+----------+----------+----------+
                    |                     |
            Cluster Network        Storage Network
            (Corosync/pmxcfs)      (Ceph or ZFS Repl.)
            10GbE VLAN 30          25GbE VLAN 20
```

### 3.2 Proxmox API Endpoints (Complete Reference)

**Authentication:**
```
Base URL: https://<host>:8006/api2/json/
Auth Header: PVEAPIToken=USER@REALM!TOKENID=UUID
```

**VM Lifecycle:**
```
# Create VM
POST /nodes/{node}/qemu
POST /nodes/{node}/lxc

# List VMs
GET /nodes/{node}/qemu
GET /nodes/{node}/lxc
GET /cluster/resources?type=vm

# Start/Stop/Reboot
POST /nodes/{node}/qemu/{vmid}/status/start
POST /nodes/{node}/qemu/{vmid}/status/stop
POST /nodes/{node}/qemu/{vmid}/status/shutdown
POST /nodes/{node}/qemu/{vmid}/status/reboot

# Delete
DELETE /nodes/{node}/qemu/{vmid}
DELETE /nodes/{node}/lxc/{vmid}

# Resize Disk
PUT /nodes/{node}/qemu/{vmid}/resize
  params: disk=scsi0, size=+10G

# Snapshots
GET  /nodes/{node}/qemu/{vmid}/snapshot
POST /nodes/{node}/qemu/{vmid}/snapshot
  params: snapname, description
POST /nodes/{node}/qemu/{vmid}/snapshot/{snapname}/rollback
DELETE /nodes/{node}/qemu/{vmid}/snapshot/{snapname}

# Console (VNC/noVNC)
POST /nodes/{node}/qemu/{vmid}/vncproxy
POST /nodes/{node}/qemu/{vmid}/termproxy

# Clone (for templates)
POST /nodes/{node}/qemu/{vmid}/clone
  params: newid, name, full=1, target=node

# Migration
POST /nodes/{node}/qemu/{vmid}/migrate
  params: target=node2, online=1

# Config (read/update)
GET /nodes/{node}/qemu/{vmid}/config
PUT /nodes/{node}/qemu/{vmid}/config
  params: cores, memory, net0, etc.

# Cloud-init config
PUT /nodes/{node}/qemu/{vmid}/config
  params: ciuser, cipassword, ipconfig0, sshkeys, nameserver
```

**Required permissions:** VM.Audit, VM.Snapshot, VM.PowerMgmt, VM.Config.*, Datastore.Audit, Pool.Audit

### 3.3 Cloud-Init Templates

**Template Creation Process:**
```bash
# 1. Download cloud image
wget https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img

# 2. Create VM from image
qm create 9000 --name ubuntu-cloud --memory 2048 --cores 2 \
  --net0 virtio,bridge=vmbr0 --scsihw virtio-scsi-single

# 3. Import disk
qm set 9000 --scsi0 local-lvm:0,import-from=/path/noble-server-cloudimg-amd64.img

# 4. Add cloud-init drive
qm set 9000 --ide2 local-lvm:cloudinit

# 5. Set boot order
qm set 9000 --boot order=scsi0

# 6. Set serial console
qm set 9000 --serial0 socket --vga serial0

# 7. Convert to template
qm template 9000
```

**Cloud-Init via API for provisioning:**
```bash
# Clone template and configure via API
curl -X POST "https://pve:8006/api2/json/nodes/node1/qemu/9000/clone" \
  -d "newid=100&name=customer-vps&full=1"

curl -X PUT "https://pve:8006/api2/json/nodes/node1/qemu/100/config" \
  -d "ciuser=root&cipassword=<hash>&ipconfig0=ip=203.0.113.10/24,gw=203.0.113.1&nameserver=8.8.8.8&sshkeys=<urlencoded-key>"
```

**Templates to Maintain:**
- Ubuntu 22.04 / 24.04 LTS
- Debian 12
- AlmaLinux 9 / Rocky Linux 9
- CentOS Stream 9
- Windows Server 2022 (via virtio drivers + cloudbase-init)
- Arch Linux, Fedora (community demand)

**Custom cloud-init via cicustom:**
```bash
qm set 100 --cicustom "user=local:snippets/custom-user.yml,network=local:snippets/custom-network.yml"
```
Note: Custom CI files override Proxmox GUI cloud-init parameters entirely. For clusters, store snippets on shared storage (CephFS).

### 3.4 KVM vs LXC -- When to Use Each

| Factor | KVM (QEMU) | LXC Containers |
|--------|-----------|----------------|
| **Isolation** | Full -- separate kernel | Shared host kernel |
| **OS Support** | Any OS (Windows, BSD, Linux) | Linux only |
| **Performance Overhead** | ~5-10% CPU, more RAM | Near-native, minimal overhead |
| **Use Case** | VPS product, Windows, security-critical | Budget VPS, internal services |
| **Pricing** | Premium tier | Budget tier |
| **Snapshot** | Full disk snapshots | Filesystem-level snapshots |
| **Migration** | Live migration supported | Live migration supported |
| **GPU Passthrough** | Yes | No |

**Product Mapping:**
- **VPS (Standard):** KVM -- customers expect full isolation
- **VDS (Dedicated vCPU):** KVM with CPU pinning
- **Budget VPS / Development:** LXC -- 2x density, lower price
- **Internal services:** LXC -- monitoring, DNS, billing

### 3.5 CPU Pinning for VDS (Dedicated Cores)

```bash
# Pin VM 100 to CPU cores 0-3 (dedicated, non-shared)
qm set 100 --cpuunits 1024 --cores 4
taskset -c 0-3 qm start 100

# Better approach via cgroup CPU pinning:
# /etc/pve/qemu-server/100.conf
cores: 4
cpulimit: 4
affinity: 0-3   # Proxmox 8+ supports this natively
```

**VDS Strategy:**
- Divide physical cores into dedicated pools
- Example: 48-core EPYC = 12x 4-core VDS instances
- No overcommit -- 1:1 CPU allocation
- Price premium: 2-3x over shared VPS
- Monitor with `htop` and `cpustat` for pinning verification

### 3.6 Storage Backends

| Backend | Best For | Performance | Scalability | Complexity |
|---------|----------|-------------|-------------|------------|
| **Local NVMe (ZFS mirror)** | 1-3 node clusters, best single-VM I/O | Excellent | Per-node only | Low |
| **Local NVMe (LVM-thin)** | Simple setups, thin provisioning | Very Good | Per-node only | Very Low |
| **Ceph RBD** | 5+ node clusters, HA, shared storage | Good aggregate | Horizontal | High |
| **ZFS over iSCSI** | Shared storage without Ceph complexity | Good | Limited | Medium |
| **NFS** | Backups, ISO storage, templates | Moderate | Centralized | Low |

**Recommended Architecture:**
- **VPS VM storage:** Local NVMe in ZFS mirror (Phase 1-2) -> Ceph (Phase 3+)
- **Backup storage:** ZFS RAIDZ2 on HDD pool, served via NFS
- **ISO/Template storage:** NFS share on management node
- **Ceph minimum:** 5 nodes, 25GbE network, enterprise NVMe (high DWPD)

**ZFS Configuration for VPS:**
```bash
# Create ZFS mirror pool
zpool create -f rpool mirror /dev/nvme0n1 /dev/nvme1n1
zpool add rpool mirror /dev/nvme2n1 /dev/nvme3n1

# Set ARC size (25-50% of RAM for virtualization)
echo "options zfs zfs_arc_max=68719476736" >> /etc/modprobe.d/zfs.conf  # 64GB

# Enable compression
zfs set compression=lz4 rpool
```

### 3.7 Live Migration

```bash
# Online migration via API
POST /nodes/{source}/qemu/{vmid}/migrate
  params: target=destination_node, online=1

# CLI
qm migrate 100 node2 --online
```

Requirements:
- Same Proxmox version on all nodes
- Shared storage (Ceph) OR local storage with replication configured
- Cluster network (Corosync) operational
- Same CPU vendor (AMD-AMD or Intel-Intel)

### 3.8 High Availability Cluster

```bash
# Create HA group
ha-manager groupadd mygroup --nodes node1,node2,node3

# Add VM to HA
ha-manager add vm:100 --group mygroup --max_restart 3 --max_relocate 2

# HA behavior:
# - Node failure detected after fencing timeout (~60s)
# - VM automatically restarted on surviving node (~2-3 min total)
# - Requires shared storage (Ceph) or up-to-date replication
```

### 3.9 GPU Passthrough for GPU VPS

```bash
# Enable IOMMU in GRUB
# /etc/default/grub
GRUB_CMDLINE_LINUX_DEFAULT="quiet amd_iommu=on iommu=pt"

# Blacklist GPU drivers on host
echo "blacklist nouveau" >> /etc/modprobe.d/blacklist.conf
echo "blacklist nvidia" >> /etc/modprobe.d/blacklist.conf

# Load VFIO modules
echo "vfio" >> /etc/modules
echo "vfio_iommu_type1" >> /etc/modules
echo "vfio_pci" >> /etc/modules

# Assign GPU to VM via config
# /etc/pve/qemu-server/100.conf
hostpci0: 0000:41:00,pcie=1,x-vga=1
```

GPU VPS Products:
- NVIDIA A2/L4 for inference workloads
- NVIDIA T4 for budget GPU VPS
- NVIDIA A100/H100 for enterprise AI (significant investment)

---

## 4. VPS/VDS CUSTOMER PANEL

### 4.1 Panel Comparison

| Feature | Virtualizor | VirtFusion | SolusVM 2 | Custom Built |
|---------|-------------|------------|-----------|-------------|
| **Cost** | $7-9/node/mo | $15/node/mo | ~$10/node/mo | Dev cost |
| **Hypervisor Support** | KVM, Xen, OpenVZ, LXC, Proxmox | KVM only | KVM | Any via API |
| **WHMCS Integration** | Free, built-in | Free, official | Built-in | Custom |
| **UI/UX Quality** | Functional, dated | Modern, polished | Moderate | Full control |
| **Proxmox Native** | Yes | KVM-based | Yes | Via Proxmox API |
| **Support Quality** | Slow (up to 1 day) | Fast (Discord, ~1hr) | Variable | Self |
| **Bugs** | Known long-standing bugs | Fewer, newer codebase | Legacy issues | Your code |

### 4.2 Recommended: Virtualizor (Phase 1) + Custom Panel (Phase 2+)

**Phase 1 -- Virtualizor ($7-9/node/month):**
- Immediate time-to-market
- Native Proxmox support
- WHMCS integration out of the box
- Full customer panel with noVNC console
- Handles: VM create/destroy, OS reinstall, power management, snapshots, bandwidth graphs

**Phase 2+ -- Custom Panel (like SiteGround's Site Tools approach):**
- Build on top of Proxmox API directly
- Full control over UX and branding
- React/Next.js frontend
- Features SiteGround took ~3 years and 20+ developers to build

### 4.3 Essential Customer Panel Features

**Must-Have (Day 1):**
- Power: Start / Stop / Restart / Force Stop
- Console: noVNC web console (via Proxmox vncproxy API)
- OS Reinstall: Select from template list, cloud-init provisioning
- Resource Graphs: CPU, RAM, Disk I/O, Network (Prometheus metrics)
- Reverse DNS: Update PTR records via PowerDNS API
- Firewall: iptables/nftables rules per VM

**Should-Have (Month 3):**
- Snapshots: Create/restore/delete (limited to 3-5 per VPS)
- Rescue Mode: Boot from rescue ISO
- ISO Mount: Upload and mount custom ISO
- Backup: Scheduled backups with retention policy
- SSH Key Management: Add/remove SSH keys
- Password Reset: Via QEMU guest agent

**Nice-to-Have (Month 6+):**
- VPC / Private Networking
- Load Balancers
- Floating IPs
- Block Storage Volumes
- API access for B2B customers
- Terraform provider
- Two-Factor Authentication

---

## 5. DEDICATED SERVER AUTOMATION

### 5.1 MAAS (Metal as a Service) by Canonical

**What MAAS does:**
- Automated bare metal provisioning via PXE + IPMI
- Server discovery, commissioning, and deployment
- Zero-touch OS installation (Ubuntu, CentOS, Windows, RHEL)
- Detailed hardware inventory (RAM, CPU, disks, NICs, GPUs)
- Under 2-minute provisioning possible
- REST API for programmatic control
- Integrates with Terraform, Ansible, Juju

**MAAS Architecture:**
```
MAAS Region Controller (API, DB, DNS)
        |
MAAS Rack Controller (DHCP, PXE, TFTP, IPMI)
        |
    +---------+---------+---------+
    |         |         |         |
  Server1  Server2  Server3  Server4
  (IPMI)   (IPMI)   (iDRAC)  (iLO)
```

**MAAS Provisioning Flow:**
1. New server connected to network, PXE boots
2. MAAS discovers machine via DHCP/PXE
3. Commissioning: MAAS boots ephemeral OS, inventories hardware
4. Machine enters "Ready" state
5. Customer orders via billing -> API call to MAAS
6. MAAS deploys requested OS via PXE
7. Server ready with SSH access in < 5 minutes

### 5.2 IPMI/iDRAC/iLO Remote Management

| Feature | IPMI (Supermicro) | iDRAC (Dell) | iLO (HPE) |
|---------|------------------|--------------|-----------|
| Remote Power | Yes | Yes | Yes |
| Console Access | KVM over IP | HTML5 KVM | HTML5 KVM |
| OS Install | PXE/Virtual Media | Virtual Media + Lifecycle Controller | Virtual Media |
| Health Monitoring | Basic sensors | Comprehensive + OpenManage | Comprehensive |
| API | IPMI protocol | Redfish REST API | Redfish REST API |
| Cost | Included | Included (Express) / Licensed (Enterprise) | Licensed |

### 5.3 Automated OS Installation Flow

```
Customer Order -> Billing System (WHMCS) -> Provisioning API
        |
        v
    MAAS API: allocate machine matching specs
        |
        v
    MAAS: deploy OS (Ubuntu/CentOS/Windows)
        |
        v
    Post-deploy: Ansible playbook (SSH keys, monitoring agent, firewall)
        |
        v
    Webhook -> Billing: update status to "Active"
        |
        v
    Customer receives: IP, root password, IPMI credentials
```

### 5.4 Hardware Health Monitoring

- **Zabbix IPMI agent:** Temperature, fan speed, voltage, disk health via S.M.A.R.T
- **ipmitool:** CLI for IPMI sensor reading and control
- **Redfish API:** Modern REST-based hardware monitoring (Dell/HPE)
- **MegaCLI/StorCLI:** RAID controller health monitoring
- **smartctl:** Disk health and predictive failure alerts
- **Node Exporter + custom exporters:** Prometheus integration

### 5.5 RAID Configuration

```bash
# Dell PERC (via PERCCLI)
perccli /c0 add vd r1 drives=252:0,252:1 wb ra direct

# LSI/Broadcom (via StorCLI)
storcli /c0 add vd r10 drives=252:0-3 wb ra direct

# Software RAID (mdadm)
mdadm --create /dev/md0 --level=1 --raid-devices=2 /dev/sda /dev/sdb

# Automated via MAAS curtin config or preseed
```

---

## 6. SHARED/WORDPRESS HOSTING LAYER

### 6.1 Recommended Stack

```
CloudLinux 8 (OS with LVE resource limits + CageFS isolation)
    |
CyberPanel (Free hosting control panel)
    |
OpenLiteSpeed (High-performance web server)
    |
LiteSpeed Cache (WordPress acceleration)
    |
MariaDB 10.11+ (Optimized MySQL setup)
    |
PHP 8.2/8.3/8.4 (Multiple versions per site)
```

### 6.2 CloudLinux for Multi-Tenant Isolation

**Key Features:**
- **LVE (Lightweight Virtual Environment):** Per-user CPU, RAM, I/O, IOPS limits
- **CageFS:** Virtualized filesystem -- each user sees only their own files
- **PHP Selector:** Multiple PHP versions per user (5.6 through 8.4)
- **MySQL Governor:** Per-user database resource limits
- **SecureLinks:** Prevents symlink attacks between users
- **Mod_lsapi:** Fastest way to run PHP on Apache/LiteSpeed

**CloudLinux Pricing:** ~$14/server/month (1-core min), scales with cores

### 6.3 CyberPanel Features

- **Free tier:** OpenLiteSpeed + DNS (PowerDNS) + Email (Postfix+Dovecot) + FTP (Pure-FTPd)
- **WordPress:** One-click install with LiteSpeed Cache pre-configured
- **File Manager:** Built-in web file manager
- **Database:** phpMyAdmin integration
- **Backup:** Local + remote backup support
- **Docker:** One-click Docker container deployment
- **Staging:** WordPress staging environments
- **SSL:** Auto Let's Encrypt SSL for all domains
- **Security:** ModSecurity + built-in malware scanner

**Installation:**
```bash
sudo su - -c 'sh <(curl https://cyberpanel.net/install || wget -O - https://cyberpanel.net/install)'
# Select: OpenLiteSpeed, PowerDNS, Postfix, Pure-FTPd
```

### 6.4 Alternative: CloudPanel (for developer-focused hosting)

- NGINX-based (vs CyberPanel's LiteSpeed)
- Support for PHP, Node.js, Python, static sites
- Debian-exclusive
- No built-in email (pair with external email service)
- Top benchmark performance: 1,248 req/s in 2025 testing
- Fully free under BSD license

### 6.5 Per-Site Resource Limits (CloudLinux LVE)

```
# /etc/container/ve.cfg
# Default limits per user:
SPEED=100        # CPU (100 = 1 core)
PMEM=1048576     # Physical memory (1GB)
VMEM=1048576     # Virtual memory (1GB)
IO=4096          # I/O throughput (4 MB/s)
IOPS=1024        # I/O operations per second
EP=20            # Entry processes (concurrent connections)
NPROC=100        # Number of processes
```

### 6.6 How to Build Custom "Site Tools" (SiteGround Approach)

**SiteGround's Key Architectural Decisions:**
1. **Site-centric design:** One panel per site (not per account). Each site gets its own isolated Site Tools instance
2. **Proprietary development:** Hired 20+ developers (React, QA), restructured teams, ~3 years to build
3. **React frontend:** Modern SPA with responsive design
4. **Custom backend:** Fully integrated with their infrastructure
5. **Chroot isolation:** Each site runs in isolated filesystem
6. **Per-site PHP:** Multiple PHP versions within same account

**Our Custom Panel Architecture (Phase 2+):**
```
Frontend: Next.js 15 + React 19 + Tailwind CSS + shadcn/ui
Backend: Node.js (Express/Fastify) or Go
Database: PostgreSQL + Redis (caching/sessions)
Auth: JWT + 2FA (TOTP)
API: RESTful JSON API

Features per site:
- Dashboard (resource usage, traffic stats)
- File Manager (web-based, with code editor)
- Database Manager (phpMyAdmin-like)
- Email Management (create accounts, forwarding)
- DNS Zone Editor
- SSL Manager (Let's Encrypt auto-renewal)
- PHP Version Selector
- WordPress Tools (staging, auto-update, search-replace)
- Backup Manager (create, restore, download)
- Cron Jobs
- SSH Access management
- Security (Firewall rules, IP blocking, 2FA)
- Caching Manager (LiteSpeed Cache, Redis, Memcached)
- Git Integration
- Access Logs viewer
```

---

## 7. DOMAIN MANAGEMENT LAYER

### 7.1 ResellerClub API Integration

**ResellerClub Overview:**
- One-stop shop: domains, hosting, SSL, email products
- HTTP REST API -- free to use
- WHMCS module available (built-in)
- Sandbox environment for testing
- 600+ TLDs available

**Key API Endpoints:**
```
# Authentication
All requests include: auth-userid=<reseller_id>&api-key=<api_key>

# Domain Registration
POST /api/domains/register.json
  params: domain-name, years, ns, customer-id, contact-ids

# Domain Search/Availability
GET /api/domains/available.json
  params: domain-name, tlds[]

# Domain Transfer
POST /api/domains/transfer.json

# Domain Renewal
POST /api/domains/renew.json

# DNS Management
POST /api/dns/manage/add-ipv4-address-record.json
POST /api/dns/manage/add-cname-record.json
POST /api/dns/manage/add-mx-record.json
POST /api/dns/manage/add-txt-record.json
DELETE /api/dns/manage/delete-ipv4-address-record.json

# WHOIS Management
POST /api/domains/modify-privacy-protection.json

# Nameserver Management
POST /api/domains/modify-ns.json
```

### 7.2 PowerDNS as Authoritative DNS

**Why PowerDNS:**
- Open source, high performance
- REST API for programmatic zone management
- Multiple backends: MySQL, PostgreSQL, LMDB, SQLite
- DNSSEC support with web management
- Lightning Stream for multi-primary replication (commercial)

**PowerDNS API Setup:**
```yaml
# /etc/powerdns/pdns.conf
launch=gmysql
gmysql-host=127.0.0.1
gmysql-dbname=powerdns
gmysql-user=pdns
gmysql-password=<password>

webserver=yes
webserver-address=127.0.0.1
webserver-port=8081
api=yes
api-key=<your-api-key>
```

**PowerDNS API Endpoints:**
```
# List zones
GET /api/v1/servers/localhost/zones

# Create zone
POST /api/v1/servers/localhost/zones
  body: {"name": "example.com.", "kind": "Master", "nameservers": ["ns1.hostnepal.com.", "ns2.hostnepal.com."]}

# Add/modify records
PATCH /api/v1/servers/localhost/zones/{zone_id}
  body: {"rrsets": [{"name": "www.example.com.", "type": "A", "ttl": 3600, "changetype": "REPLACE", "records": [{"content": "203.0.113.10", "disabled": false}]}]}

# Delete zone
DELETE /api/v1/servers/localhost/zones/{zone_id}

# Auth header: X-API-Key: <your-api-key>
```

### 7.3 DNS Automation Flow

```
Customer registers domain (via ResellerClub API)
    |
    v
Set nameservers to ns1.hostnepal.com, ns2.hostnepal.com
    |
    v
PowerDNS API: Create zone with default records
    - A record -> server IP
    - CNAME www -> @
    - MX records (if email enabled)
    - SPF/DKIM/DMARC TXT records
    - CAA record for Let's Encrypt
    |
    v
Trigger SSL certificate issuance (ACME/Let's Encrypt)
    |
    v
DNS zone ready, site accessible
```

### 7.4 DNS Infrastructure

```
ns1.hostnepal.com  (Primary -- PowerDNS, Mumbai DC)
ns2.hostnepal.com  (Secondary -- PowerDNS, different provider/location)

# Minimum 2 authoritative nameservers on different networks
# Consider: ns3 in a third location for redundancy
# Use LMDB backend for highest performance
# Enable DNSSEC for all zones
```

### 7.5 Domain Search UX

```
Components:
1. Instant domain search box (debounced API calls)
2. Bulk TLD availability check (.com, .net, .org, .io, .np, etc.)
3. Premium domain suggestions
4. Price display per TLD
5. Cart/checkout integration with billing system
6. WHOIS lookup
7. Domain parking page (default page for unlinked domains)
```

---

## 8. SSL/TLS LAYER

### 8.1 Let's Encrypt Automation at Scale

**Rate Limits (current):**
- 50 certificates per Registered Domain per week
- 300 new orders per account per 3 hours
- 5 duplicate certificates per week
- 3000 pending authorizations per account
- 5 failed validations per account per hostname per hour

**Strategies for scale:**
1. Use multiple ACME accounts to distribute load
2. SAN certificates (up to 100 domains per cert)
3. Wildcard certs reduce total certificate count
4. Pre-validate domains before issuance
5. Renew at 60 days (not 30) to avoid rate limit pressure

### 8.2 ACME Implementation

**Recommended Client: acme.sh**
```bash
# Install
curl https://get.acme.sh | sh

# Issue cert with HTTP-01 challenge
acme.sh --issue -d example.com -d www.example.com --webroot /var/www/html

# Issue wildcard with DNS-01 (PowerDNS)
export PDNS_Url="http://127.0.0.1:8081"
export PDNS_ServerId="localhost"
export PDNS_Token="your-api-key"
acme.sh --issue --dns dns_pdns -d example.com -d "*.example.com"

# Auto-deploy to web server
acme.sh --install-cert -d example.com \
  --key-file /etc/ssl/example.com.key \
  --fullchain-file /etc/ssl/example.com.pem \
  --reloadcmd "systemctl reload litespeed"
```

### 8.3 PowerDNS + ACME Integration for Wildcards

**Option A: acme.sh with dns_pdns plugin (recommended)**
- Built-in PowerDNS support
- Automatically creates/cleans _acme-challenge TXT records
- Works with wildcard certificates

**Option B: acmeproxy (by Catalyst)**
- PowerDNS backend specifically for ACME dns-01 challenges
- Exposes HTTPS API for challenge publication
- Plugins for certbot and dehydrated

**Option C: ACME PowerDNS (by Adfinis)**
- Dedicated Let's Encrypt client for PowerDNS
- Centralized certificate management without touching web servers
- Ideal for hosting providers managing many domains

### 8.4 Automated SSL Flow

```
New domain added to hosting account
    |
    v
PowerDNS: Zone already exists with correct records
    |
    v
acme.sh: Issue certificate (HTTP-01 for single domain, DNS-01 for wildcard)
    |
    v
Certificate stored in /etc/ssl/certs/{domain}/
    |
    v
Web server reloaded (LiteSpeed/NGINX)
    |
    v
Cron job: Renew all certs every 60 days
    |
    v
Monitoring: Alert if cert expires within 14 days
```

### 8.5 Commercial SSL via ResellerClub

```
# ResellerClub SSL API
POST /api/sslcerts/order.json
  params: domain, cert-type (DV/OV/EV), years, approver-email

# Available products: Comodo/Sectigo, RapidSSL, GeoTrust, Thawte, DigiCert
# Margin: Buy at wholesale, sell at 3-5x markup
# Use for: EV/OV certs where Let's Encrypt (DV only) isn't sufficient
```

---

## 9. EMAIL LAYER

### 9.1 Options Comparison

| Option | Cost | Complexity | Deliverability | Best For |
|--------|------|------------|----------------|----------|
| **ResellerClub Titan Email** | ~$1-3/mailbox/mo | Low (API resell) | Good | Quick launch, low maintenance |
| **Google Workspace Reseller** | ~$6-8/user/mo | Low | Excellent | Premium offering |
| **Mailcow (self-hosted)** | Server cost only | Medium | Depends on IP reputation | Full control, cost optimization |
| **Postfix + Dovecot (manual)** | Server cost only | High | Depends on IP reputation | Maximum customization |

### 9.2 Recommended: Tiered Approach

**Tier 1 (Free with hosting):** Basic email via CyberPanel's built-in Postfix + Dovecot
**Tier 2 (Premium):** ResellerClub Titan Email -- resell at markup
**Tier 3 (Business):** Google Workspace reseller -- premium offering

### 9.3 Self-Hosted Email with Mailcow

**What Mailcow Provides (Docker-based):**
- Postfix (SMTP)
- Dovecot (IMAP/POP3)
- Rspamd (spam filtering -- replaces SpamAssassin)
- SOGo (webmail)
- ClamAV (antivirus)
- Automated Let's Encrypt SSL
- Fail2ban protection
- Admin UI for domain/user management
- DKIM key generation and management
- Two-factor authentication

**Requirements:**
- Dedicated server/VPS: 2+ vCPU, 4-8 GB RAM
- Clean, static IP with correct rDNS (PTR record)
- Not a cheap VPS range -- IP reputation matters
- Port 25/465/587/993/995 open (some providers block port 25)

**Setup:**
```bash
git clone https://github.com/mailcow/mailcow-dockerized
cd mailcow-dockerized
./generate_config.sh  # Configures hostname, timezone, Let's Encrypt
docker compose up -d
```

### 9.4 SPF/DKIM/DMARC Automation

**For each customer domain, automatically create DNS records:**

```
# SPF (TXT record)
v=spf1 mx a include:mail.hostnepal.com ~all

# DKIM (TXT record -- generated by Mailcow or OpenDKIM)
selector._domainkey IN TXT "v=DKIM1; k=rsa; p=MIIBIjANBg..."

# DMARC (TXT record)
_dmarc IN TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc@hostnepal.com"

# MX record
@ IN MX 10 mail.hostnepal.com.

# Reverse DNS (PTR record -- via colocation provider)
10.113.0.203.in-addr.arpa. IN PTR mail.hostnepal.com.
```

**Automation via PowerDNS API:** When customer enables email, auto-create all these records in their DNS zone.

### 9.5 Deliverability Best Practices

1. Warm up IP gradually -- start with low volume, increase over weeks
2. Configure rDNS (PTR record) to match mail server hostname
3. Enforce TLS for all connections
4. Monitor: Gmail Postmaster Tools, Microsoft SNDS, MXToolbox
5. Check blocklists: Spamhaus, Barracuda, SORBS
6. Set up DMARC reporting -- aggregate reports reveal deliverability issues
7. Consider separate IPs for transactional vs. marketing email

---

## 10. BILLING & AUTOMATION LAYER

### 10.1 Billing System Comparison

| Feature | WHMCS | FOSSBilling | Blesta | Custom |
|---------|-------|-------------|--------|--------|
| **Cost** | From $29.95/mo | Free (open source) | From $12.95/mo | Dev time |
| **Maturity** | Industry standard | Pre-production/beta | Solid, growing | Your code |
| **Nepal Gateways** | eSewa, Khalti, ConnectIPS modules exist | None yet (custom dev needed) | Limited | Full control |
| **Domain Module** | ResellerClub built-in | Basic | Available | Custom |
| **Proxmox Module** | Via Virtualizor or 3rd party ($300/yr) | Limited | Via module | Custom |
| **Plugin Ecosystem** | Largest (1000+ addons) | Small but growing | Moderate | N/A |
| **Source Access** | Encrypted (ionCube) | Full Apache 2.0 | Licensed | Full |

### 10.2 Recommended: WHMCS (Phase 1) + Custom Billing (Phase 3+)

**Phase 1 -- WHMCS ($29.95/month starter):**
- Fastest time-to-market
- Pre-built Nepal payment gateway modules
- ResellerClub domain module included
- Virtualizor module for VPS provisioning
- Hundreds of templates/themes available
- Auto-invoicing, dunning, and support tickets

**Phase 3+ -- Custom Billing System:**
- Avoid WHMCS's per-customer pricing escalation
- Full control over pricing models
- Native integration with all internal systems
- Build with: Next.js + PostgreSQL + Stripe-like architecture

### 10.3 Nepal Payment Gateway Integration (WHMCS)

| Gateway | WHMCS Module | Transaction Fee | Type |
|---------|-------------|----------------|------|
| **eSewa** | Available (AGM) | ~1.5-2% | Digital wallet |
| **Khalti** | Available (NHost fork) | ~1.5-2% | Payment gateway + wallet |
| **ConnectIPS** | Available (AGM) | ~0.5-1% | Inter-bank transfer |
| **NIC Asia CyberSource** | Available (AGM) | ~2-3% | Credit/Debit cards (Visa, MC) |
| **Fonepay** | Custom needed | ~1-2% | QR payment |
| **IME Pay** | Custom needed | ~1.5% | Digital wallet |

**Recommended:** Support eSewa + Khalti + ConnectIPS + Card payment (NIC Asia CyberSource) to cover >90% of Nepal payment methods.

### 10.4 Integration Architecture

```
Customer Order Flow:

1. Customer selects product on website
2. Order created in WHMCS
3. Payment processed (eSewa/Khalti/ConnectIPS)
4. WHMCS triggers provisioning module:
   - VPS: Virtualizor API -> Proxmox API -> VM created
   - Shared Hosting: CyberPanel API -> Website created
   - Domain: ResellerClub API -> Domain registered
   - SSL: ACME -> Certificate issued
   - Email: Mailcow API / Titan API -> Mailbox created
5. Customer receives welcome email with credentials
6. Service active in customer dashboard

Renewal Flow:
1. WHMCS generates invoice (configurable days before expiry)
2. Auto-charge if payment method on file
3. If unpaid: Dunning emails at day 1, 3, 7, 14
4. If still unpaid at day 14: Service suspended
5. Day 30: Service terminated (data retained 7 more days)
6. Day 37: Data permanently deleted
```

### 10.5 Invoice Generation with VAT

```
Nepal VAT: 13% (standard rate)
Invoice must include:
- Company PAN number
- Customer details
- Service description
- Amount before VAT
- VAT amount (13%)
- Total amount
- Invoice number (sequential)
- Date

WHMCS supports VAT via Tax Rules:
- Configure 13% tax for Nepal customers
- Tax-exempt for international customers (if applicable)
- Auto-generated PDF invoices
```

---

## 11. MONITORING & OPERATIONS

### 11.1 Monitoring Stack Architecture

```
+------------------+     +------------------+     +------------------+
| Node Exporter    |     | Zabbix Agent     |     | Promtail         |
| (per server)     |     | (per server)     |     | (per server)     |
+--------+---------+     +--------+---------+     +--------+---------+
         |                        |                        |
         v                        v                        v
+------------------+     +------------------+     +------------------+
| Prometheus       |     | Zabbix Server    |     | Loki             |
| (metrics)        |     | (SNMP/IPMI/HW)   |     | (logs)           |
+--------+---------+     +--------+---------+     +--------+---------+
         |                        |                        |
         +----------+-------------+----------+-------------+
                    |                        |
                    v                        v
         +------------------+     +------------------+
         | Grafana          |     | Alertmanager     |
         | (dashboards)     |     | (notifications)  |
         +------------------+     +------------------+
                                         |
                    +--------------------+--------------------+
                    |                    |                    |
                    v                    v                    v
              Slack/Teams          PagerDuty            Email/SMS
```

### 11.2 Tool Assignments

| Tool | Purpose | Cost |
|------|---------|------|
| **Prometheus** | Time-series metrics (CPU, RAM, disk, network, app metrics) | Free |
| **Grafana** | Visualization dashboards, alerting | Free (OSS) |
| **Zabbix** | Hardware monitoring (IPMI, SNMP, temperature, fan, RAID) | Free |
| **Loki + Promtail** | Centralized log aggregation | Free |
| **Alertmanager** | Alert routing (dedup, grouping, silencing) | Free |
| **Uptime Kuma** | External uptime monitoring + status page | Free |
| **LibreNMS** | Network device monitoring (switches, routers, firewalls) | Free |

### 11.3 Key Metrics to Monitor

**Infrastructure:**
- CPU utilization per node and per VM
- Memory usage (host and guest)
- Disk I/O (IOPS, throughput, latency)
- Network bandwidth (per port, per VM)
- Disk space utilization
- Temperature and hardware health (via IPMI)

**Services:**
- HTTP response time and status codes
- DNS query latency
- Mail queue length
- Database connections and slow queries
- SSL certificate expiry
- Backup success/failure

**Business:**
- Active VMs/containers count
- Resource utilization percentage (sold vs available)
- Customer count trends
- Revenue per server
- Ticket volume and response time

### 11.4 Alerting Rules

```yaml
# Prometheus alert rules example
groups:
  - name: infrastructure
    rules:
      - alert: HighCPUUsage
        expr: node_cpu_seconds_total{mode="idle"} < 10
        for: 5m
        labels:
          severity: warning

      - alert: DiskSpaceLow
        expr: node_filesystem_avail_bytes / node_filesystem_size_bytes < 0.10
        for: 10m
        labels:
          severity: critical

      - alert: NodeDown
        expr: up == 0
        for: 2m
        labels:
          severity: critical

      - alert: HighMemoryUsage
        expr: node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes < 0.10
        for: 5m
        labels:
          severity: critical
```

---

## 12. SECURITY LAYER

### 12.1 Firewall Architecture

```
Layer 1: Border Firewall (FortiGate 100F)
  - Stateful inspection
  - IPS/IDS
  - Anti-DDoS basic filtering
  - Rate limiting
  - Geo-blocking (if needed)

Layer 2: Host Firewall (nftables/iptables)
  - Per-server rules
  - Default deny incoming
  - Allow only necessary ports
  - Rate limiting SSH/FTP

Layer 3: VM/Container Firewall
  - Proxmox firewall (per-VM rules)
  - Customer-configurable via panel

Layer 4: Application Firewall
  - ModSecurity / Imunify360 WAF (shared hosting)
  - Cloudflare WAF (web traffic)
```

### 12.2 Security Tools by Product

| Product | Security Stack |
|---------|---------------|
| **Shared Hosting** | Imunify360 (WAF + IDS + IPS + AV + Firewall) -- ~$12/server/mo |
| **VPS/VDS** | Customer responsibility; provide Fail2ban, UFW guides |
| **Dedicated** | Customer responsibility; offer managed security add-on |
| **Infrastructure** | Wazuh (SIEM/XDR) for internal monitoring |

### 12.3 Imunify360 (Shared Hosting)

- Comprehensive: WAF + IDS + IPS + Network Firewall + Proactive Defense + File Antivirus
- Integrates with CyberPanel and LiteSpeed
- IMPORTANT: Disable Fail2ban when using Imunify360 (they conflict)
- Auto-patches known vulnerabilities in WordPress/Joomla/etc.
- Herd immunity -- threat intelligence shared across all Imunify360 installations

### 12.4 Wazuh (Infrastructure SIEM)

- Open source SIEM + XDR platform
- File integrity monitoring (detect unauthorized changes)
- Vulnerability detection
- Compliance reporting (PCI-DSS, GDPR)
- Centralized log analysis
- Active response (auto-block IPs, run scripts)
- Deploy agent on all infrastructure servers
- Do NOT install on customer VPS (their responsibility)

### 12.5 Additional Security Measures

```
1. SSH Hardening:
   - Disable password auth (key-only)
   - Change default port
   - AllowUsers/AllowGroups restrictions
   - Fail2ban for brute force protection

2. Intrusion Detection:
   - Wazuh agents on all infrastructure nodes
   - OSSEC rules for file integrity monitoring
   - ClamAV for malware scanning (shared hosting)

3. Network Security:
   - VLAN isolation between management, storage, and customer networks
   - Out-of-band management network for IPMI/iDRAC
   - ACLs on all switch ports
   - 802.1X port authentication (future)

4. Backup Security:
   - Encrypted backups (AES-256)
   - Off-site backup replication
   - Backup integrity verification
   - Immutable backups (protection against ransomware)

5. PCI Compliance Considerations:
   - If processing credit cards: PCI-DSS Level 4 (< 20K transactions)
   - Use PCI-compliant payment gateway (CyberSource)
   - Segment cardholder data environment
   - Quarterly vulnerability scans (via Wazuh)
   - Annual self-assessment questionnaire (SAQ-A for most hosting)
```

---

## 13. CUSTOMER-FACING PLATFORM

### 13.1 Website Architecture (Next.js)

```
Tech Stack:
- Next.js 15+ (App Router, SSR/SSG/ISR)
- React 19
- TypeScript
- Tailwind CSS + shadcn/ui
- PostgreSQL (via Prisma ORM)
- Redis (caching, sessions)
- Zod (validation)

Pages:
- Landing page (SSG) -- marketing, pricing
- Product pages (SSG) -- VPS, Shared, Dedicated, Domain, Email
- Domain search (CSR) -- real-time availability check
- Pricing calculator (CSR) -- interactive resource selection
- Blog/Knowledge Base (SSG/ISR) -- SEO content
- Status page (ISR/SSR) -- real-time uptime status
- Login/Register (SSR)
- Customer Dashboard (SSR) -- authenticated area
```

### 13.2 Unified Customer Dashboard

```
Dashboard Architecture:
+-------------------------------------------------------------------+
|  Top Navigation: Logo | Services | Billing | Support | Account    |
+-------------------------------------------------------------------+
|                                                                   |
|  +--------------------+  +--------------------+                   |
|  | Active Services    |  | Quick Actions      |                   |
|  | 3 VPS              |  | [+ New VPS]        |                   |
|  | 2 Domains          |  | [+ New Domain]     |                   |
|  | 1 Hosting Plan     |  | [+ New Hosting]    |                   |
|  | 5 Email Accounts   |  | [Open Ticket]      |                   |
|  +--------------------+  +--------------------+                   |
|                                                                   |
|  +--------------------+  +--------------------+                   |
|  | Resource Usage     |  | Recent Invoices    |                   |
|  | CPU: 45%           |  | #1234 - Paid       |                   |
|  | RAM: 72%           |  | #1235 - Due        |                   |
|  | Disk: 30%          |  | #1236 - Overdue    |                   |
|  | BW: 120GB/1TB      |  |                    |                   |
|  +--------------------+  +--------------------+                   |
+-------------------------------------------------------------------+
```

**Module Structure (Domain-Driven):**
```
/app
  /dashboard          # Overview
  /servers
    /vps              # VPS management (power, console, OS, snapshots)
    /dedicated        # Dedicated server management
  /hosting
    /sites            # Shared hosting sites
    /[siteId]         # Per-site management (File Manager, DB, Email, etc.)
  /domains
    /search           # Domain search
    /manage           # Domain management (DNS, WHOIS, transfers)
  /email
    /accounts         # Email account management
  /billing
    /invoices         # Invoice history
    /payment-methods  # Saved payment methods
    /subscriptions    # Active subscriptions
  /support
    /tickets          # Support tickets
    /knowledge-base   # Self-help articles
  /account
    /profile          # Personal info
    /security         # 2FA, API keys, SSH keys
    /team             # Team/sub-user management
  /api
    /v1               # REST API routes (for B2B customers)
```

### 13.3 API Design for B2B Customers

```
REST API v1 Endpoints:

# Authentication
POST   /api/v1/auth/token          # Get API token
POST   /api/v1/auth/refresh        # Refresh token

# VPS
GET    /api/v1/vps                 # List VPS instances
POST   /api/v1/vps                 # Create VPS
GET    /api/v1/vps/{id}            # Get VPS details
DELETE /api/v1/vps/{id}            # Delete VPS
POST   /api/v1/vps/{id}/start      # Start VPS
POST   /api/v1/vps/{id}/stop       # Stop VPS
POST   /api/v1/vps/{id}/restart    # Restart VPS
POST   /api/v1/vps/{id}/reinstall  # Reinstall OS
GET    /api/v1/vps/{id}/console    # Get console URL
POST   /api/v1/vps/{id}/snapshots  # Create snapshot
PUT    /api/v1/vps/{id}/resize     # Resize VPS

# Domains
GET    /api/v1/domains             # List domains
POST   /api/v1/domains/check       # Check availability
POST   /api/v1/domains             # Register domain
GET    /api/v1/domains/{id}/dns    # Get DNS records
PUT    /api/v1/domains/{id}/dns    # Update DNS records

# Hosting
POST   /api/v1/hosting             # Create hosting account
GET    /api/v1/hosting/{id}        # Get hosting details

# Rate limiting: 60 requests/minute per API key
# Auth: Bearer token in Authorization header
# Format: JSON
# Versioned: /api/v1/, /api/v2/
```

### 13.4 Support Ticket System

**Options:**
1. **WHMCS built-in:** Basic but functional, integrated with billing
2. **osTicket:** Free, open source, feature-rich
3. **Chatwoot:** Open source, live chat + tickets + email
4. **FreshDesk:** Paid, excellent UX, knowledge base included
5. **Custom built:** Full integration with dashboard

**Recommended:** WHMCS tickets (Phase 1) + Chatwoot for live chat (Phase 1) -> Custom integrated system (Phase 3+)

### 13.5 Knowledge Base

- Integrate with Next.js site using MDX content
- Categories: Getting Started, VPS Guides, Hosting Guides, Domain Management, Billing, Security
- SEO-optimized for organic traffic (hosting tutorials drive signups)
- Search functionality with Algolia or Meilisearch

### 13.6 Status Page

**Uptime Kuma (recommended -- free, self-hosted):**
- Monitor all services (HTTP, TCP, DNS, ping)
- Public status page with incident history
- Notification integrations (Slack, Discord, Email, SMS)
- Customizable branding
- Certificate expiry monitoring
- Response time graphs

---

## 14. STARTUP COST ANALYSIS & PHASED PLAN

### 14.1 Phase 1: Minimum Viable Product (Month 0-6)

**Products:** Shared Hosting + Domain Registration + Basic VPS

| Category | Item | Cost (USD) |
|----------|------|-----------|
| **Hardware** | 2x VPS Hypervisor Nodes (Supermicro) | $20,000 |
| **Hardware** | 1x Shared Hosting Node | $8,000 |
| **Hardware** | 1x Management Server | $4,000 |
| **Hardware** | Network equipment (switches, router, firewall) | $8,000 |
| **Colocation** | 1/2 rack at Web Werks Mumbai (6 months) | $6,000 |
| **IP Addresses** | /24 block lease (6 months) | $1,200 |
| **Software** | WHMCS Starter (6 months) | $180 |
| **Software** | Virtualizor (2 nodes, 6 months) | $108 |
| **Software** | CloudLinux (1 server, 6 months) | $84 |
| **Software** | Imunify360 (1 server, 6 months) | $72 |
| **Domain** | ResellerClub reseller deposit | $500 |
| **Development** | Website + Dashboard (Next.js) | $5,000 |
| **Legal** | Company registration, IANA/APNIC fees | $1,500 |
| **Marketing** | Initial launch marketing | $2,000 |
| **Misc** | SSL, monitoring tools, contingency | $2,000 |
| | **TOTAL PHASE 1** | **~$58,644** |

**Monthly Operating Costs (Phase 1):**

| Item | Monthly Cost (USD) |
|------|-------------------|
| Colocation (1/2 rack) | $1,000 |
| IP lease (/24) | $200 |
| Bandwidth (1 Gbps commit) | $500 |
| WHMCS | $30 |
| Virtualizor | $18 |
| CloudLinux | $14 |
| Imunify360 | $12 |
| Support staff (1 person, Nepal) | $300-500 |
| Domain/DNS costs | $50 |
| **Total Monthly OpEx** | **~$2,124 - $2,324** |

### 14.2 Phase 2: Growth (Month 6-18)

**Add:** VDS (Dedicated CPU VPS), More Shared Hosting capacity, Email Hosting

| Category | Item | Cost (USD) |
|----------|------|-----------|
| **Hardware** | 2 additional Hypervisor Nodes | $20,000 |
| **Hardware** | 1 additional Shared Hosting Node | $8,000 |
| **Hardware** | 1 Backup/Storage Server | $7,000 |
| **IP Addresses** | Purchase /22 block (1024 IPs) | $45,000 |
| **Network** | ASN registration (APNIC) | $350 |
| **Software** | Mailcow server setup | $2,000 |
| **Development** | Custom VPS panel development | $10,000 |
| **Marketing** | Expanded marketing | $5,000 |
| | **TOTAL PHASE 2** | **~$97,350** |

**Monthly Operating Costs (Phase 2):**

| Item | Monthly Cost (USD) |
|------|-------------------|
| Colocation (full rack) | $2,000 |
| Bandwidth (2 Gbps) | $800 |
| WHMCS + modules | $50 |
| Virtualizor (4 nodes) | $36 |
| CloudLinux (2 servers) | $28 |
| Imunify360 (2 servers) | $24 |
| Support staff (2 people) | $700 |
| Email server costs | $100 |
| **Total Monthly OpEx** | **~$3,738** |

### 14.3 Phase 3: Scale (Month 18-36)

**Add:** Dedicated Servers, GPU VPS, Custom Billing, Premium Support

| Category | Item | Cost (USD) |
|----------|------|-----------|
| **Hardware** | 5 Dedicated Server inventory (Dell PowerEdge) | $40,000 |
| **Hardware** | 2 GPU Servers (NVIDIA T4/L4) | $30,000 |
| **Hardware** | Additional Hypervisor Nodes | $30,000 |
| **Hardware** | Second rack + networking | $15,000 |
| **Network** | BGP setup + transit agreements | $5,000 |
| **Development** | Custom billing + full dashboard | $30,000 |
| **Staff** | Additional engineers + support | $15,000/yr |
| | **TOTAL PHASE 3** | **~$165,000** |

### 14.4 Break-Even Analysis

**Assumptions:**
- Average revenue per VPS: $15/month
- Average revenue per shared hosting: $5/month
- Average revenue per domain: $12/year ($1/month)
- Average revenue per dedicated server: $80/month
- Customer acquisition cost: $20
- Customer lifetime: 24 months

**Phase 1 Break-Even:**
- Monthly OpEx: ~$2,200
- Need ~150 shared hosting customers OR ~147 VPS customers OR mix
- At 30 new customers/month: Break-even at Month 5 of operations
- Total investment recovery: ~24 months

**Phase 1-3 Total Investment: ~$320,000 over 3 years**

**Revenue Target for Sustainability:**
- 500 VPS @ $15/mo = $7,500/mo
- 1000 shared hosting @ $5/mo = $5,000/mo
- 500 domains @ $1/mo = $500/mo
- 20 dedicated servers @ $80/mo = $1,600/mo
- Total: ~$14,600/month
- Monthly OpEx (Phase 3): ~$6,000-8,000/month
- Monthly profit: ~$6,600-8,600/month

### 14.5 Summary: Investment Timeline

| Phase | Timeline | Investment | Cumulative | Products |
|-------|----------|------------|------------|----------|
| Phase 1 | Month 0-6 | $58,644 | $58,644 | Shared Hosting, Domains, Basic VPS |
| Phase 2 | Month 6-18 | $97,350 | $155,994 | VDS, Email, More VPS, Own IPs |
| Phase 3 | Month 18-36 | $165,000 | $320,994 | Dedicated, GPU VPS, Custom Platform |
| Phase 4 | Month 36+ | Variable | Variable | Own DC consideration, CDN, Object Storage |

---

## APPENDIX A: COMPLETE TECHNOLOGY STACK SUMMARY

| Layer | Technology | License | Monthly Cost |
|-------|-----------|---------|-------------|
| Hypervisor | Proxmox VE 9 | Free (AGPL) | $0 |
| VPS Panel | Virtualizor -> Custom | $7-9/node | $18-36 |
| Shared Hosting OS | CloudLinux 8 | Commercial | $14/server |
| Hosting Panel | CyberPanel | Free | $0 |
| Web Server | OpenLiteSpeed | Free | $0 |
| DNS Server | PowerDNS | Free (GPL) | $0 |
| Domain Registrar | ResellerClub API | Free API | Per-domain |
| SSL | Let's Encrypt + acme.sh | Free | $0 |
| Email | Mailcow / Titan (resell) | Free / Per-mailbox | Variable |
| Billing | WHMCS | From $29.95/mo | $30-50 |
| Monitoring | Prometheus + Grafana + Zabbix | Free | $0 |
| Logging | Loki + Promtail | Free | $0 |
| Security (Shared) | Imunify360 | Commercial | $12/server |
| Security (Infra) | Wazuh | Free | $0 |
| DDoS | Cloudflare (Free/Pro) | Free-$200/mo | $0-200 |
| Backup | Proxmox PBS + rsync | Free | $0 |
| Status Page | Uptime Kuma | Free | $0 |
| Bare Metal | MAAS | Free | $0 |
| Router/BGP | MikroTik / FRRouting | Free/$2K one-time | $0 |

## APPENDIX B: KEY VENDOR CONTACTS

| Vendor | Purpose | Contact |
|--------|---------|---------|
| Web Werks (Iron Mountain) | Colocation Mumbai | webwerks.in |
| Cyfuture | Budget Colocation | cyfuture.cloud |
| CtrlS | Tier IV Colocation | ctrls.in |
| APNIC | IP/ASN Registration | apnic.net |
| ResellerClub | Domains/SSL/Email Reseller | resellerclub.com |
| Supermicro | Server Hardware | supermicro.com |
| AGM Web Hosting | Nepal Payment WHMCS Modules | nepal.agmwebhosting.com |

## APPENDIX C: KEY URLS & DOCUMENTATION

- Proxmox VE API: https://pve.proxmox.com/wiki/Proxmox_VE_API
- PowerDNS API: https://doc.powerdns.com/authoritative/http-api/
- ResellerClub API: https://manage.resellerclub.com/kb/node/601
- APNIC Membership: https://www.apnic.net/get-ip/apnic-membership/
- Virtualizor: https://www.virtualizor.com/
- VirtFusion: https://virtfusion.com/
- CyberPanel: https://cyberpanel.net/
- CloudLinux: https://www.cloudlinux.com/
- MAAS: https://maas.io/
- Mailcow: https://mailcow.email/
- WHMCS: https://www.whmcs.com/
- acme.sh: https://github.com/acmesh-official/acme.sh
- Uptime Kuma: https://github.com/louislam/uptime-kuma
- Wazuh: https://wazuh.com/
- Imunify360: https://imunify360.com/

---

*This document represents a complete infrastructure architecture for building a full-scale hosting provider from scratch. All cost estimates are approximate and should be validated with current vendor pricing. Technology recommendations are based on 2025-2026 market analysis.*
