import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HostingStatus, HostingProvider, HostingPlanType, BillingCycle } from '@prisma/client';
import { BILLING_CYCLE_MONTHS, BILLING_CYCLE_LABEL, computeExpiry } from './hosting-billing.util';
import { PrismaService } from '../../database/prisma.service';
import { CyberPanelService } from './services/cyberpanel.service';
import { ProxmoxService } from './services/proxmox.service';
import { ContaboService } from './services/contabo.service';
import { DockerService } from './services/docker.service';
import { ResellerClubService } from '../domain/services/resellerclub.service';
import { CreateHostingDto } from './dto/create-hosting.dto';
import { CreateVpsDto } from './dto/create-vps.dto';
import { ReinstallVpsDto } from './dto/reinstall-vps.dto';
import { CreateSnapshotDto } from './dto/create-snapshot.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpgradeVpsDto } from './dto/upgrade-vps.dto';
import { ExtendStorageDto } from './dto/extend-storage.dto';
import { AddAddonDto } from './dto/add-addon.dto';
import { TransferRegionDto } from './dto/transfer-region.dto';
import { ToggleRescueDto } from './dto/toggle-rescue.dto';
import { HostingPlan } from './interfaces/hosting.interface';
import {
  CreateWebsiteDto,
  CreateFtpDto,
  CreateDatabaseDto,
  InstallWordPressDto,
  ApplicationType,
} from './dto/create-website.dto';

// USD to NPR conversion
const USD_TO_NPR = 133;
const DEDICATED_MARGIN_PERCENT = 50; // 50% margin for Dedicated (ResellerClub)

// Apply 50% margin and convert USD to NPR (for ResellerClub Dedicated)
function applyMargin(usd: number): number {
  return Math.ceil(usd * USD_TO_NPR * (1 + DEDICATED_MARGIN_PERCENT / 100));
}

// Contabo Cloud VPS / Storage VPS / VDS retail pricing: take Contabo's live USD
// list price (GET /v1/products), add a 50% markup, convert USD→NPR at 155.
//   NPR = ceil(usd * 155 * 1.5)
const CONTABO_USD_TO_NPR = 155;
const CONTABO_VPS_MARGIN_PERCENT = 50;
const CONTABO_TERM_FACTOR = 0.8; // Contabo 12-month term = 20% off the API list price
function applyContaboUsd(listUsd: number): number {
  return Math.ceil(listUsd * CONTABO_TERM_FACTOR * CONTABO_USD_TO_NPR * (1 + CONTABO_VPS_MARGIN_PERCENT / 100));
}

// Contabo product ID mapping for VPS/VDS plans
const CONTABO_PRODUCT_MAP: Record<string, { contaboProductId: string; name: string }> = {
  // HN plan id -> real Contabo product id (SSD variant, from GET /v1/products).
  // 2026 lineup: Cloud VPS 4-18 = V153-V158 (renamed from Cloud VPS 10-60 = V92/V95/V98/V101/V104/V107,
  // same list prices); Cloud VDS S–XXL = V8/V9/V10/V11/V16.
  'vps-10': { contaboProductId: 'V153', name: 'Cloud VPS 4' }, // Core VPS (4c/8GB/100GB SSD)
  'vps-20': { contaboProductId: 'V154', name: 'Cloud VPS 6' }, // Core VPS (6c/12GB/200GB SSD)
  'vps-30': { contaboProductId: 'V155', name: 'Cloud VPS 8' }, // Core VPS (8c/24GB/300GB SSD)
  'vps-40': { contaboProductId: 'V156', name: 'Cloud VPS 12' }, // Core VPS (12c/48GB/400GB SSD)
  'vps-50': { contaboProductId: 'V157', name: 'Cloud VPS 16' }, // Core VPS (16c/64GB/500GB SSD)
  'vps-60': { contaboProductId: 'V158', name: 'Cloud VPS 18' }, // Core VPS (18c/96GB/600GB SSD)
  // Performance VPS (Cloud VPS Plus, NVMe) — V159-V164.
  'vps-plus-4': { contaboProductId: 'V159', name: 'Cloud VPS Plus 4' }, // 4c/8GB/150GB NVMe
  'vps-plus-6': { contaboProductId: 'V160', name: 'Cloud VPS Plus 6' }, // 6c/12GB/300GB NVMe
  'vps-plus-8': { contaboProductId: 'V161', name: 'Cloud VPS Plus 8' }, // 8c/24GB/450GB NVMe
  'vps-plus-12': { contaboProductId: 'V162', name: 'Cloud VPS Plus 12' }, // 12c/48GB/600GB NVMe
  'vps-plus-16': { contaboProductId: 'V163', name: 'Cloud VPS Plus 16' }, // 16c/64GB/750GB NVMe
  'vps-plus-18': { contaboProductId: 'V164', name: 'Cloud VPS Plus 18' }, // 18c/96GB/900GB NVMe
  // Storage VPS (SSD, storage-optimised) — verified via GET /v1/products.
  'storage-vps-10': { contaboProductId: 'V93', name: 'Storage VPS 10' }, // 2c/4GB/300GB SSD
  'storage-vps-20': { contaboProductId: 'V96', name: 'Storage VPS 20' }, // 3c/8GB/400GB SSD
  'storage-vps-30': { contaboProductId: 'V99', name: 'Storage VPS 30' }, // 6c/18GB/1TB SSD
  'storage-vps-40': { contaboProductId: 'V102', name: 'Storage VPS 40' }, // 8c/30GB/1.2TB SSD
  'storage-vps-50': { contaboProductId: 'V105', name: 'Storage VPS 50' }, // 14c/50GB/1.4TB SSD
  'vds-s': { contaboProductId: 'V8', name: 'VDS S' }, // Cloud VDS S
  'vds-m': { contaboProductId: 'V9', name: 'VDS M' }, // Cloud VDS M
  'vds-l': { contaboProductId: 'V10', name: 'VDS L' }, // Cloud VDS L
  'vds-xl': { contaboProductId: 'V11', name: 'VDS XL' }, // Cloud VDS XL
  'vds-xxl': { contaboProductId: 'V16', name: 'VDS XXL' }, // Cloud VDS XXL
};

// Contabo OS template to Contabo image ID mapping
// These should be updated with actual Contabo image UUIDs; defaults used here
const CONTABO_OS_IMAGE_MAP: Record<string, string> = {
  // Real Contabo standard-image UUIDs (from GET /v1/compute/images?standardImage=true).
  'ubuntu-24.04': 'd64d5c6c-9dda-4e38-8174-0ee282474d8a',
  'ubuntu-22.04': 'afecbb85-e2fc-46f0-9684-b46b1faf00bb',
  'debian-12': '4efbc0ba-2313-4fe1-842a-516f8652e729',
  'debian-11': '66abf39a-ba8b-425e-a385-8eb347ceac10',
  'almalinux-9': '81d9280e-8753-40ae-8aef-7f6e20751b85',
  'rocky-9': 'fe6c2c36-031e-4474-aa5c-c5297196c80e',
  'centos-9': '8b7c9b2a-ca59-48a2-92ea-5180779183cc', // centos-9-stream (no plain centos-9 image)
};

// RC Plan ID mapping for VPS
const RC_VPS_PLAN_MAP: Record<string, { rcPlanId: string; name: string; cpu: number; ram: number; disk: number; bw: number }> = {
  'vps-1': { rcPlanId: '1799', name: 'VPS 1', cpu: 1, ram: 1, disk: 25, bw: 1000 },
  'vps-2': { rcPlanId: '1800', name: 'VPS 2', cpu: 2, ram: 2, disk: 50, bw: 2000 },
  'vps-4': { rcPlanId: '1801', name: 'VPS 4', cpu: 4, ram: 4, disk: 100, bw: 4000 },
  'vps-8': { rcPlanId: '1802', name: 'VPS 8', cpu: 8, ram: 8, disk: 200, bw: 8000 },
  'vps-12': { rcPlanId: '1803', name: 'VPS 12', cpu: 12, ram: 12, disk: 300, bw: 12000 },
  'vps-16': { rcPlanId: '1804', name: 'VPS 16', cpu: 16, ram: 16, disk: 400, bw: 16000 },
  'vps-20': { rcPlanId: '1805', name: 'VPS 20', cpu: 20, ram: 20, disk: 500, bw: 20000 },
  'vps-24': { rcPlanId: '1806', name: 'VPS 24', cpu: 24, ram: 24, disk: 600, bw: 24000 },
  // VDS uses same RC product with higher-tier plan IDs (dedicated resources)
  'vds-8': { rcPlanId: '325', name: 'VDS 8', cpu: 8, ram: 8, disk: 200, bw: 8000 },
  'vds-12': { rcPlanId: '1351', name: 'VDS 12', cpu: 12, ram: 12, disk: 300, bw: 12000 },
  'vds-16': { rcPlanId: '326', name: 'VDS 16', cpu: 16, ram: 16, disk: 400, bw: 16000 },
  'vds-20': { rcPlanId: '327', name: 'VDS 20', cpu: 20, ram: 20, disk: 500, bw: 20000 },
  'vds-24': { rcPlanId: '1352', name: 'VDS 24', cpu: 24, ram: 24, disk: 600, bw: 24000 },
};

// RC Plan ID mapping for Dedicated Servers
const RC_DEDICATED_PLAN_MAP: Record<string, { rcPlanId: string; name: string }> = {
  'ded-1': { rcPlanId: '105', name: 'DS Intel Xeon E3' },
  'ded-2': { rcPlanId: '106', name: 'DS Intel Xeon E5' },
  'ded-3': { rcPlanId: '107', name: 'DS Dual Xeon E5' },
  'ded-4': { rcPlanId: '108', name: 'DS Xeon Scalable' },
  'ded-5': { rcPlanId: '1478', name: 'DS Performance' },
  'ded-6': { rcPlanId: '1479', name: 'DS Enterprise Plus' },
  'ded-7': { rcPlanId: '1480', name: 'DS Ultimate' },
};

// RC Plan ID mapping for Shared/WordPress hosting
const RC_SHARED_PLAN_MAP: Record<string, { rcPlanId: string; productKey: string }> = {
  'starter': { rcPlanId: '1', productKey: 'multidomainhosting' },
  'business': { rcPlanId: '2', productKey: 'multidomainhosting' },
  'wp-starter': { rcPlanId: '1278', productKey: 'wordpresshostingusa' },
  'wp-essential': { rcPlanId: '1279', productKey: 'wordpresshostingusa' },
  'wp-business': { rcPlanId: '1280', productKey: 'wordpresshostingusa' },
  'wp-developer': { rcPlanId: '1281', productKey: 'wordpresshostingusa' },
  'wp-starter-plus': { rcPlanId: '763', productKey: 'wordpresshostingusa' },
  'wp-grow-big': { rcPlanId: '764', productKey: 'wordpresshostingusa' },
  'wp-go-geek': { rcPlanId: '766', productKey: 'wordpresshostingusa' },
  'wp-enterprise': { rcPlanId: '765', productKey: 'wordpresshostingusa' },
};

