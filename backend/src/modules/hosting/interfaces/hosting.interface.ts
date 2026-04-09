export interface HostingPlan {
  id: string;
  name: string;
  type: string;
  specs: {
    diskGB: number;
    bandwidthGB: number;
    emailAccounts: number;
    subdomains: number;
    databases: number;
    cpuCores?: number;
    ramGB?: number;
  };
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  features: string[];
  popular?: boolean;
  rcPlanId?: string;
  rcProductKey?: string;
}

export interface VpsOsTemplate {
  id: string;
  name: string;
  version: string;
  arch: string;
  proxmoxTemplateId: number;
}

export interface ProvisioningJob {
  hostingId: string;
  userId: string;
  domain: string;
  planType: string;
  planId: string;
  adminEmail?: string;
  adminUsername?: string;
  adminPassword?: string;
  siteTitle?: string;
}

export interface VpsProvisioningJob {
  hostingId: string;
  userId: string;
  hostname: string;
  planId: string;
  osTemplate: string;
  sshKey?: string;
  rootPassword?: string;
  node: string;
}