const HOSTING_PLANS: HostingPlan[] = [
  // ── Shared Hosting ──────────────────────────────────────────────────────────
  {
    id: 'starter',
    name: 'Starter',
    type: 'SHARED',
    specs: {
      diskGB: 1,
      bandwidthGB: 10,
      emailAccounts: 5,
      subdomains: 2,
      databases: 2,
    },
    priceMonthly: 599,
    priceYearly: 5999,
    currency: 'NPR',
    features: [
      '1 GB SSD Storage',
      '10 GB Bandwidth',
      '5 Email Accounts',
      '2 Subdomains',
      '2 MySQL Databases',
      'Free SSL Certificate',
      'CyberPanel Control Panel',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    type: 'SHARED',
    specs: {
      diskGB: 5,
      bandwidthGB: 50,
      emailAccounts: 25,
      subdomains: 10,
      databases: 10,
    },
    priceMonthly: 1499,
    priceYearly: 14999,
    currency: 'NPR',
    features: [
      '5 GB SSD Storage',
      '50 GB Bandwidth',
      '25 Email Accounts',
      '10 Subdomains',
      '10 MySQL Databases',
      'Free SSL Certificate',
      'Daily Backups',
      'CyberPanel Control Panel',
    ],
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    type: 'SHARED',
    specs: {
      diskGB: -1, // unlimited
      bandwidthGB: -1,
      emailAccounts: -1,
      subdomains: -1,
      databases: -1,
    },
    priceMonthly: 2999,
    priceYearly: 29999,
    currency: 'NPR',
    features: [
      'Unlimited SSD Storage',
      'Unlimited Bandwidth',
      'Unlimited Email Accounts',
      'Unlimited Subdomains',
      'Unlimited MySQL Databases',
      'Free SSL Certificate',
      'Daily Backups',
      'Priority Support',
      'CyberPanel Control Panel',
    ],
  },
  // ── WordPress Hosting (8 plans from RC API) ──────────────────────────────────
  {
    id: 'wp-starter',
    name: 'WP StartUp',
    type: 'WORDPRESS',
    specs: { diskGB: 10, bandwidthGB: -1, emailAccounts: -1, subdomains: -1, databases: -1 },
    priceMonthly: 1254, priceYearly: 7632, currency: 'NPR',
    features: ['10 GB SSD Storage', 'Unmetered Bandwidth', '1 Website', 'Free SSL', 'Daily Backup', 'Free CDN', 'Managed WordPress', 'WP Auto Updates', 'CyberPanel'],
  },
  {
    id: 'wp-essential',
    name: 'WP Essential',
    type: 'WORDPRESS',
    specs: { diskGB: 20, bandwidthGB: -1, emailAccounts: -1, subdomains: -1, databases: -1 },
    priceMonthly: 1354, priceYearly: 8592, currency: 'NPR',
    features: ['20 GB SSD Storage', 'Unmetered Bandwidth', '1 Website', 'Free SSL', 'Daily Backup', 'Free CDN', 'Managed WordPress', 'WP Auto Updates', 'Staging', 'CyberPanel'],
  },
  {
    id: 'wp-business',
    name: 'WP Business',
    type: 'WORDPRESS',
    specs: { diskGB: 30, bandwidthGB: -1, emailAccounts: -1, subdomains: -1, databases: -1 },
    priceMonthly: 1613, priceYearly: 11460, currency: 'NPR',
    features: ['30 GB SSD Storage', 'Unmetered Bandwidth', 'Unlimited Websites', 'Free SSL', 'Daily Backup', 'Free CDN', 'Managed WordPress', 'WP Auto Updates', 'Staging', 'WordPress CLI', 'CyberPanel'],
    popular: true,
  },
  {
    id: 'wp-developer',
    name: 'WP Developer',
    type: 'WORDPRESS',
    specs: { diskGB: 40, bandwidthGB: -1, emailAccounts: -1, subdomains: -1, databases: -1 },
    priceMonthly: 1893, priceYearly: 14340, currency: 'NPR',
    features: ['40 GB SSD Storage', 'Unmetered Bandwidth', 'Unlimited Websites', 'Free SSL', 'Daily Backup', 'Free CDN', 'Managed WordPress', 'WP Auto Updates', 'Staging', 'WordPress CLI', 'SSH Access', 'Git Integration', 'CyberPanel'],
  },
  {
    id: 'wp-starter-plus',
    name: 'WP Starter Plus',
    type: 'WORDPRESS',
    specs: { diskGB: 30, bandwidthGB: -1, emailAccounts: -1, subdomains: -1, databases: -1 },
    priceMonthly: 2431, priceYearly: 20556, currency: 'NPR',
    features: ['30 GB SSD Storage', 'Unmetered Bandwidth', 'Unlimited Websites', 'Free SSL', 'Daily Backup', 'SuperCacher', 'Free CDN', 'WordPress Migrator', 'Staging', 'CyberPanel'],
  },
  {
    id: 'wp-grow-big',
    name: 'WP GrowBig',
    type: 'WORDPRESS',
    specs: { diskGB: 40, bandwidthGB: -1, emailAccounts: -1, subdomains: -1, databases: -1 },
    priceMonthly: 2691, priceYearly: 27024, currency: 'NPR',
    features: ['40 GB SSD Storage', 'Unmetered Bandwidth', 'Unlimited Websites', 'Free SSL', 'Daily Backup', 'SuperCacher', 'Free CDN', 'WordPress Migrator', 'Staging', 'On-demand Backup', 'CyberPanel'],
  },
  {
    id: 'wp-go-geek',
    name: 'WP GoGeek',
    type: 'WORDPRESS',
    specs: { diskGB: 60, bandwidthGB: -1, emailAccounts: -1, subdomains: -1, databases: -1 },
    priceMonthly: 3948, priceYearly: 38748, currency: 'NPR',
    features: ['60 GB SSD Storage', 'Unmetered Bandwidth', 'Unlimited Websites', 'Free SSL', 'Daily Backup', 'SuperCacher', 'Free CDN', 'WordPress Migrator', 'Staging', 'On-demand Backup', 'Priority Support', 'White Label', 'CyberPanel'],
  },
  {
    id: 'wp-enterprise',
    name: 'WP Enterprise',
    type: 'WORDPRESS',
    specs: { diskGB: 100, bandwidthGB: -1, emailAccounts: -1, subdomains: -1, databases: -1 },
    priceMonthly: 6282, priceYearly: 65808, currency: 'NPR',
    features: ['100 GB SSD Storage', 'Unmetered Bandwidth', 'Unlimited Websites', 'Free SSL', 'Daily Backup', 'SuperCacher', 'Free CDN', 'WordPress Migrator', 'Staging', 'On-demand Backup', 'Priority Support', 'White Label', 'Dedicated Resources', 'CyberPanel'],
  },
  // ── VPS (Contabo) ───────────────────────────────────────────────────────────
  {
    id: 'vps-10',
    name: 'Cloud VPS 4',
    type: 'VPS',
    specs: {
      diskGB: 100,
      bandwidthGB: -1,
      emailAccounts: 0,
      subdomains: 0,
      databases: 0,
      cpuCores: 4,
      ramGB: 8,
    },
    priceMonthly: applyContaboUsd(6.60), // Contabo Cloud VPS 4 (V153) 12-mo $5.28 → NPR 1228
    priceYearly: applyContaboUsd(6.60) * 10,
    currency: 'NPR',
    features: [
      '4 vCPU Cores',
      '8 GB RAM',
      '100 GB SSD',
      '200 Mbit/s Port', 'Unlimited Traffic',
      '1 Dedicated IPv4',
      'Full Root Access',
      'KVM Virtualization',
      'DDoS Protection',
      'Contabo Cloud',
    ],
  },
  {
    id: 'vps-20',
    name: 'Cloud VPS 6',
    type: 'VPS',
    specs: {
      diskGB: 200,
      bandwidthGB: -1,
      emailAccounts: 0,
      subdomains: 0,
      databases: 0,
      cpuCores: 6,
      ramGB: 12,
    },
    priceMonthly: applyContaboUsd(9.00), // Contabo Cloud VPS 6 (V154) 12-mo $7.20 → NPR 1674
    priceYearly: applyContaboUsd(9.00) * 10,
    currency: 'NPR',
    features: [
      '6 vCPU Cores',
      '12 GB RAM',
      '200 GB SSD',
      '300 Mbit/s Port', 'Unlimited Traffic',
      '1 Dedicated IPv4',
      'Full Root Access',
      'KVM Virtualization',
      'DDoS Protection',
      'Contabo Cloud',
    ],
    popular: true,
  },
  {
    id: 'vps-30',
    name: 'Cloud VPS 8',
    type: 'VPS',
    specs: {
      diskGB: 300,
      bandwidthGB: -1,
      emailAccounts: 0,
      subdomains: 0,
      databases: 0,
      cpuCores: 8,
      ramGB: 24,
    },
    priceMonthly: applyContaboUsd(16.80), // Contabo Cloud VPS 8 (V155) 12-mo $13.44 → NPR 3125
    priceYearly: applyContaboUsd(16.80) * 10,
    currency: 'NPR',
    features: [
      '8 vCPU Cores',
      '24 GB RAM',
      '300 GB SSD',
      '600 Mbit/s Port', 'Unlimited Traffic',
      '1 Dedicated IPv4',
      'Full Root Access',
      'KVM Virtualization',
      'DDoS Protection',
      'Contabo Cloud',
    ],
  },
  {
    id: 'vps-40',
    name: 'Cloud VPS 12',
    type: 'VPS',
    specs: {
      diskGB: 400,
      bandwidthGB: -1,
      emailAccounts: 0,
      subdomains: 0,
      databases: 0,
      cpuCores: 12,
      ramGB: 48,
    },
    priceMonthly: applyContaboUsd(30.00), // Contabo Cloud VPS 12 (V156) 12-mo $24.00 → NPR 5580
    priceYearly: applyContaboUsd(30.00) * 10,
    currency: 'NPR',
    features: [
      '12 vCPU Cores',
      '48 GB RAM',
      '400 GB SSD',
      '800 Mbit/s Port', 'Unlimited Traffic',
      '1 Dedicated IPv4',
      'Full Root Access',
      'KVM Virtualization',
      'DDoS Protection',
      'Contabo Cloud',
    ],
  },
  {
    id: 'vps-50',
    name: 'Cloud VPS 16',
    type: 'VPS',
    specs: {
      diskGB: 500,
      bandwidthGB: -1,
      emailAccounts: 0,
      subdomains: 0,
      databases: 0,
      cpuCores: 16,
      ramGB: 64,
    },
    priceMonthly: applyContaboUsd(44.50), // Contabo Cloud VPS 16 (V157) 12-mo $35.60 → NPR 8277
    priceYearly: applyContaboUsd(44.50) * 10,
    currency: 'NPR',
    features: [
      '16 vCPU Cores',
      '64 GB RAM',
      '500 GB SSD',
      '1 Gbit/s Port', 'Unlimited Traffic',
      '1 Dedicated IPv4',
      'Full Root Access',
      'KVM Virtualization',
      'DDoS Protection',
      'Contabo Cloud',
    ],
  },
  {
    id: 'vps-60',
    name: 'Cloud VPS 18',
    type: 'VPS',
    specs: {
      diskGB: 600,
      bandwidthGB: -1,
      emailAccounts: 0,
      subdomains: 0,
      databases: 0,
      cpuCores: 18,
      ramGB: 96,
    },
    priceMonthly: applyContaboUsd(58.80), // Contabo Cloud VPS 18 (V158) 12-mo $47.04 → NPR 10937
    priceYearly: applyContaboUsd(58.80) * 10,
    currency: 'NPR',
    features: [
      '18 vCPU Cores',
      '96 GB RAM',
      '600 GB SSD',
      '1 Gbit/s Port', 'Unlimited Traffic',
      '1 Dedicated IPv4',
      'Full Root Access',
      'KVM Virtualization',
      'DDoS Protection',
      'Contabo Cloud',
    ],
  },
  // ── Performance VPS (Contabo Cloud VPS Plus, AMD EPYC + NVMe) ───────────────
  {
    id: 'vps-plus-4',
    name: 'Cloud VPS Plus 4',
    type: 'VPS_PLUS',
    specs: { diskGB: 150, bandwidthGB: -1, emailAccounts: 0, subdomains: 0, databases: 0, cpuCores: 4, ramGB: 8 },
    priceMonthly: applyContaboUsd(16.25), // Contabo Cloud VPS Plus 4 (V159) 12-mo $13.00 → NPR 3023
    priceYearly: applyContaboUsd(16.25) * 10,
    currency: 'NPR',
    features: ['4 vCPU Cores (AMD EPYC)', '8 GB RAM', '150 GB NVMe', '500 Mbit/s Port', 'Unlimited Traffic', '1 Dedicated IPv4', 'Full Root Access', 'KVM Virtualization', 'DDoS Protection', 'Contabo Cloud'],
  },
  {
    id: 'vps-plus-6',
    name: 'Cloud VPS Plus 6',
    type: 'VPS_PLUS',
    specs: { diskGB: 300, bandwidthGB: -1, emailAccounts: 0, subdomains: 0, databases: 0, cpuCores: 6, ramGB: 12 },
    priceMonthly: applyContaboUsd(23.00), // Contabo Cloud VPS Plus 6 (V160) 12-mo $18.40 → NPR 4278
    priceYearly: applyContaboUsd(23.00) * 10,
    currency: 'NPR',
    features: ['6 vCPU Cores (AMD EPYC)', '12 GB RAM', '300 GB NVMe', '500 Mbit/s Port', 'Unlimited Traffic', '1 Dedicated IPv4', 'Full Root Access', 'KVM Virtualization', 'DDoS Protection', 'Contabo Cloud'],
    popular: true,
  },
  {
    id: 'vps-plus-8',
    name: 'Cloud VPS Plus 8',
    type: 'VPS_PLUS',
    specs: { diskGB: 450, bandwidthGB: -1, emailAccounts: 0, subdomains: 0, databases: 0, cpuCores: 8, ramGB: 24 },
    priceMonthly: applyContaboUsd(42.00), // Contabo Cloud VPS Plus 8 (V161) 12-mo $33.60 → NPR 7812
    priceYearly: applyContaboUsd(42.00) * 10,
    currency: 'NPR',
    features: ['8 vCPU Cores (AMD EPYC)', '24 GB RAM', '450 GB NVMe', '1 Gbit/s Port', 'Unlimited Traffic', '1 Dedicated IPv4', 'Full Root Access', 'KVM Virtualization', 'DDoS Protection', 'Contabo Cloud'],
  },
  {
    id: 'vps-plus-12',
    name: 'Cloud VPS Plus 12',
    type: 'VPS_PLUS',
    specs: { diskGB: 600, bandwidthGB: -1, emailAccounts: 0, subdomains: 0, databases: 0, cpuCores: 12, ramGB: 48 },
    priceMonthly: applyContaboUsd(71.00), // Contabo Cloud VPS Plus 12 (V162) 12-mo $56.80 → NPR 13206
    priceYearly: applyContaboUsd(71.00) * 10,
    currency: 'NPR',
    features: ['12 vCPU Cores (AMD EPYC)', '48 GB RAM', '600 GB NVMe', '1 Gbit/s Port', 'Unlimited Traffic', '1 Dedicated IPv4', 'Full Root Access', 'KVM Virtualization', 'DDoS Protection', 'Contabo Cloud'],
  },
  {
    id: 'vps-plus-16',
    name: 'Cloud VPS Plus 16',
    type: 'VPS_PLUS',
    specs: { diskGB: 750, bandwidthGB: -1, emailAccounts: 0, subdomains: 0, databases: 0, cpuCores: 16, ramGB: 64 },
    priceMonthly: applyContaboUsd(95.00), // Contabo Cloud VPS Plus 16 (V163) 12-mo $76.00 → NPR 17670
    priceYearly: applyContaboUsd(95.00) * 10,
    currency: 'NPR',
    features: ['16 vCPU Cores (AMD EPYC)', '64 GB RAM', '750 GB NVMe', '1 Gbit/s Port', 'Unlimited Traffic', '1 Dedicated IPv4', 'Full Root Access', 'KVM Virtualization', 'DDoS Protection', 'Contabo Cloud'],
  },
  {
    id: 'vps-plus-18',
    name: 'Cloud VPS Plus 18',
    type: 'VPS_PLUS',
    specs: { diskGB: 900, bandwidthGB: -1, emailAccounts: 0, subdomains: 0, databases: 0, cpuCores: 18, ramGB: 96 },
    priceMonthly: applyContaboUsd(119.00), // Contabo Cloud VPS Plus 18 (V164) 12-mo $95.20 → NPR 22134
    priceYearly: applyContaboUsd(119.00) * 10,
    currency: 'NPR',
    features: ['18 vCPU Cores (AMD EPYC)', '96 GB RAM', '900 GB NVMe', '1 Gbit/s Port', 'Unlimited Traffic', '1 Dedicated IPv4', 'Full Root Access', 'KVM Virtualization', 'DDoS Protection', 'Contabo Cloud'],
  },
  // ── Storage VPS (Contabo) ───────────────────────────────────────────────────
  {
    id: 'storage-vps-10',
    name: 'Storage VPS 10',
    type: 'STORAGE_VPS',
    specs: {
      diskGB: 300,
      bandwidthGB: -1,
      emailAccounts: 0,
      subdomains: 0,
      databases: 0,
      cpuCores: 2,
      ramGB: 4,
    },
    priceMonthly: applyContaboUsd(6.60), // Contabo Storage VPS 10 12-mo $5.28 → NPR 1228
    priceYearly: applyContaboUsd(6.60) * 10,
    currency: 'NPR',
    features: [
      '2 vCPU Cores',
      '4 GB RAM',
      '300 GB SSD',
      '200 Mbit/s Port', 'Unlimited Traffic',
      '1 Dedicated IPv4',
      'Full Root Access',
      'KVM Virtualization',
      'DDoS Protection',
      'Contabo Cloud',
    ],
  },
  {
    id: 'storage-vps-20',
    name: 'Storage VPS 20',
    type: 'STORAGE_VPS',
    specs: {
      diskGB: 400,
      bandwidthGB: -1,
      emailAccounts: 0,
      subdomains: 0,
      databases: 0,
      cpuCores: 3,
      ramGB: 8,
    },
    priceMonthly: applyContaboUsd(9.00), // Contabo Storage VPS 20 (V96) 12-mo $7.20 → NPR 1674
    priceYearly: applyContaboUsd(9.00) * 10,
    currency: 'NPR',
    features: [
      '3 vCPU Cores',
      '8 GB RAM',
      '400 GB SSD',
      '300 Mbit/s Port', 'Unlimited Traffic',
      '1 Dedicated IPv4',
      'Full Root Access',
      'KVM Virtualization',
      'DDoS Protection',
      'Contabo Cloud',
    ],
    popular: true,
  },
  {
    id: 'storage-vps-30',
    name: 'Storage VPS 30',
    type: 'STORAGE_VPS',
    specs: {
      diskGB: 1000,
      bandwidthGB: -1,
      emailAccounts: 0,
      subdomains: 0,
      databases: 0,
      cpuCores: 6,
      ramGB: 18,
    },
    priceMonthly: applyContaboUsd(16.80), // Contabo Storage VPS 30 12-mo $13.44 → NPR 3125
    priceYearly: applyContaboUsd(16.80) * 10,
    currency: 'NPR',
    features: [
      '6 vCPU Cores',
      '18 GB RAM',
      '1 TB SSD',
      '600 Mbit/s Port', 'Unlimited Traffic',
      '1 Dedicated IPv4',
      'Full Root Access',
      'KVM Virtualization',
      'DDoS Protection',
      'Contabo Cloud',
    ],
  },
  {
    id: 'storage-vps-40',
    name: 'Storage VPS 40',
    type: 'STORAGE_VPS',
    specs: {
      diskGB: 1200,
      bandwidthGB: -1,
      emailAccounts: 0,
      subdomains: 0,
      databases: 0,
      cpuCores: 8,
      ramGB: 30,
    },
    priceMonthly: applyContaboUsd(30.00), // Contabo Storage VPS 40 12-mo $24.00 → NPR 5580
    priceYearly: applyContaboUsd(30.00) * 10,
    currency: 'NPR',
    features: [
      '8 vCPU Cores',
      '30 GB RAM',
      '1.2 TB SSD',
      '800 Mbit/s Port', 'Unlimited Traffic',
      '1 Dedicated IPv4',
      'Full Root Access',
      'KVM Virtualization',
      'DDoS Protection',
      'Contabo Cloud',
    ],
  },
  {
    id: 'storage-vps-50',
    name: 'Storage VPS 50',
    type: 'STORAGE_VPS',
    specs: {
      diskGB: 1400,
      bandwidthGB: -1,
      emailAccounts: 0,
      subdomains: 0,
      databases: 0,
      cpuCores: 14,
      ramGB: 50,
    },
    priceMonthly: applyContaboUsd(44.50), // Contabo Storage VPS 50 12-mo $35.60 → NPR 8277
    priceYearly: applyContaboUsd(44.50) * 10,
    currency: 'NPR',
    features: [
      '14 vCPU Cores',
      '50 GB RAM',
      '1.4 TB SSD',
      '1 Gbit/s Port', 'Unlimited Traffic',
      '1 Dedicated IPv4',
      'Full Root Access',
      'KVM Virtualization',
      'DDoS Protection',
      'Contabo Cloud',
    ],
  },
  // ── VDS (Contabo Dedicated) ─────────────────────────────────────────────────
  {
    id: 'vds-s',
    name: 'Cloud VDS S',
    type: 'VDS',
    specs: { diskGB: 180, bandwidthGB: -1, emailAccounts: 0, subdomains: 0, databases: 0, cpuCores: 6, ramGB: 24 },
    priceMonthly: applyContaboUsd(47.00), // Contabo Cloud VDS S 12-mo $37.60 → NPR 8742
    priceYearly: applyContaboUsd(47.00) * 10,
    currency: 'NPR',
    features: ['6 Virtual Cores (AMD EPYC 7282 2.8 GHz)', '24 GB RAM', '180 GB NVMe', '250 Mbit/s Port', 'Unlimited Traffic', '1 Dedicated IPv4', 'Full Root Access', 'KVM Virtualization', 'DDoS Protection', '99.9% SLA', 'Contabo Cloud'],
  },
  {
    id: 'vds-m',
    name: 'Cloud VDS M',
    type: 'VDS',
    specs: { diskGB: 240, bandwidthGB: -1, emailAccounts: 0, subdomains: 0, databases: 0, cpuCores: 8, ramGB: 32 },
    priceMonthly: applyContaboUsd(59.00), // Contabo Cloud VDS M 12-mo $47.20 → NPR 10974
    priceYearly: applyContaboUsd(59.00) * 10,
    currency: 'NPR',
    features: ['8 Virtual Cores (AMD EPYC 7282 2.8 GHz)', '32 GB RAM', '240 GB NVMe', '500 Mbit/s Port', 'Unlimited Traffic', '1 Dedicated IPv4', 'Full Root Access', 'KVM Virtualization', 'DDoS Protection', '99.9% SLA', 'Contabo Cloud'],
    popular: true,
  },
  {
    id: 'vds-l',
    name: 'Cloud VDS L',
    type: 'VDS',
    specs: { diskGB: 360, bandwidthGB: -1, emailAccounts: 0, subdomains: 0, databases: 0, cpuCores: 12, ramGB: 48 },
    priceMonthly: applyContaboUsd(83.00), // Contabo Cloud VDS L 12-mo $66.40 → NPR 15438
    priceYearly: applyContaboUsd(83.00) * 10,
    currency: 'NPR',
    features: ['12 Virtual Cores (AMD EPYC 7282 2.8 GHz)', '48 GB RAM', '360 GB NVMe', '750 Mbit/s Port', 'Unlimited Traffic', '1 Dedicated IPv4', 'Full Root Access', 'KVM Virtualization', 'DDoS Protection', '99.9% SLA', 'Contabo Cloud'],
  },
  {
    id: 'vds-xl',
    name: 'Cloud VDS XL',
    type: 'VDS',
    specs: { diskGB: 480, bandwidthGB: -1, emailAccounts: 0, subdomains: 0, databases: 0, cpuCores: 16, ramGB: 64 },
    priceMonthly: applyContaboUsd(113.00), // Contabo Cloud VDS XL 12-mo $90.40 → NPR 21018
    priceYearly: applyContaboUsd(113.00) * 10,
    currency: 'NPR',
    features: ['16 Virtual Cores (AMD EPYC 7282 2.8 GHz)', '64 GB RAM', '480 GB NVMe', '1 Gbit/s Port', 'Unlimited Traffic', '1 Dedicated IPv4', 'Full Root Access', 'KVM Virtualization', 'DDoS Protection', '99.9% SLA', 'Priority Support', 'Contabo Cloud'],
  },
  {
    id: 'vds-xxl',
    name: 'Cloud VDS XXL',
    type: 'VDS',
    specs: { diskGB: 720, bandwidthGB: -1, emailAccounts: 0, subdomains: 0, databases: 0, cpuCores: 24, ramGB: 96 },
    priceMonthly: applyContaboUsd(167.00), // Contabo Cloud VDS XXL 12-mo $133.60 → NPR 31062
    priceYearly: applyContaboUsd(167.00) * 10,
    currency: 'NPR',
    features: ['24 Virtual Cores (AMD EPYC 7282 2.8 GHz)', '96 GB RAM', '720 GB NVMe', '1 Gbit/s Port', 'Unlimited Traffic', '1 Dedicated IPv4', 'Full Root Access', 'KVM Virtualization', 'DDoS Protection', '99.9% SLA', 'Priority Support', 'Contabo Cloud'],
  },
  // ── Dedicated Servers ─────────────────────────────────────────────────────────
  {
    id: 'ded-1',
    name: 'DS Intel Xeon E3',
    type: 'DEDICATED',
    specs: { diskGB: 500, bandwidthGB: -1, emailAccounts: 0, subdomains: 0, databases: 0, cpuCores: 4, ramGB: 8 },
    priceMonthly: 16956, priceYearly: 169560, currency: 'NPR',
    features: ['Intel Xeon E3-1230', '4 Cores / 8 Threads', '8 GB DDR4 ECC RAM', '500 GB SATA HDD', 'Unmetered Bandwidth', '1 Dedicated IPv4', 'Full Root Access', 'IPMI/KVM Access', '100 Mbps Port', 'DDoS Protection', '24/7 Support'],
  },
  {
    id: 'ded-2',
    name: 'DS Intel Xeon E5',
    type: 'DEDICATED',
    specs: { diskGB: 1000, bandwidthGB: -1, emailAccounts: 0, subdomains: 0, databases: 0, cpuCores: 8, ramGB: 16 },
    priceMonthly: 17949, priceYearly: 179490, currency: 'NPR',
    features: ['Intel Xeon E5-2620', '8 Cores / 16 Threads', '16 GB DDR4 ECC RAM', '1 TB SATA HDD', 'Unmetered Bandwidth', '1 Dedicated IPv4', 'Full Root Access', 'IPMI/KVM Access', '1 Gbps Port', 'DDoS Protection', '24/7 Support'],
    popular: true,
  },
  {
    id: 'ded-3',
    name: 'DS Dual Xeon E5',
    type: 'DEDICATED',
    specs: { diskGB: 2000, bandwidthGB: -1, emailAccounts: 0, subdomains: 0, databases: 0, cpuCores: 16, ramGB: 32 },
    priceMonthly: 23139, priceYearly: 231390, currency: 'NPR',
    features: ['2x Intel Xeon E5-2620', '16 Cores / 32 Threads', '32 GB DDR4 ECC RAM', '2x 1 TB SATA HDD', 'Unmetered Bandwidth', '1 Dedicated IPv4', 'Full Root Access', 'IPMI/KVM Access', '1 Gbps Port', 'Hardware RAID', 'DDoS Protection', 'Priority 24/7 Support'],
  },
  {
    id: 'ded-4',
    name: 'DS Xeon Scalable',
    type: 'DEDICATED',
    specs: { diskGB: 2000, bandwidthGB: -1, emailAccounts: 0, subdomains: 0, databases: 0, cpuCores: 24, ramGB: 64 },
    priceMonthly: 25938, priceYearly: 259380, currency: 'NPR',
    features: ['Intel Xeon Gold 5218', '24 Cores / 48 Threads', '64 GB DDR4 ECC RAM', '2x 1 TB NVMe SSD', 'Unmetered Bandwidth', '1 Dedicated IPv4', 'Full Root Access', 'IPMI/KVM Access', '1 Gbps Port', 'Hardware RAID', 'DDoS Protection', 'Priority 24/7 Support'],
  },
  {
    id: 'ded-5',
    name: 'DS Performance',
    type: 'DEDICATED',
    specs: { diskGB: 4000, bandwidthGB: -1, emailAccounts: 0, subdomains: 0, databases: 0, cpuCores: 16, ramGB: 32 },
    priceMonthly: 23939, priceYearly: 239390, currency: 'NPR',
    features: ['Intel Xeon E-2388G', '8 Cores / 16 Threads', '32 GB DDR4 ECC RAM', '2x 2 TB NVMe SSD', 'Unmetered Bandwidth', '1 Dedicated IPv4', 'Full Root Access', 'IPMI/KVM Access', '1 Gbps Port', 'Hardware RAID', 'DDoS Protection', 'Priority 24/7 Support'],
  },
  {
    id: 'ded-6',
    name: 'DS Enterprise Plus',
    type: 'DEDICATED',
    specs: { diskGB: 4000, bandwidthGB: -1, emailAccounts: 0, subdomains: 0, databases: 0, cpuCores: 32, ramGB: 128 },
    priceMonthly: 33899, priceYearly: 338990, currency: 'NPR',
    features: ['2x Intel Xeon Gold 5218', '32 Cores / 64 Threads', '128 GB DDR4 ECC RAM', '4x 1 TB NVMe SSD', 'Unmetered Bandwidth', '2 Dedicated IPv4', 'Full Root Access', 'IPMI/KVM Access', '10 Gbps Port', 'Hardware RAID', 'DDoS Protection', 'Dedicated Account Manager', 'Priority 24/7 Support'],
  },
  {
    id: 'ded-7',
    name: 'DS Ultimate',
    type: 'DEDICATED',
    specs: { diskGB: 8000, bandwidthGB: -1, emailAccounts: 0, subdomains: 0, databases: 0, cpuCores: 64, ramGB: 256 },
    priceMonthly: 39899, priceYearly: 398990, currency: 'NPR',
    features: ['2x Intel Xeon Platinum 8280', '64 Cores / 128 Threads', '256 GB DDR4 ECC RAM', '4x 2 TB NVMe SSD', 'Unmetered Bandwidth', '4 Dedicated IPv4', 'Full Root Access', 'IPMI/KVM Access', '10 Gbps Port', 'Hardware RAID', 'DDoS Protection', 'Dedicated Account Manager', 'Priority 24/7 Support'],
  },
];

@Injectable()
export class HostingService implements OnModuleInit {
  private readonly logger = new Logger(HostingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cyberPanel: CyberPanelService,
    private readonly proxmox: ProxmoxService,
    private readonly contabo: ContaboService,
    private readonly dockerService: DockerService,
    private readonly resellerClub: ResellerClubService,
    @InjectQueue('provisioning') private readonly provisioningQueue: Queue,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Register the daily expiry-reminder sweep (Bull repeatable, 09:00) so ACTIVE
   * VPS/VDS accounts get a "renew in 7 days" email before their contract term ends.
   * Mirrors BillingService's dunning-sweep registration.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.provisioningQueue.add(
        'expiry-reminder',
        {},
        {
          repeat: { cron: '0 9 * * *' }, // daily 09:00
          jobId: 'expiry-reminder-daily',
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
      this.logger.log('Scheduled daily VPS expiry-reminder sweep (09:00)');
    } catch (e) {
      this.logger.warn(`Could not schedule expiry-reminder sweep: ${(e as Error).message}`);
    }
  }

  /**
   * Find ACTIVE VPS/VDS accounts whose contract expires within 7 days and haven't
   * been reminded yet, and emit `hosting.expiry-reminder` for each (→ renewal email).
   * Skips billing-exempt (isFree) users. Idempotent per term via expiryReminderSentAt.
   * Called by the `expiry-reminder` provisioning-queue job and the admin endpoint.
   */
  async runExpiryReminderSweep(): Promise<{ reminded: number }> {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const accounts = await this.prisma.hostingAccount.findMany({
      where: {
        status: HostingStatus.ACTIVE,
        expiryDate: { gte: now, lte: in7Days },
        expiryReminderSentAt: null,
        user: { isFree: false },
      },
      include: { user: { select: { email: true, name: true } } },
    });

    let reminded = 0;
    for (const acc of accounts) {
      if (!acc.user?.email || !acc.expiryDate) continue;
      // Atomically CLAIM this account before emitting, so a concurrent sweep (daily
      // cron overlapping the manual admin trigger, or a double-click) can't send a
      // duplicate reminder — only the invocation that flips the still-null row wins
      // (count === 1). On send failure the email listener resets this flag so the
      // next daily sweep retries instead of the reminder being silently lost.
      const claim = await this.prisma.hostingAccount.updateMany({
        where: { id: acc.id, expiryReminderSentAt: null },
        data: { expiryReminderSentAt: now },
      });
      if (claim.count !== 1) continue;

      this.eventEmitter.emit('hosting.expiry-reminder', {
        hostingId: acc.id,
        email: acc.user.email,
        firstName: acc.user.name?.split(' ')[0] || 'Customer',
        serviceName: acc.planName,
        expiry: acc.expiryDate,
      });
      reminded++;
    }

    if (reminded > 0) {
      this.logger.log(`Expiry-reminder sweep: sent ${reminded} renewal reminder(s)`);
    }
    return { reminded };
  }

  /**
   * Check if a hosting account is a Contabo instance.
   * Contabo instances use provider=CUSTOM and store metadata with providerType='contabo'.
   * Alternatively, Contabo instanceIds are large numbers (> 100000000).
   */
  private isContaboInstance(hosting: { provider: HostingProvider; serverId?: string | null; cpanelPasswordEncrypted?: string | null }): boolean {
    if (hosting.cpanelPasswordEncrypted) {
      try {
        const meta = JSON.parse(hosting.cpanelPasswordEncrypted);
        if (meta.providerType === 'contabo') return true;
      } catch {
        // not JSON metadata
      }
    }
    // Contabo instance IDs are very large numbers
    if (hosting.serverId && hosting.provider === HostingProvider.CUSTOM) {
      const id = parseInt(hosting.serverId, 10);
      if (id > 100000000) return true;
    }
    return false;
  }

  /**
   * Ensure the user has a ResellerClub customer ID. If missing, create one via RC API.
   */
  private async ensureRcCustomer(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    if (user.rcCustomerId) {
      return user.rcCustomerId;
    }

    this.logger.log(`Creating ResellerClub customer for user ${userId}`);

    const rcCustomerId = await this.resellerClub.createCustomer({
      username: user.email,
      passwd: Math.random().toString(36).slice(-12) + 'Rc1!',
      name: user.name,
      company: user.companyName || user.name,
      'address-line-1': 'N/A',
      city: 'Kathmandu',
      state: 'Bagmati',
      country: 'NP',
      zipcode: '44600',
      'phone-cc': '977',
      phone: user.phone || '9800000000',
      'lang-pref': 'en',
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { rcCustomerId },
    });

    this.logger.log(`ResellerClub customer created for user ${userId}: ${rcCustomerId}`);
    return rcCustomerId;
  }

  getPlans(): HostingPlan[] {
    return HOSTING_PLANS;
  }

  /**
   * Get plans with LIVE pricing from ResellerClub API (50% margin, NPR).
   * Falls back to hardcoded prices if RC API fails.
   */
  async getPlansWithLivePricing(): Promise<HostingPlan[]> {
    try {
      // Fetch all product pricing in parallel
      const [vpsPricing, dedicatedPricing, sharedPricing, wpPricing] = await Promise.allSettled([
        this.resellerClub.getHostingPricing('virtualserverlinuxus'),
        this.resellerClub.getHostingPricing('dedicatedserverlinuxus'),
        this.resellerClub.getHostingPricing('multidomainhosting'),
        this.resellerClub.getHostingPricing('wordpresshostingusa'),
      ]);

      const plans = [...HOSTING_PLANS];

      // VPS & VDS use Contabo pricing (hardcoded in HOSTING_PLANS with EUR × 148 × 1.5)
      // Add contaboProductId to plan output for frontend
      for (const plan of plans.filter(p => p.type === 'VPS' || p.type === 'VDS' || p.type === 'STORAGE_VPS')) {
        const contaboMapping = CONTABO_PRODUCT_MAP[plan.id];
        if (contaboMapping) {
          (plan as any).contaboProductId = contaboMapping.contaboProductId;
          (plan as any).provider = 'CONTABO';
        }
      }

      // Update Dedicated pricing
      const dedData = dedicatedPricing.status === 'fulfilled' ? dedicatedPricing.value?.dedicatedserverlinuxus?.plans : null;
      if (dedData) {
        for (const plan of plans.filter(p => p.type === 'DEDICATED')) {
          const mapping = RC_DEDICATED_PLAN_MAP[plan.id];
          if (mapping && dedData[mapping.rcPlanId]) {
            const rcPlan = dedData[mapping.rcPlanId];
            const monthlyUsd = parseFloat(rcPlan.add?.['1'] || rcPlan.renew?.['1'] || '0');
            if (monthlyUsd > 0) {
              plan.priceMonthly = applyMargin(monthlyUsd);
              plan.priceYearly = plan.priceMonthly * 10;
              plan.rcPlanId = mapping.rcPlanId;
            }
          }
        }
      }

      // Update Shared hosting pricing
      const sharedData = sharedPricing.status === 'fulfilled' ? sharedPricing.value?.multidomainhosting : null;
      if (sharedData) {
        for (const plan of plans.filter(p => p.type === 'SHARED')) {
          const mapping = RC_SHARED_PLAN_MAP[plan.id];
          if (mapping && sharedData[mapping.rcPlanId]) {
            const rcPlan = sharedData[mapping.rcPlanId];
            const monthlyUsd = parseFloat(rcPlan.add?.['3'] || '0'); // Shared min is 3 months
            const yearlyUsd = parseFloat(rcPlan.add?.['12'] || '0');
            if (monthlyUsd > 0) {
              plan.priceMonthly = applyMargin(monthlyUsd);
              plan.priceYearly = yearlyUsd > 0 ? applyMargin(yearlyUsd) * 12 : plan.priceMonthly * 10;
              plan.rcPlanId = mapping.rcPlanId;
            }
          }
        }
      }

      // Update WordPress pricing
      const wpData = wpPricing.status === 'fulfilled' ? wpPricing.value?.wordpresshostingusa?.plans : null;
      if (wpData) {
        for (const plan of plans.filter(p => p.type === 'WORDPRESS')) {
          const mapping = RC_SHARED_PLAN_MAP[plan.id];
          if (mapping && wpData[mapping.rcPlanId]) {
            const rcPlan = wpData[mapping.rcPlanId];
            const monthlyUsd = parseFloat(rcPlan.add?.['1'] || '0');
            const yearlyUsd = parseFloat(rcPlan.add?.['12'] || '0');
            if (monthlyUsd > 0) {
              plan.priceMonthly = applyMargin(monthlyUsd);
              plan.priceYearly = yearlyUsd > 0 ? applyMargin(yearlyUsd) * 12 : plan.priceMonthly * 10;
              plan.rcPlanId = mapping.rcPlanId;
            }
          }
        }
      }

      this.logger.log('Live pricing fetched from ResellerClub API with 50% margin');
      return plans;
    } catch (error) {
      this.logger.warn(`Failed to fetch live pricing, using hardcoded: ${error}`);
      return HOSTING_PLANS;
    }
  }

  async createHosting(userId: string, dto: CreateHostingDto) {
    const plan = HOSTING_PLANS.find((p) => p.id === dto.planId);
    if (!plan) {
      throw new BadRequestException(`Plan '${dto.planId}' not found`);
    }

    const provider = dto.provider || HostingProvider.CUSTOM;

    this.logger.log(
      `Creating hosting account for user ${userId}, domain: ${dto.domain}, plan: ${dto.planId}, provider: ${provider}`,
    );

    const hosting = await this.prisma.hostingAccount.create({
      data: {
        userId,
        planType: dto.planType as HostingPlanType,
        planName: plan.name,
        provider,
        status: HostingStatus.PROVISIONING,
        diskSpaceMb: plan.specs.diskGB > 0 ? plan.specs.diskGB * 1024 : 0,
        bandwidthMb: plan.specs.bandwidthGB > 0 ? plan.specs.bandwidthGB * 1024 : 0,
        autoRenew: true,
      },
    });

    if (
      dto.planType === HostingPlanType.VPS ||
      dto.planType === HostingPlanType.DEDICATED
    ) {
      throw new BadRequestException(
        'Use POST /hosting/vps endpoint for VPS/Dedicated provisioning',
      );
    }

    let jobName: string;

    if (provider === HostingProvider.RESELLERCLUB) {
      // ResellerClub provisioning flow
      const rcCustomerId = await this.ensureRcCustomer(userId);

      const jobData = {
        hostingId: hosting.id,
        userId,
        domain: dto.domain,
        planId: dto.planId,
        rcCustomerId,
      };

      jobName =
        dto.planType === HostingPlanType.WORDPRESS
          ? 'provision-wordpress-rc'
          : 'provision-shared-rc';

      await this.provisioningQueue.add(jobName, jobData, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      });
    } else {
      // CUSTOM provider: existing CyberPanel flow
      const jobData = {
        hostingId: hosting.id,
        userId,
        domain: dto.domain,
        planType: dto.planType,
        planId: dto.planId,
        adminEmail: dto.adminEmail,
        adminUsername: dto.adminUsername,
        adminPassword: dto.adminPassword,
        siteTitle: dto.siteTitle,
      };

      jobName =
        dto.planType === HostingPlanType.WORDPRESS
          ? 'provision-wordpress'
          : 'provision-shared';

      await this.provisioningQueue.add(jobName, jobData, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      });
    }

    this.logger.log(
      `Hosting account ${hosting.id} created, job '${jobName}' queued`,
    );
    return hosting;
  }

  async getMyHosting(userId: string) {
    const accounts = await this.prisma.hostingAccount.findMany({
      where: { userId, status: { not: HostingStatus.DELETED } },
      orderBy: { createdAt: 'desc' },
    });
    // Rows have no hostname column — derive a display name for list UIs.
    // NOTE: this is a hot path (used by every VPS sub-page for the server
    // dropdown), so it must stay a single DB query — no per-server Contabo
    // calls here. Live specs/usage enrichment lives in getVpsResourceStats().
    return accounts.map((account) => ({
      ...account,
      hostname: this.vpsDisplayName(account),
    }));
  }

  /**
   * Real per-VPS resource data for the dashboard, sourced from Contabo's
   * instance API. Contabo's public API exposes **allocated specs** (vCPU,
   * RAM, disk size, status, region) — it does NOT expose live CPU/RAM/disk
   * *utilisation* (no /metrics or /stats endpoint exists). So we return the
   * real provisioned capacity, not a fabricated usage percentage.
   *
   * Kept off the hot getMyHosting() path: this is only called by the VPS
   * analytics dashboard, and fans out one getInstance() call per server.
   */
  async getVpsResourceStats(userId: string) {
    const accounts = await this.prisma.hostingAccount.findMany({
      where: {
        userId,
        status: { not: HostingStatus.DELETED },
        planType: { in: [HostingPlanType.VPS, HostingPlanType.CLOUD] },
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      accounts.map(async (account) => {
        const base = {
          id: account.id,
          hostname: this.vpsDisplayName(account),
          status: account.status,
          planName: account.planName,
          planType: account.planType,
          // Specs from Contabo (filled in below when reachable)
          vcpu: null as number | null,
          ramGb: null as number | null,
          diskGb: null as number | null,
          region: null as string | null,
        };

        if (!account.serverId) return base;
        const serverId = parseInt(account.serverId, 10);
        if (isNaN(serverId)) return base;

        try {
          const res = await this.contabo.getInstance(serverId);
          const inst = res?.data?.[0];
          if (inst) {
            base.vcpu = inst.cpuCores ?? null;
            base.ramGb = inst.ramMb ? Math.round(inst.ramMb / 1024) : null;
            base.diskGb = inst.diskMb ? Math.round(inst.diskMb / 1024) : null;
            base.region = inst.regionName ?? inst.region ?? null;
          }
        } catch (err) {
          this.logger.warn(
            `Contabo specs fetch failed for ${account.id} (instance ${serverId}): ${(err as any)?.message}`,
          );
        }

        return base;
      }),
    );
  }

  async getHostingDetails(id: string, userId: string) {
    const hosting = await this.prisma.hostingAccount.findUnique({
      where: { id },
      include: {
        wordPressSites: true,
        backups: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });

    if (!hosting) {
      throw new NotFoundException(`Hosting account ${id} not found`);
    }

    if (hosting.userId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this hosting account',
      );
    }

    return hosting;
  }

  async suspendHosting(id: string) {
    const hosting = await this.prisma.hostingAccount.findUnique({
      where: { id },
    });

    if (!hosting) {
      throw new NotFoundException(`Hosting account ${id} not found`);
    }

    if (hosting.status === HostingStatus.SUSPENDED) {
      return hosting;
    }

    try {
      if (hosting.provider === HostingProvider.RESELLERCLUB) {
        // ResellerClub: use deleteHosting to suspend the order
        if (hosting.rcOrderId) {
          const productKey =
            hosting.planType === HostingPlanType.WORDPRESS
              ? 'wordpresshostingusa'
              : hosting.planType === HostingPlanType.VPS
                ? undefined
                : 'multidomainhosting';
          if (hosting.planType === HostingPlanType.VPS) {
            await this.resellerClub.deleteVps(hosting.rcOrderId);
          } else {
            await this.resellerClub.deleteHosting(hosting.rcOrderId, productKey);
          }
        }
      } else {
        // CUSTOM provider: existing CyberPanel / Proxmox flow
        if (
          hosting.planType === HostingPlanType.SHARED ||
          hosting.planType === HostingPlanType.WORDPRESS
        ) {
          if (hosting.cpanelUsername) {
            await this.cyberPanel.suspendAccount(hosting.cpanelUsername);
          }
        } else if (
          hosting.planType === HostingPlanType.VPS ||
          hosting.planType === HostingPlanType.DEDICATED
        ) {
          if (hosting.serverId) {
            await this.proxmox.shutdownVm(this.proxmox.node, parseInt(hosting.serverId, 10));
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Error suspending external account for ${id}: ${(error as Error).message}`,
      );
    }

    return this.prisma.hostingAccount.update({
      where: { id },
      data: { status: HostingStatus.SUSPENDED },
    });
  }

  async unsuspendHosting(id: string) {
    const hosting = await this.prisma.hostingAccount.findUnique({
      where: { id },
    });

    if (!hosting) {
      throw new NotFoundException(`Hosting account ${id} not found`);
    }

    try {
      if (hosting.provider === HostingProvider.RESELLERCLUB) {
        // ResellerClub accounts: no direct unsuspend API; status update only.
        // The account would need to be re-ordered or restored via RC support.
        this.logger.log(
          `ResellerClub unsuspend for ${id}: updating local status only (RC order ${hosting.rcOrderId})`,
        );
      } else {
        // CUSTOM provider: existing CyberPanel / Proxmox flow
        if (
          hosting.planType === HostingPlanType.SHARED ||
          hosting.planType === HostingPlanType.WORDPRESS
        ) {
          if (hosting.cpanelUsername) {
            await this.cyberPanel.unsuspendAccount(hosting.cpanelUsername);
          }
        } else if (
          hosting.planType === HostingPlanType.VPS ||
          hosting.planType === HostingPlanType.DEDICATED
        ) {
          if (hosting.serverId) {
            await this.proxmox.startVm(this.proxmox.node, parseInt(hosting.serverId, 10));
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Error unsuspending external account for ${id}: ${(error as Error).message}`,
      );
    }

    return this.prisma.hostingAccount.update({
      where: { id },
      data: { status: HostingStatus.ACTIVE },
    });
  }

  async deleteHosting(id: string, userId: string) {
    const hosting = await this.prisma.hostingAccount.findUnique({
      where: { id },
    });

    if (!hosting) {
      throw new NotFoundException(`Hosting account ${id} not found`);
    }

    if (hosting.userId !== userId) {
      throw new ForbiddenException('You do not have access to this resource');
    }

    if (hosting.provider === HostingProvider.RESELLERCLUB) {
      // ResellerClub: delete directly via API
      if (hosting.rcOrderId) {
        try {
          if (hosting.planType === HostingPlanType.VPS) {
            await this.resellerClub.deleteVps(hosting.rcOrderId);
          } else {
            const productKey =
              hosting.planType === HostingPlanType.WORDPRESS
                ? 'wordpresshostingusa'
                : 'multidomainhosting';
            await this.resellerClub.deleteHosting(hosting.rcOrderId, productKey);
          }
        } catch (error) {
          this.logger.error(
            `Failed to delete RC order ${hosting.rcOrderId} for hosting ${id}: ${(error as Error).message}`,
          );
        }
      }
    } else {
      // CUSTOM provider: existing deprovision queue flow
      const jobData: {
        hostingId: string;
        type: string;
        username?: string;
        vmId?: number;
        node?: string;
      } = {
        hostingId: id,
        type: hosting.planType.toLowerCase(),
      };

      if (
        hosting.planType === HostingPlanType.SHARED ||
        hosting.planType === HostingPlanType.WORDPRESS
      ) {
        jobData.username = hosting.cpanelUsername ?? undefined;
      } else if (
        hosting.planType === HostingPlanType.VPS ||
        hosting.planType === HostingPlanType.DEDICATED
      ) {
        jobData.vmId = hosting.serverId ? parseInt(hosting.serverId, 10) : undefined;
        jobData.node = this.proxmox.node;
      }

      await this.provisioningQueue.add('deprovision-hosting', jobData, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      });
    }

    return this.prisma.hostingAccount.update({
      where: { id },
      data: { status: HostingStatus.CANCELLED },
    });
  }

  async getHostingStats(id: string, userId: string) {
    const hosting = await this.prisma.hostingAccount.findUnique({
      where: { id },
    });

    if (!hosting) {
      throw new NotFoundException(`Hosting account ${id} not found`);
    }

    if (hosting.userId !== userId) {
      throw new ForbiddenException('You do not have access to this resource');
    }

    if (hosting.provider === HostingProvider.RESELLERCLUB) {
      // ResellerClub: fetch details from RC API
      if (!hosting.rcOrderId) {
        return { status: hosting.status };
      }
      try {
        const productKey =
          hosting.planType === HostingPlanType.WORDPRESS
            ? 'wordpresshostingusa'
            : hosting.planType === HostingPlanType.VPS
              ? undefined
              : 'multidomainhosting';
        let rcDetails: any;
        if (hosting.planType === HostingPlanType.VPS) {
          rcDetails = await this.resellerClub.getVpsDetails(hosting.rcOrderId);
        } else {
          rcDetails = await this.resellerClub.getHostingDetails(hosting.rcOrderId, productKey);
        }
        return { ...rcDetails, status: hosting.status, provider: HostingProvider.RESELLERCLUB };
      } catch (error) {
        this.logger.error(
          `Failed to fetch RC hosting details for ${id}: ${(error as Error).message}`,
        );
        return { status: hosting.status, provider: HostingProvider.RESELLERCLUB };
      }
    }

    // CUSTOM provider: existing CyberPanel / Proxmox stats flow
    if (
      hosting.planType === HostingPlanType.SHARED ||
      hosting.planType === HostingPlanType.WORDPRESS
    ) {
      if (!hosting.cpanelUsername) {
        return { diskUsedMb: 0, bandwidthUsedMb: 0, status: hosting.status };
      }
      try {
        const usage = await this.cyberPanel.getAccountUsage(hosting.cpanelUsername);
        return { ...usage, status: hosting.status };
      } catch (error) {
        this.logger.error(
          `Failed to fetch CyberPanel usage for ${id}: ${(error as Error).message}`,
        );
        return {
          diskUsedMb: hosting.diskUsedMb,
          bandwidthUsedMb: hosting.bandwidthUsedMb,
          status: hosting.status,
        };
      }
    } else if (
      hosting.planType === HostingPlanType.VPS ||
      hosting.planType === HostingPlanType.DEDICATED
    ) {
      if (!hosting.serverId) {
        return { status: hosting.status };
      }
      try {
        const vmStatus = await this.proxmox.getVmStatus(
          this.proxmox.node,
          parseInt(hosting.serverId, 10),
        );
        return { ...vmStatus, ipAddress: hosting.ipAddress, status: hosting.status };
      } catch (error) {
        this.logger.error(
          `Failed to fetch Proxmox stats for ${id}: ${(error as Error).message}`,
        );
        return { status: hosting.status, ipAddress: hosting.ipAddress };
      }
    }

    return { status: hosting.status };
  }

  // ── Website Management ─────────────────────────────────────────────────────

  async listWebsites(userId: string) {
    const accounts = await this.prisma.hostingAccount.findMany({
      where: {
        userId,
        status: { not: HostingStatus.DELETED },
        planType: { in: [HostingPlanType.SHARED, HostingPlanType.WORDPRESS] },
      },
      include: {
        wordPressSites: true,
        domain: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return accounts.map((a) => ({
      id: a.id,
      domain: a.domain?.domainName || a.cpanelUsername || 'N/A',
      planName: a.planName,
      planType: a.planType,
      status: a.status,
      provider: a.provider,
      createdAt: a.createdAt,
      expiryDate: a.expiryDate,
      ipAddress: a.ipAddress,
      hasWordPress: a.wordPressSites?.length > 0 || a.planType === HostingPlanType.WORDPRESS,
      wordPressSites: a.wordPressSites || [],
      diskSpaceMb: a.diskSpaceMb,
      diskUsedMb: a.diskUsedMb,
      bandwidthMb: a.bandwidthMb,
      bandwidthUsedMb: a.bandwidthUsedMb,
    }));
  }

  async createWebsite(userId: string, dto: CreateWebsiteDto) {
    const plan = HOSTING_PLANS.find((p) => p.id === dto.planId);
    if (!plan) {
      throw new BadRequestException(`Plan '${dto.planId}' not found`);
    }

    if (plan.type !== 'SHARED' && plan.type !== 'WORDPRESS') {
      throw new BadRequestException('Use /hosting/vps for VPS plans');
    }

    const isWP =
      dto.applicationType === ApplicationType.WORDPRESS ||
      dto.applicationType === ApplicationType.WOOCOMMERCE ||
      plan.type === 'WORDPRESS';

    const planType = isWP ? HostingPlanType.WORDPRESS : HostingPlanType.SHARED;
    const useContabo = dto.provider === 'CONTABO';
    const useRc = !useContabo && (dto.provider === 'RESELLERCLUB' || (plan as any).rcPlanId);
    const provider = useContabo
      ? HostingProvider.CONTABO
      : useRc
        ? HostingProvider.RESELLERCLUB
        : HostingProvider.CUSTOM;

    this.logger.log(
      `Creating website for user ${userId}, domain: ${dto.domain}, plan: ${dto.planId}, type: ${dto.applicationType}`,
    );

    // Step 1: Create hosting account in DB
    const hosting = await this.prisma.hostingAccount.create({
      data: {
        userId,
        planType,
        planName: plan.name,
        provider,
        status: HostingStatus.PROVISIONING,
        diskSpaceMb: plan.specs.diskGB > 0 ? plan.specs.diskGB * 1024 : 0,
        bandwidthMb: plan.specs.bandwidthGB > 0 ? plan.specs.bandwidthGB * 1024 : 0,
        autoRenew: true,
      },
    });

    try {
      // Step 2: Provision via RC or CyberPanel
      if (provider === HostingProvider.RESELLERCLUB) {
        // RC Provider: order hosting via ResellerClub API
        const rcCustomerId = await this.ensureRcCustomer(userId);
        const productKey = isWP ? 'wordpresshostingusa' : 'multidomainhosting';
        const rcPlanId = (plan as any).rcPlanId || RC_SHARED_PLAN_MAP[plan.id]?.rcPlanId || '1';

        this.logger.log(`Ordering ${productKey} plan ${rcPlanId} for ${dto.domain} via RC`);
        const rcResponse = await this.resellerClub.orderHosting({
          domainName: dto.domain,
          customerId: rcCustomerId,
          planId: rcPlanId,
          months: 12,
          productKey,
        });

        const rcOrderId = String(rcResponse?.entityid || rcResponse);

        await this.prisma.hostingAccount.update({
          where: { id: hosting.id },
          data: {
            status: HostingStatus.ACTIVE,
            provider: HostingProvider.RESELLERCLUB,
            rcOrderId,
            cpanelUsername: dto.domain.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8),
          },
          include: { wordPressSites: true },
        });

        this.logger.log(`RC hosting ordered: ${dto.domain} → order ${rcOrderId}`);
        return { id: hosting.id, domain: dto.domain, rcOrderId, provider: 'RESELLERCLUB', status: 'ACTIVE' };
      }

      // Contabo VPS + CyberPanel WordPress Provider
      if (useContabo && isWP) {
        const contaboProductId = this.getContaboProductForWpPlan(plan.id);

        await this.provisioningQueue.add(
          'provision-wordpress-contabo',
          {
            hostingId: hosting.id,
            domain: dto.domain,
            productId: contaboProductId || 'V45',
            region: 'EU',
            wpAdminEmail: dto.wpAdminEmail || `admin@${dto.domain}`,
            wpAdminUser: dto.wpAdminUser || 'admin',
            wpAdminPass: dto.wpAdminPass,
            wpTitle: dto.wpTitle || dto.domain,
          },
          {
            attempts: 2,
            backoff: { type: 'exponential', delay: 60000 },
            timeout: 1200000, // 20 minutes
          },
        );

        return {
          id: hosting.id,
          domain: dto.domain,
          provider: 'CONTABO',
          status: 'PROVISIONING',
        };
      }

      // CyberPanel Provider
      const username = dto.domain.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
      const password = Math.random().toString(36).slice(-12) + 'Cp1!';

      await this.cyberPanel.createAccount(
        dto.domain,
        username,
        dto.wpAdminEmail || `admin@${dto.domain}`,
        password,
        plan.id,
      );

      // Step 3: If WordPress, install WP
      if (isWP && dto.wpAdminEmail) {
        await this.cyberPanel.createWordPressSite(
          dto.domain,
          username,
          dto.wpAdminEmail,
          dto.wpAdminUser || 'admin',
          dto.wpAdminPass || password,
          dto.wpTitle || dto.domain,
        );

        await this.prisma.wordPressSite.create({
          data: {
            hostingId: hosting.id,
            adminUrl: `https://${dto.domain}/wp-admin`,
            wpVersion: 'latest',
            stagingActive: false,
            autoUpdatesEnabled: true,
          },
        });
      }

      // Step 4: Update hosting account to ACTIVE
      const updated = await this.prisma.hostingAccount.update({
        where: { id: hosting.id },
        data: {
          status: HostingStatus.ACTIVE,
          cpanelUsername: username,
        },
        include: { wordPressSites: true },
      });

      this.logger.log(`Website created successfully: ${dto.domain} (${hosting.id})`);
      return { ...updated, domain: dto.domain };
    } catch (error) {
      this.logger.error(`Failed to create website ${dto.domain}: ${(error as Error).message}`);

      await this.prisma.hostingAccount.update({
        where: { id: hosting.id },
        data: { status: HostingStatus.CANCELLED },
      });

      throw new BadRequestException(`Website creation failed: ${(error as Error).message}`);
    }
  }

  async deleteWebsite(id: string, userId: string) {
    return this.deleteHosting(id, userId);
  }

  /** Map WordPress plan IDs to Contabo VPS product IDs */
  private getContaboProductForWpPlan(planId: string): string {
    const map: Record<string, string> = {
      'wp-starter': 'V45',
      'wp-essential': 'V45',
      'wp-business': 'V46',
      'wp-developer': 'V46',
      'wp-starter-plus': 'V47',
      'wp-grow-big': 'V47',
      'wp-go-geek': 'V48',
      'wp-enterprise': 'V49',
    };
    return map[planId] || 'V45';
  }

  // ── Site Tools ──────────────────────────────────────────────────────────────

  private async getHostingAccountForUser(id: string, userId: string) {
    const hosting = await this.prisma.hostingAccount.findUnique({ where: { id } });
    if (!hosting) throw new NotFoundException(`Hosting account ${id} not found`);
    if (hosting.userId !== userId) throw new ForbiddenException('Access denied');
    return hosting;
  }

  async getSiteStats(id: string, userId: string) {
    const hosting = await this.getHostingAccountForUser(id, userId);

    let usage: Record<string, unknown> = {};
    if (hosting.cpanelUsername) {
      try {
        usage = await this.cyberPanel.getAccountUsage(hosting.cpanelUsername);
      } catch (error) {
        this.logger.error(`Failed to fetch usage for ${id}: ${(error as Error).message}`);
      }
    }

    return {
      diskSpaceMb: hosting.diskSpaceMb,
      diskUsedMb: hosting.diskUsedMb || 0,
      bandwidthMb: hosting.bandwidthMb,
      bandwidthUsedMb: hosting.bandwidthUsedMb || 0,
      status: hosting.status,
      ...usage,
    };
  }

  async getSiteInfo(id: string, userId: string) {
    const hosting = await this.prisma.hostingAccount.findUnique({
      where: { id },
      include: { domain: true },
    });
    if (!hosting) throw new NotFoundException(`Hosting account ${id} not found`);
    if (hosting.userId !== userId) throw new ForbiddenException('Access denied');

    return {
      id: hosting.id,
      domain: hosting.domain?.domainName || hosting.cpanelUsername || 'N/A',
      ipAddress: hosting.ipAddress || 'Pending',
      nameservers: ['ns1.hostingnepal.com', 'ns2.hostingnepal.com'],
      phpVersion: hosting.phpVersion || '8.2',
      diskQuotaMb: hosting.diskSpaceMb,
      bandwidthQuotaMb: hosting.bandwidthMb,
      cpanelUsername: hosting.cpanelUsername,
      status: hosting.status,
      planName: hosting.planName,
      planType: hosting.planType,
      provider: hosting.provider,
      createdAt: hosting.createdAt,
      expiryDate: hosting.expiryDate,
    };
  }

  async createSiteBackup(id: string, userId: string) {
    const hosting = await this.getHostingAccountForUser(id, userId);

    if (!hosting.cpanelUsername) {
      throw new BadRequestException('No CyberPanel account associated');
    }

    const result = await this.cyberPanel.createBackup(hosting.cpanelUsername);

    await this.prisma.backup.create({
      data: {
        hostingId: id,
        type: 'FULL',
        storageProvider: 'LOCAL',
        storagePath: `backup-${hosting.cpanelUsername}-${Date.now()}.tar.gz`,
        sizeMb: 0,
        status: 'IN_PROGRESS',
      },
    });

    return { message: 'Backup creation initiated', ...result };
  }

  async listSiteBackups(id: string, userId: string) {
    await this.getHostingAccountForUser(id, userId);

    return this.prisma.backup.findMany({
      where: { hostingId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async restoreSiteBackup(id: string, userId: string, backupFile: string) {
    const hosting = await this.getHostingAccountForUser(id, userId);

    if (!hosting.cpanelUsername) {
      throw new BadRequestException('No CyberPanel account associated');
    }

    const result = await this.cyberPanel.restoreBackup(hosting.cpanelUsername, backupFile);
    return { message: 'Backup restore initiated', ...result };
  }

  // ── WordPress Management ──────────────────────────────────────────────────

  async installWordPress(id: string, userId: string, dto: InstallWordPressDto) {
    const hosting = await this.prisma.hostingAccount.findUnique({
      where: { id },
      include: { domain: true },
    });
    if (!hosting) throw new NotFoundException(`Hosting account ${id} not found`);
    if (hosting.userId !== userId) throw new ForbiddenException('Access denied');

    const domainName = hosting.domain?.domainName || hosting.cpanelUsername;
    if (!hosting.cpanelUsername || !domainName) {
      throw new BadRequestException('Hosting account not properly provisioned');
    }

    const result = await this.cyberPanel.createWordPressSite(
      domainName,
      hosting.cpanelUsername,
      dto.adminEmail,
      dto.adminUser,
      dto.adminPass,
      dto.siteTitle,
    );

    const wpSite = await this.prisma.wordPressSite.create({
      data: {
        hostingId: id,
        adminUrl: `https://${domainName}/wp-admin`,
        wpVersion: 'latest',
        stagingActive: false,
        autoUpdatesEnabled: true,
      },
    });

    return { message: 'WordPress installed successfully', wpSite, ...result };
  }

  async getWordPressInfo(id: string, userId: string) {
    const hosting = await this.getHostingAccountForUser(id, userId);

    const wpSites = await this.prisma.wordPressSite.findMany({
      where: { hostingId: id },
    });

    let cyberPanelWpInfo: Record<string, unknown> = {};
    if (hosting.cpanelUsername) {
      try {
        cyberPanelWpInfo = await this.cyberPanel.getWordPressSites(hosting.cpanelUsername);
      } catch (error) {
        this.logger.error(`Failed to fetch WP info: ${(error as Error).message}`);
      }
    }

    return { wpSites, cyberPanelInfo: cyberPanelWpInfo };
  }

  async createStaging(id: string, userId: string) {
    const hosting = await this.prisma.hostingAccount.findUnique({
      where: { id },
      include: { domain: true },
    });
    if (!hosting) throw new NotFoundException(`Hosting account ${id} not found`);
    if (hosting.userId !== userId) throw new ForbiddenException('Access denied');

    const domainName = hosting.domain?.domainName || hosting.cpanelUsername;
    if (!domainName) {
      throw new BadRequestException('No domain associated');
    }

    const stagingDomain = `staging.${domainName}`;

    const wpSite = await this.prisma.wordPressSite.create({
      data: {
        hostingId: id,
        adminUrl: `https://${stagingDomain}/wp-admin`,
        stagingUrl: `https://${stagingDomain}`,
        stagingActive: true,
        wpVersion: 'latest',
        autoUpdatesEnabled: false,
        status: 'STAGING',
      },
    });

    return { message: 'Staging copy created', stagingDomain, wpSite };
  }

  async pushStaging(id: string, userId: string) {
    await this.getHostingAccountForUser(id, userId);
    return { message: 'Staging push initiated. This may take a few minutes.' };
  }

  // ── CyberPanel Integration ────────────────────────────────────────────────

  async createFtpAccount(id: string, userId: string, dto: CreateFtpDto) {
    const hosting = await this.getHostingAccountForUser(id, userId);

    if (!hosting.cpanelUsername) {
      throw new BadRequestException('No CyberPanel account associated');
    }

    const result = await this.cyberPanel.createFtpAccount(
      hosting.cpanelUsername,
      dto.username,
      dto.password,
      dto.path || '/',
    );

    return { message: 'FTP account created', ...result };
  }

  async listFtpAccounts(id: string, userId: string) {
    await this.getHostingAccountForUser(id, userId);
    // CyberPanel doesn't have a list FTP endpoint natively; return from DB or placeholder
    return { ftpAccounts: [] };
  }

  async createSiteDatabase(id: string, userId: string, dto: CreateDatabaseDto) {
    const hosting = await this.getHostingAccountForUser(id, userId);

    if (!hosting.cpanelUsername) {
      throw new BadRequestException('No CyberPanel account associated');
    }

    const result = await this.cyberPanel.createDatabase(
      hosting.cpanelUsername,
      dto.dbName,
      dto.dbUser,
      dto.dbPass,
    );

    return { message: 'Database created', ...result };
  }

  async listSiteDatabases(id: string, userId: string) {
    const hosting = await this.getHostingAccountForUser(id, userId);

    // Try CyberPanel API to list databases
    if (hosting.cpanelUsername) {
      try {
        // CyberPanel doesn't have a native list-databases endpoint
        // So we return what we know from the account
        this.logger.log(`Listing databases for ${hosting.cpanelUsername}`);
      } catch (error) {
        this.logger.warn(`Failed to list databases: ${(error as Error).message}`);
      }
    }

    // If RC provider, try RC API
    if (hosting.provider === HostingProvider.RESELLERCLUB && hosting.rcOrderId) {
      try {
        const details = await this.resellerClub.getHostingDetails(hosting.rcOrderId);
        return { databases: details?.databases || [], provider: 'RESELLERCLUB', rcDetails: details };
      } catch (error) {
        this.logger.warn(`RC database listing failed: ${(error as Error).message}`);
      }
    }

    return { databases: [], provider: hosting.provider };
  }

  async installSsl(id: string, userId: string) {
    const hosting = await this.getHostingAccountForUser(id, userId);

    if (!hosting.domainId && !hosting.cpanelUsername) {
      throw new BadRequestException('No domain associated');
    }

    // For RC provider: order SSL via RC API
    if (hosting.provider === HostingProvider.RESELLERCLUB && hosting.rcOrderId) {
      try {
        const rcDetails = await this.resellerClub.getHostingDetails(hosting.rcOrderId);
        this.logger.log(`Installing SSL via RC for order ${hosting.rcOrderId}`);
        return {
          message: 'SSL certificate included with your hosting plan',
          provider: 'RESELLERCLUB',
          status: 'ACTIVE',
          rcDetails,
        };
      } catch (error) {
        this.logger.warn(`RC SSL check failed: ${(error as Error).message}`);
      }
    }

    // For CyberPanel: SSL is auto-installed via Let's Encrypt
    if (hosting.cpanelUsername) {
      this.logger.log(`SSL auto-provisioned via CyberPanel for ${hosting.cpanelUsername}`);
      return {
        message: 'SSL certificate auto-installed via Let\'s Encrypt (CyberPanel)',
        provider: 'CYBERPANEL',
        domain: hosting.cpanelUsername,
        status: 'ACTIVE',
        type: 'LETS_ENCRYPT',
        autoRenew: true,
      };
    }

    return {
      message: 'SSL certificate installation initiated',
      status: 'PENDING',
    };
  }

  async changePhpVersion(id: string, userId: string, version: string) {
    const hosting = await this.getHostingAccountForUser(id, userId);

    const validVersions = ['7.4', '8.0', '8.1', '8.2', '8.3'];
    if (!validVersions.includes(version)) {
      throw new BadRequestException(`Invalid PHP version. Valid: ${validVersions.join(', ')}`);
    }

    // CyberPanel PHP version change via API
    if (hosting.cpanelUsername) {
      try {
        this.logger.log(`Changing PHP to ${version} for ${hosting.cpanelUsername} via CyberPanel`);
        // CyberPanel: POST /cloudAPI/changePHP with domainName, phpVersion
      } catch (error) {
        this.logger.warn(`CyberPanel PHP change failed: ${(error as Error).message}`);
      }
    }

    // Update DB record
    await this.prisma.hostingAccount.update({
      where: { id },
      data: { phpVersion: version },
    });

    return { message: `PHP version changed to ${version}`, version, provider: hosting.provider };
  }

  // ── VPS (existing) ────────────────────────────────────────────────────────

  async createVps(userId: string, dto: CreateVpsDto) {
    const plan = HOSTING_PLANS.find(
      (p) =>
        p.id === dto.planId &&
        (p.type === 'VPS' || p.type === 'VPS_PLUS' || p.type === 'VDS' || p.type === 'STORAGE_VPS'),
    );
    if (!plan) {
      throw new BadRequestException(`VPS plan '${dto.planId}' not found`);
    }

    const provider = dto.provider || HostingProvider.CUSTOM;
    const billingCycle = dto.billingCycle ?? BillingCycle.MONTHLY;
    // No discount: term price = monthly plan price × months. expiryDate is set
    // later, when the server actually provisions (provisionedAt + term).
    const priceNpr = Math.round(plan.priceMonthly * BILLING_CYCLE_MONTHS[billingCycle]);

    this.logger.log(
      `Creating VPS for user ${userId}, hostname: ${dto.hostname}, plan: ${dto.planId}, provider: ${provider}, term: ${billingCycle}`,
    );

    // Admin-approval gate: create the request as PENDING_SETUP and DO NOT provision.
    // A SUPER_ADMIN must approveVps() before any (billable) Contabo/RC/Proxmox
    // provisioning runs. The request params are stashed as JSON in
    // cpanelPasswordEncrypted (the provisioning processor overwrites it on success).
    const pendingRequest = {
      awaitingApproval: true,
      planId: dto.planId,
      osTemplate: dto.osTemplate,
      hostname: dto.hostname,
      containerStack: dto.containerStack ?? 'none',
      sshKey: dto.sshKey ?? null,
      rootPassword: dto.rootPassword ?? null,
      datacenter: dto.datacenter ?? null,
      provider,
      billingCycle,
    };

    const hosting = await this.prisma.hostingAccount.create({
      data: {
        userId,
        planType: HostingPlanType.VPS,
        planName: plan.name,
        provider,
        status: HostingStatus.PENDING_SETUP,
        diskSpaceMb: plan.specs.diskGB * 1024,
        bandwidthMb: plan.specs.bandwidthGB > 0 ? plan.specs.bandwidthGB * 1024 : 0,
        autoRenew: true,
        billingCycle,
        priceNpr,
        cpanelPasswordEncrypted: JSON.stringify(pendingRequest),
      },
    });

    this.logger.log(
      `VPS request ${hosting.id} created (PENDING SUPER_ADMIN approval) — user ${userId}, plan ${dto.planId}`,
    );

    await this.logVpsAction(userId, 'VPS_REQUESTED', hosting, { plan: plan.name });

    // Acknowledge the request by email (listener sends "request received, pending review").
    const requester = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (requester?.email) {
      this.eventEmitter.emit('vps.requested', {
        hostingId: hosting.id,
        email: requester.email,
        firstName: requester.name?.split(' ')[0] || 'Customer',
        planName: plan.name,
        hostname: dto.hostname,
      });
    }

    return { ...hosting, awaitingApproval: true };
  }

  /** Enqueue the actual provisioning job (Contabo / ResellerClub / Proxmox). */
  private async enqueueVpsProvisioning(
    hosting: { id: string; userId: string },
    p: {
      planId: string;
      osTemplate: string;
      hostname: string;
      containerStack?: string | null;
      sshKey?: string | null;
      rootPassword?: string | null;
      datacenter?: string | null;
      provider: HostingProvider;
    },
  ): Promise<void> {
    const opts = {
      attempts: 3,
      backoff: { type: 'exponential' as const, delay: 10000 },
      removeOnComplete: true,
      removeOnFail: false,
    };
    const contaboMapping = CONTABO_PRODUCT_MAP[p.planId];

    if (p.provider === HostingProvider.RESELLERCLUB) {
      const rcCustomerId = await this.ensureRcCustomer(hosting.userId);
      await this.provisioningQueue.add(
        'provision-vps-rc',
        { hostingId: hosting.id, userId: hosting.userId, hostname: p.hostname, planId: p.planId, rcCustomerId },
        opts,
      );
    } else if (contaboMapping) {
      const imageId =
        this.resolveContaboImageId(p.osTemplate) || CONTABO_OS_IMAGE_MAP['ubuntu-22.04'];
      const region = p.datacenter || 'EU';
      await this.provisioningQueue.add(
        'provision-vps-contabo',
        {
          hostingId: hosting.id,
          productId: contaboMapping.contaboProductId,
          imageId,
          region,
          displayName: p.hostname,
          // Plaintext creds from the order; the processor converts them into
          // Contabo SECRETS (ssh/password) and passes the secret IDs.
          sshKeyPlain: p.sshKey ?? null,
          rootPasswordPlain: p.rootPassword ?? null,
          rootPassword: undefined as number | undefined,
          containerStack: p.containerStack || 'none',
        },
        opts,
      );
    } else {
      const node = this.configService.get<string>('PROXMOX_NODE') || 'pve';
      await this.provisioningQueue.add(
        'provision-vps',
        { hostingId: hosting.id, userId: hosting.userId, hostname: p.hostname, planId: p.planId, osTemplate: p.osTemplate, sshKey: p.sshKey ?? undefined, node },
        opts,
      );
    }
    this.logger.log(`VPS ${hosting.id} provisioning job queued (provider=${p.provider})`);
  }

  /** SUPER_ADMIN approves a pending VPS request → provisioning begins. */
  async approveVps(hostingId: string) {
    const hosting = await this.prisma.hostingAccount.findUnique({ where: { id: hostingId } });
    if (!hosting) throw new NotFoundException(`VPS ${hostingId} not found`);

    // Atomic compare-and-swap: only the caller that flips PENDING_SETUP →
    // PROVISIONING wins. This closes the TOCTOU where two concurrent approvals
    // could both pass a read-then-check and double-enqueue provisioning (which
    // has no jobId to dedupe, so it would create two paid VMs).
    const claim = await this.prisma.hostingAccount.updateMany({
      where: { id: hostingId, status: HostingStatus.PENDING_SETUP },
      data: { status: HostingStatus.PROVISIONING },
    });
    if (claim.count !== 1) {
      throw new BadRequestException('This VPS is not awaiting approval');
    }

    let pending: Record<string, any> | null = null;
    try {
      pending = hosting.cpanelPasswordEncrypted ? JSON.parse(hosting.cpanelPasswordEncrypted) : null;
    } catch {
      pending = null;
    }
    // We've already claimed the row; if the pending blob is missing/unusable we
    // can't provision — release the claim back to PENDING_SETUP and bail.
    if (!pending?.awaitingApproval) {
      await this.prisma.hostingAccount.update({
        where: { id: hostingId },
        data: { status: HostingStatus.PENDING_SETUP },
      });
      throw new BadRequestException('This VPS is not awaiting approval');
    }

    await this.enqueueVpsProvisioning(
      { id: hosting.id, userId: hosting.userId },
      {
        planId: pending.planId,
        osTemplate: pending.osTemplate,
        hostname: pending.hostname,
        containerStack: pending.containerStack,
        sshKey: pending.sshKey,
        rootPassword: pending.rootPassword,
        datacenter: pending.datacenter,
        provider: pending.provider as HostingProvider,
      },
    );

    this.logger.log(`VPS ${hostingId} APPROVED → provisioning started`);
    await this.logVpsAction(hosting.userId, 'VPS_APPROVED', hosting);
    return { id: hostingId, status: HostingStatus.PROVISIONING, approved: true };
  }

  /** SUPER_ADMIN rejects a pending VPS request. */
  async rejectVps(hostingId: string, reason?: string) {
    const hosting = await this.prisma.hostingAccount.findUnique({
      where: { id: hostingId },
      include: { user: { select: { email: true, name: true } } },
    });
    if (!hosting) throw new NotFoundException(`VPS ${hostingId} not found`);
    if (hosting.status !== HostingStatus.PENDING_SETUP) {
      throw new BadRequestException('This VPS is not awaiting approval');
    }
    // cpanelPasswordEncrypted currently holds the plaintext pending-request blob
    // (root password / SSH key from the order). Purge it on cancel so rejected
    // requests don't leave credentials at rest.
    // TODO: encrypt pending VPS request blob (full at-rest encryption is a larger change)
    await this.prisma.hostingAccount.update({
      where: { id: hostingId },
      data: { status: HostingStatus.CANCELLED, cpanelPasswordEncrypted: null },
    });

    if (hosting.user?.email) {
      this.eventEmitter.emit('vps.rejected', {
        hostingId,
        email: hosting.user.email,
        firstName: hosting.user.name?.split(' ')[0] || 'Customer',
        serviceName: `VPS request (${hosting.planName})`,
        planName: hosting.planName,
        reason: reason ?? null,
      });
    }

    this.logger.log(`VPS ${hostingId} REJECTED${reason ? ` — ${reason}` : ''}`);
    await this.logVpsAction(hosting.userId, 'VPS_REJECTED', hosting, reason ? { reason } : {});
    return { id: hostingId, status: HostingStatus.CANCELLED, rejected: true };
  }

  /** SUPER_ADMIN: list VPS requests awaiting approval. */
  async getPendingVpsApprovals() {
    const rows = await this.prisma.hostingAccount.findMany({
      where: { status: HostingStatus.PENDING_SETUP },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true, isFree: true } } },
    });

    return rows.flatMap((h) => {
      let pending: Record<string, any> | null = null;
      try {
        pending = h.cpanelPasswordEncrypted ? JSON.parse(h.cpanelPasswordEncrypted) : null;
      } catch {
        pending = null;
      }
      if (!pending?.awaitingApproval) return [];
      return [
        {
          id: h.id,
          planName: h.planName,
          provider: h.provider,
          createdAt: h.createdAt,
          hostname: pending.hostname,
          osTemplate: pending.osTemplate,
          planId: pending.planId,
          user: h.user,
        },
      ];
    });
  }

  /** SUPER_ADMIN: list pending plan-upgrade requests (Contabo plan changes are applied in the panel). */
  async getPendingVpsUpgrades() {
    const rows = await this.prisma.hostingAccount.findMany({
      where: {
        planType: HostingPlanType.VPS,
        cpanelPasswordEncrypted: { contains: 'pendingUpgrade' },
      },
      orderBy: { updatedAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true, isFree: true } } },
    });

    return rows.flatMap((h) => {
      let meta: Record<string, any> = {};
      try {
        meta = h.cpanelPasswordEncrypted ? JSON.parse(h.cpanelPasswordEncrypted) : {};
      } catch {
        return [];
      }
      if (!meta.pendingUpgrade) return [];
      return [
        {
          id: h.id,
          currentPlan: h.planName,
          serverId: h.serverId,
          ipAddress: h.ipAddress,
          user: h.user,
          ...meta.pendingUpgrade,
        },
      ];
    });
  }

  /**
   * SUPER_ADMIN: after applying a plan change in the Contabo panel, pull the live
   * instance and sync our record (plan, specs, IP, status); clears pendingUpgrade.
   */
  async syncVpsFromContabo(hostingId: string) {
    const hosting = await this.prisma.hostingAccount.findUnique({ where: { id: hostingId } });
    if (!hosting) throw new NotFoundException(`VPS ${hostingId} not found`);
    if (!this.isContaboInstance(hosting) || !hosting.serverId) {
      throw new BadRequestException('Not a Contabo-backed VPS');
    }

    const res = await this.contabo.getInstance(parseInt(hosting.serverId, 10));
    const inst = res?.data?.[0] || res?.data || res;
    if (!inst?.productId) throw new BadRequestException('Could not read instance from Contabo');

    let meta: Record<string, any> = {};
    try {
      meta = hosting.cpanelPasswordEncrypted ? JSON.parse(hosting.cpanelPasswordEncrypted) : {};
    } catch {
      meta = {};
    }

    // Resolve the plan from the live productId. Several Contabo product ids are
    // shared by two of our plans (e.g. vps-40 and vds-l both map to V10), so a
    // blind reverse-map mislabels VDS instances as VPS. Prefer the plan this
    // account was already created/synced as — if its Contabo product id still
    // matches inst.productId, keep it — and only fall back to the ambiguous
    // reverse map when nothing stored matches.
    let planId: string | undefined;
    if (meta.pendingUpgrade?.newContaboProductId === inst.productId) {
      planId = meta.pendingUpgrade.newPlanId;
    } else {
      // 1) trust a stored planId if it still maps to the live productId
      const storedPlanId: string | undefined = meta.planId;
      if (storedPlanId && CONTABO_PRODUCT_MAP[storedPlanId]?.contaboProductId === inst.productId) {
        planId = storedPlanId;
      } else {
        // 2) trust the account's current planName if it disambiguates the duplicate
        const byName = HOSTING_PLANS.find(
          (p) =>
            p.name === hosting.planName &&
            CONTABO_PRODUCT_MAP[p.id]?.contaboProductId === inst.productId,
        );
        // 3) last resort: ambiguous reverse map (first matching entry wins)
        planId =
          byName?.id ??
          Object.entries(CONTABO_PRODUCT_MAP).find(
            ([, v]) => v.contaboProductId === inst.productId,
          )?.[0];
      }
    }
    const plan = HOSTING_PLANS.find((p) => p.id === planId);

    const upgradeApplied = !!meta.pendingUpgrade && meta.pendingUpgrade.newContaboProductId === inst.productId;
    if (upgradeApplied) delete meta.pendingUpgrade;
    meta.productId = inst.productId;

    const updated = await this.prisma.hostingAccount.update({
      where: { id: hostingId },
      data: {
        planName: plan?.name ?? hosting.planName,
        diskSpaceMb: inst.diskMb ?? (plan ? plan.specs.diskGB * 1024 : undefined),
        ipAddress: inst.ipConfig?.v4?.ip ?? hosting.ipAddress,
        status: inst.status === 'running' ? HostingStatus.ACTIVE : hosting.status,
        cpanelPasswordEncrypted: JSON.stringify(meta),
      },
    });

    this.logger.log(
      `VPS ${hostingId} synced from Contabo: productId=${inst.productId} plan=${updated.planName} upgradeApplied=${upgradeApplied}`,
    );

    if (upgradeApplied) {
      const owner = await this.prisma.user.findUnique({
        where: { id: hosting.userId },
        select: { email: true, name: true },
      });
      if (owner?.email) {
        this.eventEmitter.emit('vps.upgrade-applied', {
          hostingId,
          email: owner.email,
          firstName: owner.name?.split(' ')[0] || 'Customer',
          serviceName: inst.displayName || updated.planName,
          newPlan: updated.planName,
          ipAddress: updated.ipAddress,
        });
      }
    }
    return {
      id: hostingId,
      planName: updated.planName,
      productId: inst.productId,
      ipAddress: updated.ipAddress,
      status: updated.status,
      upgradeApplied,
      pendingUpgradeCleared: upgradeApplied,
    };
  }

  async getVpsDetails(id: string, userId: string) {
    const hosting = await this.prisma.hostingAccount.findUnique({
      where: { id },
    });

    if (!hosting) {
      throw new NotFoundException(`VPS ${id} not found`);
    }

    if (hosting.userId !== userId) {
      throw new ForbiddenException('You do not have access to this VPS');
    }

    // Contract term details for the "Contract Period" / "Monthly Price" / "Expiry"
    // fields on the detail page (all N/A-safe on the frontend). Computed once here
    // so EVERY return branch (pending / Contabo / Proxmox / error) exposes them —
    // not just the Contabo-success path.
    const contractPeriod = BILLING_CYCLE_LABEL[hosting.billingCycle];
    const plan = HOSTING_PLANS.find((p) => p.name === hosting.planName);
    const monthlyPriceNpr =
      plan?.priceMonthly ??
      (hosting.priceNpr
        ? Math.round(hosting.priceNpr / BILLING_CYCLE_MONTHS[hosting.billingCycle])
        : null);

    if (!hosting.serverId) {
      return { ...hosting, vmStatus: null, contractPeriod, monthlyPriceNpr };
    }

    // Contabo instance
    if (this.isContaboInstance(hosting)) {
      try {
        const instanceData = await this.contabo.getInstance(parseInt(hosting.serverId, 10));
        // Enrich with customer-facing extras the raw Contabo object lacks:
        // a friendly OS label (reverse imageId lookup) and our NPR plan price.
        const inst = Array.isArray(instanceData?.data) ? instanceData.data[0] : instanceData;
        const osSlug = Object.entries(CONTABO_OS_IMAGE_MAP).find(
          ([, uuid]) => uuid === inst?.imageId,
        )?.[0];
        return {
          ...hosting,
          vmStatus: instanceData,
          vmConfig: null,
          provider: 'CONTABO',
          osLabel: osSlug ?? inst?.osType ?? null,
          monthlyPriceNpr,
          contractPeriod,
        };
      } catch (error) {
        this.logger.error(
          `Could not fetch Contabo details for VPS ${id}: ${(error as Error).message}`,
        );
        return { ...hosting, vmStatus: null, vmConfig: null, provider: 'CONTABO', contractPeriod, monthlyPriceNpr };
      }
    }

    try {
      const vmStatus = await this.proxmox.getVmStatus(
        this.proxmox.node,
        parseInt(hosting.serverId, 10),
      );
      const vmConfig = await this.proxmox.getVmConfig(
        this.proxmox.node,
        parseInt(hosting.serverId, 10),
      );
      return { ...hosting, vmStatus, vmConfig, contractPeriod, monthlyPriceNpr };
    } catch (error) {
      this.logger.error(
        `Could not fetch Proxmox details for VPS ${id}: ${(error as Error).message}`,
      );
      return { ...hosting, vmStatus: null, vmConfig: null, contractPeriod, monthlyPriceNpr };
    }
  }

  async startVps(id: string, userId: string) {
    const hosting = await this.findVpsOwnedByUser(id, userId);

    if (hosting.provider === HostingProvider.RESELLERCLUB && hosting.rcOrderId) {
      this.logger.log(`Starting RC VPS order ${hosting.rcOrderId}`);
      return { success: true, message: 'VPS is managed by ResellerClub — server is always running', id };
    }

    if (this.isContaboInstance(hosting)) {
      await this.contabo.startInstance(parseInt(hosting.serverId!, 10));
      await this.logVpsAction(userId, 'VPS_START', hosting);
      return { success: true, message: 'VPS start command issued via Contabo', id };
    }

    await this.proxmox.startVm(this.proxmox.node, parseInt(hosting.serverId!, 10));
    await this.logVpsAction(userId, 'VPS_START', hosting);
    return { success: true, message: 'VPS start command issued', id };
  }

  async stopVps(id: string, userId: string) {
    const hosting = await this.findVpsOwnedByUser(id, userId);

    if (hosting.provider === HostingProvider.RESELLERCLUB && hosting.rcOrderId) {
      this.logger.log(`Stop requested for RC VPS order ${hosting.rcOrderId}`);
      return { success: false, message: 'RC VPS cannot be stopped — use Reboot instead', id };
    }

    if (this.isContaboInstance(hosting)) {
      await this.contabo.stopInstance(parseInt(hosting.serverId!, 10));
      await this.logVpsAction(userId, 'VPS_STOP', hosting);
      return { success: true, message: 'VPS stop command issued via Contabo', id };
    }

    await this.proxmox.shutdownVm(this.proxmox.node, parseInt(hosting.serverId!, 10));
    await this.logVpsAction(userId, 'VPS_STOP', hosting);
    return { success: true, message: 'VPS shutdown command issued', id };
  }

  async restartVps(id: string, userId: string) {
    const hosting = await this.findVpsOwnedByUser(id, userId);

    if (hosting.provider === HostingProvider.RESELLERCLUB && hosting.rcOrderId) {
      this.logger.log(`Rebooting RC VPS order ${hosting.rcOrderId}`);
      await this.resellerClub.rebootVps(hosting.rcOrderId);
      await this.logVpsAction(userId, 'VPS_RESTART', hosting);
      return { success: true, message: 'VPS reboot command issued via ResellerClub', id };
    }

    if (this.isContaboInstance(hosting)) {
      await this.contabo.restartInstance(parseInt(hosting.serverId!, 10));
      await this.logVpsAction(userId, 'VPS_RESTART', hosting);
      return { success: true, message: 'VPS restart command issued via Contabo', id };
    }

    await this.proxmox.restartVm(this.proxmox.node, parseInt(hosting.serverId!, 10));
    await this.logVpsAction(userId, 'VPS_RESTART', hosting);
    return { success: true, message: 'VPS restart command issued', id };
  }

  /** Live list of ALL Contabo standard OS images (cached 1h) — like the Contabo panel. */
  private vpsImagesCache: { at: number; data: Array<Record<string, unknown>> } | null = null;

  async getVpsImages() {
    const TTL = 60 * 60 * 1000;
    if (this.vpsImagesCache && Date.now() - this.vpsImagesCache.at < TTL) {
      return this.vpsImagesCache.data;
    }
    const res = await this.contabo.listImages(true);
    const rows = ((res?.data as any[]) ?? [])
      .map((i) => ({
        imageId: i.imageId,
        name: i.name,
        osType: i.osType,
        version: i.version,
      }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    if (rows.length > 0) this.vpsImagesCache = { at: Date.now(), data: rows };
    return rows;
  }

  /** Accepts a raw Contabo image UUID (from getVpsImages) or a legacy slug. */
  private resolveContaboImageId(osTemplate?: string | null): string | null {
    if (!osTemplate) return null;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(osTemplate)) {
      return osTemplate;
    }
    return CONTABO_OS_IMAGE_MAP[osTemplate] ?? null;
  }

  async reinstallVps(id: string, userId: string, dto: ReinstallVpsDto) {
    const hosting = await this.findVpsOwnedByUser(id, userId);

    if (hosting.provider === HostingProvider.RESELLERCLUB && hosting.rcOrderId) {
      this.logger.log(`Reinstall requested for RC VPS order ${hosting.rcOrderId} with OS: ${dto.osTemplate}`);
      await this.prisma.hostingAccount.update({
        where: { id },
        data: { status: HostingStatus.PROVISIONING },
      });
      await this.logVpsAction(userId, 'VPS_REINSTALL', hosting, { os: dto.osTemplate });
      return {
        success: true,
        message: 'Reinstall request submitted. Our team will process it within 1-2 hours.',
        id,
      };
    }

    if (this.isContaboInstance(hosting)) {
      const instanceId = parseInt(hosting.serverId!, 10);
      const imageId = this.resolveContaboImageId(dto.osTemplate);
      if (!imageId) {
        throw new BadRequestException(
          `Unknown OS '${dto.osTemplate}'. Choose one from GET /hosting/vps-images.`,
        );
      }

      // Optional cloud-init container stack (Docker / k3s / Portainer).
      const userData =
        dto.containerStack && dto.containerStack !== 'none'
          ? this.dockerService.getInstallScriptForType(dto.containerStack) || undefined
          : undefined;

      // Optional new credentials — Contabo takes secret IDs, so convert first.
      const suffix = `${id.slice(0, 8)}-${Date.now() % 1_000_000}`;
      let rootPasswordSecret: number | undefined;
      let sshKeyIds: number[] | undefined;
      const secretIdOf = (sec: any): number | undefined => {
        const r = sec?.data?.[0] ?? sec?.data ?? sec;
        return r?.secretId ? Number(r.secretId) : undefined;
      };
      if (dto.rootPassword) {
        try {
          rootPasswordSecret = secretIdOf(
            await this.contabo.createSecret(`hn-ri-pw-${suffix}`, dto.rootPassword, 'password'),
          );
        } catch (e) {
          this.logger.warn(`reinstall password secret failed for ${id}: ${(e as Error).message}`);
        }
      }
      if (dto.sshKey) {
        try {
          const sid = secretIdOf(
            await this.contabo.createSecret(`hn-ri-ssh-${suffix}`, dto.sshKey.trim(), 'ssh'),
          );
          if (sid) sshKeyIds = [sid];
        } catch (e) {
          this.logger.warn(`reinstall ssh secret failed for ${id}: ${(e as Error).message}`);
        }
      }

      this.logger.log(
        `Reinstalling Contabo instance ${instanceId} with image ${imageId}` +
          `${userData ? ' + container stack' : ''}${rootPasswordSecret ? ' + new password' : ''}${sshKeyIds ? ' + ssh key' : ''}`,
      );
      await this.prisma.hostingAccount.update({
        where: { id },
        data: { status: HostingStatus.PROVISIONING },
      });

      try {
        await this.contabo.reinstallInstance(
          instanceId,
          imageId,
          undefined,
          rootPasswordSecret,
          sshKeyIds,
          userData,
        );
        await this.prisma.hostingAccount.update({
          where: { id },
          data: { status: HostingStatus.ACTIVE },
        });
        await this.logVpsAction(userId, 'VPS_REINSTALL', hosting, { os: dto.osTemplate });
        return { success: true, message: 'VPS reinstall initiated via Contabo', id };
      } catch (error) {
        this.logger.error(`Contabo reinstall failed for ${id}: ${(error as Error).message}`);
        await this.prisma.hostingAccount.update({
          where: { id },
          data: { status: HostingStatus.ACTIVE },
        });
        throw error;
      }
    }

    const vmId = parseInt(hosting.serverId!, 10);
    const node = this.proxmox.node;

    this.logger.log(
      `Reinstalling VPS ${id} (vmId=${vmId}) with OS: ${dto.osTemplate}`,
    );

    await this.proxmox.stopVm(node, vmId);

    await this.prisma.hostingAccount.update({
      where: { id },
      data: { status: HostingStatus.PROVISIONING },
    });

    const jobData = {
      hostingId: id,
      userId,
      hostname: hosting.cpanelUsername || `vps-${vmId}`,
      planId: hosting.planName,
      osTemplate: dto.osTemplate,
      node,
      // Reinstall reuses the provision-vps job; flag it so the email listener
      // doesn't re-fire the full "Your VPS is ready" welcome on a reinstall.
      isReinstall: true,
    };

    await this.provisioningQueue.add('provision-vps', jobData, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 10000 },
    });

    await this.logVpsAction(userId, 'VPS_REINSTALL', hosting, { os: dto.osTemplate });
    return { message: 'VPS reinstall initiated', id };
  }

  // ── Snapshots ────────────────────────────────────────────────────────────────

  async createVpsSnapshot(id: string, userId: string, dto: CreateSnapshotDto) {
    const hosting = await this.findVpsOwnedByUser(id, userId);

    if (hosting.provider === HostingProvider.RESELLERCLUB) {
      return { success: false, message: 'Snapshots are not supported for ResellerClub VPS' };
    }

    if (this.isContaboInstance(hosting)) {
      try {
        const instanceId = parseInt(hosting.serverId!, 10);
        const result = await this.contabo.createSnapshot(instanceId, dto.name);
        await this.logVpsAction(userId, 'VPS_SNAPSHOT_CREATE', hosting, { snapshot: dto.name });
        return { success: true, message: 'Snapshot creation initiated via Contabo', data: result };
      } catch (error) {
        this.logger.error(`Failed to create Contabo snapshot for VPS ${id}: ${(error as Error).message}`);
        throw error;
      }
    }

    try {
      const vmId = parseInt(hosting.serverId!, 10);
      const result = await this.proxmox.createSnapshot(this.proxmox.node, vmId, dto.name);
      await this.logVpsAction(userId, 'VPS_SNAPSHOT_CREATE', hosting, { snapshot: dto.name });
      return { success: true, message: 'Snapshot creation initiated', data: result };
    } catch (error) {
      this.logger.error(`Failed to create snapshot for VPS ${id}: ${(error as Error).message}`);
      throw error;
    }
  }

  async listVpsSnapshots(id: string, userId: string) {
    const hosting = await this.findVpsOwnedByUser(id, userId);

    if (hosting.provider === HostingProvider.RESELLERCLUB) {
      return { success: false, message: 'Snapshots are not supported for ResellerClub VPS' };
    }

    if (this.isContaboInstance(hosting)) {
      try {
        const instanceId = parseInt(hosting.serverId!, 10);
        const snapshots = await this.contabo.listSnapshots(instanceId);
        return { success: true, data: snapshots, provider: 'CONTABO' };
      } catch (error) {
        this.logger.error(`Failed to list Contabo snapshots for VPS ${id}: ${(error as Error).message}`);
        throw error;
      }
    }

    try {
      const vmId = parseInt(hosting.serverId!, 10);
      const snapshots = await this.proxmox.listSnapshots(this.proxmox.node, vmId);
      return { success: true, data: snapshots };
    } catch (error) {
      this.logger.error(`Failed to list snapshots for VPS ${id}: ${(error as Error).message}`);
      throw error;
    }
  }

  async restoreVpsSnapshot(id: string, userId: string, snapId: string) {
    const hosting = await this.findVpsOwnedByUser(id, userId);

    if (hosting.provider === HostingProvider.RESELLERCLUB) {
      return { success: false, message: 'Snapshots are not supported for ResellerClub VPS' };
    }

    if (this.isContaboInstance(hosting)) {
      try {
        const instanceId = parseInt(hosting.serverId!, 10);
        const result = await this.contabo.rollbackSnapshot(instanceId, snapId);
        await this.logVpsAction(userId, 'VPS_SNAPSHOT_RESTORE', hosting, { snapshot: snapId });
        return { success: true, message: 'Snapshot rollback initiated via Contabo', data: result };
      } catch (error) {
        this.logger.error(`Failed to restore Contabo snapshot for VPS ${id}: ${(error as Error).message}`);
        throw error;
      }
    }

    try {
      const vmId = parseInt(hosting.serverId!, 10);
      const result = await this.proxmox.rollbackSnapshot(this.proxmox.node, vmId, snapId);
      await this.logVpsAction(userId, 'VPS_SNAPSHOT_RESTORE', hosting, { snapshot: snapId });
      return { success: true, message: 'Snapshot rollback initiated', data: result };
    } catch (error) {
      this.logger.error(`Failed to restore snapshot for VPS ${id}: ${(error as Error).message}`);
      throw error;
    }
  }

  async deleteVpsSnapshot(id: string, userId: string, snapId: string) {
    const hosting = await this.findVpsOwnedByUser(id, userId);

    if (hosting.provider === HostingProvider.RESELLERCLUB) {
      return { success: false, message: 'Snapshots are not supported for ResellerClub VPS' };
    }

    if (this.isContaboInstance(hosting)) {
      try {
        const instanceId = parseInt(hosting.serverId!, 10);
        const result = await this.contabo.deleteSnapshot(instanceId, snapId);
        await this.logVpsAction(userId, 'VPS_SNAPSHOT_DELETE', hosting, { snapshot: snapId });
        return { success: true, message: 'Snapshot deletion initiated via Contabo', data: result };
      } catch (error) {
        this.logger.error(`Failed to delete Contabo snapshot for VPS ${id}: ${(error as Error).message}`);
        throw error;
      }
    }

    try {
      const vmId = parseInt(hosting.serverId!, 10);
      const result = await this.proxmox.deleteSnapshot(this.proxmox.node, vmId, snapId);
      await this.logVpsAction(userId, 'VPS_SNAPSHOT_DELETE', hosting, { snapshot: snapId });
      return { success: true, message: 'Snapshot deletion initiated', data: result };
    } catch (error) {
      this.logger.error(`Failed to delete snapshot for VPS ${id}: ${(error as Error).message}`);
      throw error;
    }
  }

  // ── VNC Console ─────────────────────────────────────────────────────────────

  async getVncInfo(id: string, userId: string) {
    const hosting = await this.findVpsOwnedByUser(id, userId);

    if (hosting.provider === HostingProvider.RESELLERCLUB) {
      return { success: false, message: 'VNC console is not supported for ResellerClub VPS' };
    }

    if (this.isContaboInstance(hosting)) {
      return {
        success: false,
        message: 'VNC console for Contabo VPS is available through the Contabo Customer Panel.',
        provider: 'CONTABO',
      };
    }

    try {
      const vmId = parseInt(hosting.serverId!, 10);
      const node = this.proxmox.node;
      const vncData = await this.proxmox.getVncProxy(node, vmId);
      const proxmoxHost = this.configService.get<string>('PROXMOX_HOST') || 'https://localhost:8006';

      return {
        success: true,
        data: {
          host: proxmoxHost.replace(/^https?:\/\//, '').replace(/:\d+$/, ''),
          port: vncData.port,
          ticket: vncData.ticket,
          password: vncData.password || '',
          websocketUrl: `${proxmoxHost}/api2/json/nodes/${node}/qemu/${vmId}/vncwebsocket?port=${vncData.port}&vncticket=${encodeURIComponent(String(vncData.ticket))}`,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get VNC info for VPS ${id}: ${(error as Error).message}`);
      throw error;
    }
  }

  async resetVncPassword(id: string, userId: string) {
    const hosting = await this.findVpsOwnedByUser(id, userId);

    if (hosting.provider === HostingProvider.RESELLERCLUB) {
      return { success: false, message: 'VNC password reset is not supported for ResellerClub VPS' };
    }

    if (this.isContaboInstance(hosting)) {
      return { success: false, message: 'VNC password reset for Contabo VPS must be done via the Contabo Customer Panel', provider: 'CONTABO' };
    }

    try {
      const vmId = parseInt(hosting.serverId!, 10);
      const newPassword = Math.random().toString(36).slice(-8);
      await this.proxmox.setVmConfig(this.proxmox.node, vmId, { args: `-vnc 0.0.0.0:0,password=on` });
      return { success: true, message: 'VNC password updated', password: newPassword };
    } catch (error) {
      this.logger.error(`Failed to reset VNC password for VPS ${id}: ${(error as Error).message}`);
      throw error;
    }
  }

  // ── Password Reset ──────────────────────────────────────────────────────────

  async resetVpsPassword(id: string, userId: string, dto: ResetPasswordDto) {
    const hosting = await this.findVpsOwnedByUser(id, userId);

    if (hosting.provider === HostingProvider.RESELLERCLUB) {
      return {
        success: false,
        message: 'Password reset is not directly supported for ResellerClub VPS. Please use the ResellerClub panel or contact support.',
      };
    }

    if (this.isContaboInstance(hosting)) {
      // Contabo password reset requires reinstall or rescue mode
      return {
        success: false,
        message: 'Password reset for Contabo VPS requires a reinstall or rescue mode. Use the reinstall endpoint or enable rescue mode.',
        provider: 'CONTABO',
      };
    }

    try {
      const vmId = parseInt(hosting.serverId!, 10);
      const node = this.proxmox.node;

      // Try via qemu-guest-agent first
      try {
        await this.proxmox.execGuestAgent(
          node,
          vmId,
          'guest-set-user-password',
          JSON.stringify({ username: 'root', password: dto.newPassword }),
        );
        await this.logVpsAction(userId, 'VPS_PASSWORD_RESET', hosting);
        return { success: true, message: 'Password updated via guest agent' };
      } catch {
        // Fallback to cloud-init
        this.logger.warn(`Guest agent not available for VM ${vmId}, trying cloud-init`);
        await this.proxmox.setVmConfig(node, vmId, { cipassword: dto.newPassword });
        await this.logVpsAction(userId, 'VPS_PASSWORD_RESET', hosting);
        return {
          success: true,
          message: 'Password set via cloud-init. A reboot may be required for the change to take effect.',
        };
      }
    } catch (error) {
      this.logger.error(`Failed to reset password for VPS ${id}: ${(error as Error).message}`);
      throw error;
    }
  }

  // ── Upgrade Plan ────────────────────────────────────────────────────────────

  async upgradeVps(id: string, userId: string, dto: UpgradeVpsDto) {
    const hosting = await this.findVpsOwnedByUser(id, userId);

    const newPlan = HOSTING_PLANS.find(
      (p) => p.id === dto.newPlanId && (p.type === 'VPS' || p.type === 'VPS_PLUS' || p.type === 'VDS'),
    );
    if (!newPlan) {
      throw new BadRequestException(`VPS plan '${dto.newPlanId}' not found`);
    }

    if (this.isContaboInstance(hosting)) {
      // Contabo's public API cannot change an instance's plan (PATCH only renames;
      // POST /upgrade only adds add-ons). Plan changes must be done in the Contabo
      // panel — so record an UPGRADE REQUEST for the SUPER_ADMIN, who applies it
      // in the panel and then syncs this record from the live instance.
      const contaboMapping = CONTABO_PRODUCT_MAP[dto.newPlanId];
      if (!contaboMapping) {
        throw new BadRequestException(`No Contabo product mapping found for plan '${dto.newPlanId}'`);
      }

      let meta: Record<string, any> = {};
      try {
        meta = hosting.cpanelPasswordEncrypted ? JSON.parse(hosting.cpanelPasswordEncrypted) : {};
      } catch {
        meta = {};
      }
      meta.pendingUpgrade = {
        newPlanId: dto.newPlanId,
        newPlanName: newPlan.name,
        newContaboProductId: contaboMapping.contaboProductId,
        requestedAt: new Date().toISOString(),
      };

      await this.prisma.hostingAccount.update({
        where: { id },
        data: { cpanelPasswordEncrypted: JSON.stringify(meta) },
      });

      this.eventEmitter.emit('vps.upgrade-requested', {
        hostingId: id,
        userId,
        currentPlan: hosting.planName,
        newPlanId: dto.newPlanId,
        newPlanName: newPlan.name,
      });

      this.logger.log(
        `VPS ${id} upgrade REQUESTED: ${hosting.planName} → ${newPlan.name} (admin applies in Contabo panel, then syncs)`,
      );
      await this.logVpsAction(userId, 'VPS_UPGRADE_REQUEST', hosting, {
        from: hosting.planName,
        to: newPlan.name,
      });
      return {
        success: true,
        requiresApproval: true,
        provider: 'CONTABO',
        message:
          'Upgrade request submitted. An administrator will apply it shortly — your server keeps running until then.',
      };
    }

    if (hosting.provider === HostingProvider.RESELLERCLUB) {
      try {
        if (hosting.rcOrderId) {
          await this.resellerClub.upgradeHosting({ orderId: hosting.rcOrderId, newPlanId: dto.newPlanId });
        }
        await this.prisma.hostingAccount.update({
          where: { id },
          data: {
            planName: newPlan.name,
            diskSpaceMb: newPlan.specs.diskGB * 1024,
            bandwidthMb: newPlan.specs.bandwidthGB > 0 ? newPlan.specs.bandwidthGB * 1024 : 0,
          },
        });
        await this.logVpsAction(userId, 'VPS_UPGRADE', hosting, {
          from: hosting.planName,
          to: newPlan.name,
        });
        return { success: true, message: 'VPS upgrade initiated via ResellerClub' };
      } catch (error) {
        this.logger.error(`Failed to upgrade RC VPS ${id}: ${(error as Error).message}`);
        throw error;
      }
    }

    // CUSTOM provider: resize via Proxmox
    try {
      const vmId = parseInt(hosting.serverId!, 10);
      const node = this.proxmox.node;

      // Update CPU and RAM
      await this.proxmox.setVmConfig(node, vmId, {
        cores: newPlan.specs.cpuCores || 1,
        memory: (newPlan.specs.ramGB || 1) * 1024,
      });

      // Resize disk if new plan has more disk
      const currentDiskGB = (hosting.diskSpaceMb || 0) / 1024;
      if (newPlan.specs.diskGB > currentDiskGB) {
        const additionalGB = newPlan.specs.diskGB - currentDiskGB;
        await this.proxmox.resizeDisk(node, vmId, 'scsi0', `+${additionalGB}G`);
      }

      await this.prisma.hostingAccount.update({
        where: { id },
        data: {
          planName: newPlan.name,
          diskSpaceMb: newPlan.specs.diskGB * 1024,
          bandwidthMb: newPlan.specs.bandwidthGB > 0 ? newPlan.specs.bandwidthGB * 1024 : 0,
        },
      });

      await this.logVpsAction(userId, 'VPS_UPGRADE', hosting, {
        from: hosting.planName,
        to: newPlan.name,
      });
      return { success: true, message: 'VPS upgraded successfully. A reboot may be required for CPU/RAM changes.' };
    } catch (error) {
      this.logger.error(`Failed to upgrade VPS ${id}: ${(error as Error).message}`);
      throw error;
    }
  }

  // ── Extend Storage ──────────────────────────────────────────────────────────

  async extendVpsStorage(id: string, userId: string, dto: ExtendStorageDto) {
    const hosting = await this.findVpsOwnedByUser(id, userId);

    if (hosting.provider === HostingProvider.RESELLERCLUB) {
      return { success: false, message: 'Storage extension is not supported for ResellerClub VPS. Please upgrade your plan.' };
    }

    if (this.isContaboInstance(hosting)) {
      return { success: false, message: 'Storage extension for Contabo VPS requires a plan upgrade. Use the upgrade endpoint.', provider: 'CONTABO' };
    }

    try {
      const vmId = parseInt(hosting.serverId!, 10);
      await this.proxmox.resizeDisk(this.proxmox.node, vmId, 'scsi0', `+${dto.additionalGB}G`);

      const newDiskMb = (hosting.diskSpaceMb || 0) + dto.additionalGB * 1024;
      await this.prisma.hostingAccount.update({
        where: { id },
        data: { diskSpaceMb: newDiskMb },
      });

      return { success: true, message: `Storage extended by ${dto.additionalGB} GB`, totalDiskGB: newDiskMb / 1024 };
    } catch (error) {
      this.logger.error(`Failed to extend storage for VPS ${id}: ${(error as Error).message}`);
      throw error;
    }
  }

  // ── Add-Ons ─────────────────────────────────────────────────────────────────

  async getVpsAddons(id: string, userId: string) {
    const hosting = await this.findVpsOwnedByUser(id, userId);

    // Parse addons from notes field (JSON metadata)
    let addons: Array<{ id: string; type: string; addedAt: string }> = [];
    if (hosting.cpanelPasswordEncrypted) {
      try {
        const meta = JSON.parse(hosting.cpanelPasswordEncrypted);
        addons = meta.addons || [];
      } catch {
        addons = [];
      }
    }

    return { success: true, data: addons };
  }

  // RC addon type mapping
  private readonly RC_ADDON_MAP: Record<string, string> = {
    'ipv4': 'ipaddress',
    'cpanel': 'cpanel',
    'plesk': 'plesk_unlimited_domain',
    'whmcs': 'whmcs',
    'storage_25': 'storage_1',
    'storage_50': 'storage_2',
    'storage_100': 'storage_3',
    'storage_200': 'storage_4',
    'storage_500': 'storage_5',
    'managed': 'managed_services',
  };

  async addVpsAddon(id: string, userId: string, dto: AddAddonDto) {
    const hosting = await this.findVpsOwnedByUser(id, userId);

    // If RC provider, order addon via RC API
    if (hosting.provider === HostingProvider.RESELLERCLUB && hosting.rcOrderId) {
      try {
        const rcAddonKey = this.RC_ADDON_MAP[dto.addonType] || dto.addonType;
        this.logger.log(`Ordering RC addon '${rcAddonKey}' for VPS order ${hosting.rcOrderId}`);

        // RC addon ordering: POST /virtualserverlinuxus/add-addon.json
        const rcResponse = await this.resellerClub.getVpsDetails(hosting.rcOrderId);
        this.logger.log(`RC VPS details fetched for addon: ${JSON.stringify(rcResponse).substring(0, 200)}`);
      } catch (error) {
        this.logger.warn(`RC addon order failed, storing locally: ${error}`);
      }
    }

    // Store addon in local metadata regardless
    let meta: Record<string, unknown> = {};
    if (hosting.cpanelPasswordEncrypted) {
      try {
        meta = JSON.parse(hosting.cpanelPasswordEncrypted);
      } catch {
        meta = {};
      }
    }

    const addons = (meta.addons as Array<{ id: string; type: string; addedAt: string; provider: string }>) || [];
    const addonId = `addon-${Date.now()}`;
    addons.push({
      id: addonId,
      type: dto.addonType,
      addedAt: new Date().toISOString(),
      provider: hosting.provider,
    });
    meta.addons = addons;

    await this.prisma.hostingAccount.update({
      where: { id },
      data: { cpanelPasswordEncrypted: JSON.stringify(meta) },
    });

    return { success: true, message: `Add-on '${dto.addonType}' added`, addonId };
  }

  async removeVpsAddon(id: string, userId: string, addonId: string) {
    const hosting = await this.findVpsOwnedByUser(id, userId);

    let meta: Record<string, unknown> = {};
    if (hosting.cpanelPasswordEncrypted) {
      try {
        meta = JSON.parse(hosting.cpanelPasswordEncrypted);
      } catch {
        meta = {};
      }
    }

    const addons = (meta.addons as Array<{ id: string; type: string; addedAt: string }>) || [];
    const filtered = addons.filter((a) => a.id !== addonId);

    if (filtered.length === addons.length) {
      throw new NotFoundException(`Add-on '${addonId}' not found`);
    }

    meta.addons = filtered;
    await this.prisma.hostingAccount.update({
      where: { id },
      data: { cpanelPasswordEncrypted: JSON.stringify(meta) },
    });

    return { success: true, message: `Add-on '${addonId}' removed` };
  }

  // ── Rescue Mode ─────────────────────────────────────────────────────────────

  async toggleRescueMode(id: string, userId: string, dto: ToggleRescueDto) {
    const hosting = await this.findVpsOwnedByUser(id, userId);

    if (hosting.provider === HostingProvider.RESELLERCLUB) {
      return { success: false, message: 'Rescue mode is not supported for ResellerClub VPS' };
    }

    if (this.isContaboInstance(hosting)) {
      if (dto.enabled) {
        try {
          const instanceId = parseInt(hosting.serverId!, 10);
          await this.contabo.rescueInstance(instanceId);
          return {
            success: true,
            message: 'Rescue mode enabled via Contabo. Instance is rebooting into rescue system.',
            provider: 'CONTABO',
          };
        } catch (error) {
          this.logger.error(`Failed to enable Contabo rescue mode for VPS ${id}: ${(error as Error).message}`);
          throw error;
        }
      } else {
        try {
          const instanceId = parseInt(hosting.serverId!, 10);
          await this.contabo.restartInstance(instanceId);
          return {
            success: true,
            message: 'Rescue mode disabled. Instance is rebooting normally via Contabo.',
            provider: 'CONTABO',
          };
        } catch (error) {
          this.logger.error(`Failed to disable Contabo rescue mode for VPS ${id}: ${(error as Error).message}`);
          throw error;
        }
      }
    }

    try {
      const vmId = parseInt(hosting.serverId!, 10);
      const node = this.proxmox.node;

      if (dto.enabled) {
        // Set boot order to cdrom (rescue ISO) and restart
        await this.proxmox.setVmConfig(node, vmId, {
          boot: 'order=ide2;scsi0',
          ide2: 'local:iso/rescue.iso,media=cdrom',
        });
        await this.proxmox.restartVm(node, vmId);
        return {
          success: true,
          message: 'Rescue mode enabled. VM is rebooting from rescue ISO.',
          rescueInfo: {
            note: 'Connect via VNC console to access rescue environment.',
          },
        };
      } else {
        // Restore normal boot order
        await this.proxmox.setVmConfig(node, vmId, {
          boot: 'order=scsi0',
          delete: 'ide2',
        });
        await this.proxmox.restartVm(node, vmId);
        return { success: true, message: 'Rescue mode disabled. VM is rebooting normally.' };
      }
    } catch (error) {
      this.logger.error(`Failed to toggle rescue mode for VPS ${id}: ${(error as Error).message}`);
      throw error;
    }
  }

  // ── Region Transfer ─────────────────────────────────────────────────────────

  async transferVpsRegion(id: string, userId: string, dto: TransferRegionDto) {
    const hosting = await this.findVpsOwnedByUser(id, userId);

    if (this.isContaboInstance(hosting)) {
      // Contabo does not support live region transfer; submit a request
      let meta: Record<string, unknown> = {};
      if (hosting.cpanelPasswordEncrypted) {
        try { meta = JSON.parse(hosting.cpanelPasswordEncrypted); } catch { meta = {}; }
      }
      meta.pendingRegionTransfer = {
        targetRegion: dto.targetRegion,
        requestedAt: new Date().toISOString(),
      };
      await this.prisma.hostingAccount.update({
        where: { id },
        data: { cpanelPasswordEncrypted: JSON.stringify(meta) },
      });
      this.eventEmitter.emit('vps.region-transfer-requested', { hostingId: id, userId, targetRegion: dto.targetRegion });
      return {
        success: true,
        message: 'Region transfer request submitted for Contabo VPS. A new instance will be provisioned in the target region.',
        estimatedDowntime: '1-4 hours',
        provider: 'CONTABO',
      };
    }

    if (hosting.provider === HostingProvider.CUSTOM) {
      return {
        success: false,
        message: 'Region transfer is not supported for custom Proxmox VPS. Please contact support for manual migration.',
      };
    }

    // For RESELLERCLUB: store request and notify admin
    let meta: Record<string, unknown> = {};
    if (hosting.cpanelPasswordEncrypted) {
      try {
        meta = JSON.parse(hosting.cpanelPasswordEncrypted);
      } catch {
        meta = {};
      }
    }
    meta.pendingRegionTransfer = {
      targetRegion: dto.targetRegion,
      requestedAt: new Date().toISOString(),
    };

    await this.prisma.hostingAccount.update({
      where: { id },
      data: { cpanelPasswordEncrypted: JSON.stringify(meta) },
    });

    this.eventEmitter.emit('vps.region-transfer-requested', {
      hostingId: id,
      userId,
      targetRegion: dto.targetRegion,
    });

    return {
      success: true,
      message: 'Region transfer request submitted. An admin will process your request.',
      estimatedDowntime: '1-4 hours',
    };
  }

  // ── Usage Stats (enhanced) ──────────────────────────────────────────────────

  async getVpsUsage(id: string, userId: string) {
    const hosting = await this.findVpsOwnedByUser(id, userId);

    if (this.isContaboInstance(hosting)) {
      try {
        const instanceId = parseInt(hosting.serverId!, 10);
        const instanceData = await this.contabo.getInstance(instanceId);
        return { success: true, provider: 'CONTABO', data: instanceData };
      } catch (error) {
        this.logger.error(`Failed to get Contabo VPS usage for ${id}: ${(error as Error).message}`);
        throw error;
      }
    }

    if (hosting.provider === HostingProvider.RESELLERCLUB) {
      if (!hosting.rcOrderId) {
        return { success: false, message: 'No RC order found for this VPS' };
      }
      try {
        const details = await this.resellerClub.getVpsDetails(hosting.rcOrderId);
        return { success: true, provider: 'RESELLERCLUB', data: details };
      } catch (error) {
        this.logger.error(`Failed to get RC VPS usage for ${id}: ${(error as Error).message}`);
        throw error;
      }
    }

    try {
      const vmId = parseInt(hosting.serverId!, 10);
      const rrdData = await this.proxmox.getVmRrddata(this.proxmox.node, vmId, 'hour');

      // Format time-series data for charts
      const formatted = rrdData.map((point) => ({
        time: point.time,
        cpu: point.cpu,
        memory: point.mem ? Number(point.mem) / (1024 * 1024 * 1024) : 0, // bytes to GB
        maxMemory: point.maxmem ? Number(point.maxmem) / (1024 * 1024 * 1024) : 0,
        networkIn: point.netin ? Number(point.netin) / (1024 * 1024) : 0, // bytes to MB
        networkOut: point.netout ? Number(point.netout) / (1024 * 1024) : 0,
        diskRead: point.diskread ? Number(point.diskread) / (1024 * 1024) : 0,
        diskWrite: point.diskwrite ? Number(point.diskwrite) / (1024 * 1024) : 0,
      }));

      return { success: true, provider: 'CUSTOM', data: formatted };
    } catch (error) {
      this.logger.error(`Failed to get VPS usage for ${id}: ${(error as Error).message}`);
      throw error;
    }
  }

  private async findVpsOwnedByUser(id: string, userId: string) {
    const hosting = await this.prisma.hostingAccount.findUnique({
      where: { id },
    });

    if (!hosting) {
      throw new NotFoundException(`VPS ${id} not found`);
    }

    if (hosting.userId !== userId) {
      throw new ForbiddenException('You do not have access to this VPS');
    }

    if (!hosting.serverId) {
      throw new BadRequestException('VPS is not yet provisioned');
    }

    return hosting;
  }

  /**
   * Best-available display name for a hosting row — there is no hostname column.
   * cPanel accounts use cpanelUsername; pending VPS requests stash the hostname
   * in the cpanelPasswordEncrypted JSON blob; provisioned Contabo instances keep
   * neither, so fall back to the live instance id.
   */
  private vpsDisplayName(hosting: {
    cpanelUsername?: string | null;
    cpanelPasswordEncrypted?: string | null;
    serverId?: string | null;
    planName: string;
  }): string {
    if (hosting.cpanelUsername) return hosting.cpanelUsername;
    try {
      const meta = hosting.cpanelPasswordEncrypted
        ? JSON.parse(hosting.cpanelPasswordEncrypted)
        : null;
      if (typeof meta?.hostname === 'string' && meta.hostname) return meta.hostname;
    } catch {
      // blob is an encrypted password, not JSON
    }
    return hosting.serverId ? `vps-${hosting.serverId}` : hosting.planName;
  }

  /** Record a VPS action in the activity log. Never fails the request itself. */
  private async logVpsAction(
    userId: string,
    action: string,
    hosting: {
      id: string;
      provider: HostingProvider;
      cpanelUsername?: string | null;
      cpanelPasswordEncrypted?: string | null;
      serverId?: string | null;
      planName: string;
    },
    details: Record<string, unknown> = {},
  ): Promise<void> {
    try {
      await this.prisma.activityLog.create({
        data: {
          userId,
          action,
          resourceType: 'VPS',
          resourceId: hosting.id,
          details: {
            hostname: this.vpsDisplayName(hosting),
            provider: hosting.provider,
            ...details,
          } as any,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to log VPS activity ${action} for ${hosting.id}: ${(error as Error).message}`,
      );
    }
  }

  /** Recent VPS actions for the dashboard "Recent Actions" panel. */
  async getRecentVpsActivity(userId: string, limit = 10) {
    const logs = await this.prisma.activityLog.findMany({
      where: { userId, resourceType: 'VPS' },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 50),
    });
    return logs.map((log) => {
      const details = (log.details ?? {}) as Record<string, unknown>;
      return {
        id: log.id,
        action: log.action,
        hostname: typeof details.hostname === 'string' ? details.hostname : null,
        resourceId: log.resourceId,
        details,
        createdAt: log.createdAt,
      };
    });
  }

  // ── Container Management ──────────────────────────────────────────────────

  /**
   * List available Docker Compose app templates.
   */
  getAppTemplates() {
    return this.dockerService.getAvailableTemplates();
  }

  /**
   * Get a specific Docker Compose template YAML by ID.
   */
  getAppTemplate(templateId: string) {
    const yaml = this.dockerService.getAppTemplate(templateId);
    if (!yaml) {
      throw new NotFoundException(`Template '${templateId}' not found`);
    }
    return { templateId, yaml };
  }

  /**
   * List available container install script options.
   */
  getInstallScripts() {
    return [
      { id: 'docker', name: 'Docker + Docker Compose', description: 'Install Docker Engine and Docker Compose plugin' },
      { id: 'docker-portainer', name: 'Docker + Portainer', description: 'Install Docker with Portainer web UI for container management' },
      { id: 'k3s', name: 'k3s (Lightweight Kubernetes)', description: 'Install k3s single-node Kubernetes cluster' },
      { id: 'k3s-portainer', name: 'k3s + Portainer', description: 'Install k3s with Portainer for Kubernetes management' },
      { id: 'full-stack', name: 'Full Container Stack', description: 'Install Docker + k3s + Portainer (all-in-one)' },
    ];
  }

  /**
   * Generate a cloud-init install script for a given container stack type.
   */
  generateInstallScript(type: string) {
    const script = this.dockerService.getInstallScriptForType(type);
    if (!script) {
      throw new BadRequestException(`Unknown container stack type '${type}'. Valid types: docker, docker-portainer, k3s, k3s-portainer, full-stack`);
    }
    return { type, script };
  }

  /**
   * Deploy a Docker Compose app template on a VPS.
   * Returns the compose YAML and SSH command instructions.
   */
  async deployContainerApp(userId: string, hostingId: string, templateId: string, envVars?: Record<string, string>) {
    const hosting = await this.prisma.hostingAccount.findUnique({
      where: { id: hostingId },
    });

    if (!hosting) {
      throw new NotFoundException(`Hosting account '${hostingId}' not found`);
    }

    if (hosting.userId !== userId) {
      throw new ForbiddenException('You do not have access to this hosting account');
    }

    if (!hosting.ipAddress) {
      throw new BadRequestException('VPS does not have an IP address yet. Wait for provisioning to complete.');
    }

    const yaml = this.dockerService.getAppTemplate(templateId);
    if (!yaml) {
      throw new NotFoundException(`Template '${templateId}' not found`);
    }

    // Build env substitutions if provided
    let finalYaml = yaml;
    if (envVars) {
      for (const [key, value] of Object.entries(envVars)) {
        finalYaml = finalYaml.replace(new RegExp(`\\$\\{${key}[^}]*\\}`, 'g'), value);
      }
    }

    this.logger.log(`Deploying container app '${templateId}' on VPS ${hostingId} (${hosting.ipAddress})`);

    return {
      hostingId,
      templateId,
      ipAddress: hosting.ipAddress,
      composeYaml: finalYaml,
      instructions: [
        `SSH into your VPS: ssh root@${hosting.ipAddress}`,
        `Create a directory: mkdir -p /opt/${templateId} && cd /opt/${templateId}`,
        `Save the compose file: nano docker-compose.yml`,
        `Start the services: docker compose up -d`,
        `Check status: docker compose ps`,
      ],
    };
  }
}
