// Type Imports
import type { VerticalMenuDataType } from '@/types/menuTypes'

const verticalMenuData = (): VerticalMenuDataType[] => [
  {
    label: 'Dashboard',
    icon: 'tabler-layout-dashboard',
    children: [
      {
        label: 'Overview',
        href: '/dashboard',
        icon: 'tabler-home'
      },
      {
        label: 'WordPress Analytics',
        href: '/dashboard/wordpress',
        icon: 'tabler-brand-wordpress'
      },
      {
        label: 'VPS Analytics',
        href: '/dashboard/vps',
        icon: 'tabler-server'
      },
      {
        label: 'VDS Analytics',
        href: '/dashboard/vds',
        icon: 'tabler-cpu'
      },
      {
        label: 'Dedicated Analytics',
        href: '/dashboard/dedicated',
        icon: 'tabler-server-bolt'
      }
    ]
  },
  {
    isSection: true,
    label: 'Services',
    children: [
      {
        label: 'Domains',
        icon: 'tabler-world',
        children: [
          {
            label: 'Dashboard',
            href: '/domains',
            icon: 'tabler-chart-pie'
          },
          {
            label: 'Search & Register',
            href: '/domains/search',
            icon: 'tabler-search'
          },
          {
            label: 'Portfolio',
            href: '/domains/portfolio',
            icon: 'tabler-briefcase'
          },
          {
            label: 'DNS Management',
            href: '/domains/dns',
            icon: 'tabler-dns'
          },
          {
            label: 'Transfers',
            href: '/domains/transfers',
            icon: 'tabler-transfer'
          },
          {
            label: 'Services',
            icon: 'tabler-apps',
            children: [
              {
                label: 'DNS Hosting',
                href: '/domains/services/dns-hosting',
                icon: 'tabler-server-2'
              },
              {
                label: 'Domain Broker',
                href: '/domains/services/broker',
                icon: 'tabler-users'
              },
              {
                label: 'Pre-registration',
                href: '/domains/services/pre-registration',
                icon: 'tabler-clock'
              },
              {
                label: 'Block',
                href: '/domains/services/block',
                icon: 'tabler-shield-lock'
              },
              {
                label: 'Negotiations',
                href: '/domains/services/negotiations',
                icon: 'tabler-message-2'
              }
            ]
          },
          {
            label: 'Investor Central',
            icon: 'tabler-trending-up',
            children: [
              {
                label: 'Auctions',
                href: '/domains/investor/auctions',
                icon: 'tabler-gavel'
              },
              {
                label: 'Afternic',
                href: '/domains/investor/afternic',
                icon: 'tabler-coin'
              },
              {
                label: 'Domain Parking',
                href: '/domains/investor/parking',
                icon: 'tabler-parking'
              },
              {
                label: 'Domain Academy',
                href: '/domains/investor/academy',
                icon: 'tabler-school'
              }
            ]
          },
          {
            label: 'Settings',
            icon: 'tabler-settings',
            children: [
              {
                label: 'Delegate Access',
                href: '/domains/settings/delegate-access',
                icon: 'tabler-user-plus'
              },
              {
                label: 'DNS Templates',
                href: '/domains/settings/dns-templates',
                icon: 'tabler-template'
              },
              {
                label: 'Exported Lists',
                href: '/domains/settings/exported-lists',
                icon: 'tabler-file-export'
              }
            ]
          },
          {
            label: 'Analytics',
            href: '/domains/analytics',
            icon: 'tabler-chart-bar'
          },
          {
            label: 'Activity Log',
            href: '/domains/activity-log',
            icon: 'tabler-history'
          }
        ]
      },
      {
        label: 'WordPress',
        icon: 'tabler-brand-wordpress',
        children: [
          {
            label: 'Plans & Pricing',
            href: '/hosting/plans',
            icon: 'tabler-credit-card'
          },
          {
            label: 'My Websites',
            href: '/hosting',
            icon: 'tabler-world'
          },
          {
            label: 'Add New Website',
            href: '/hosting/add',
            icon: 'tabler-plus'
          },
          {
            label: 'WordPress',
            icon: 'tabler-brand-wordpress',
            children: [
              {
                label: 'Install & Manage',
                href: '/hosting/wordpress',
                icon: 'tabler-settings'
              },
              {
                label: 'Staging Copies',
                href: '/hosting/wordpress/staging',
                icon: 'tabler-copy'
              },
              {
                label: 'Migrator',
                href: '/hosting/wordpress/migrator',
                icon: 'tabler-transfer'
              },
              {
                label: 'Autoupdate',
                href: '/hosting/wordpress/autoupdate',
                icon: 'tabler-refresh'
              },
              {
                label: 'Search & Replace',
                href: '/hosting/wordpress/search-replace',
                icon: 'tabler-replace'
              }
            ]
          },
          {
            label: 'Site Tools',
            icon: 'tabler-tool',
            children: [
              {
                label: 'File Manager',
                href: '/hosting/tools/file-manager',
                icon: 'tabler-folder'
              },
              {
                label: 'FTP Accounts',
                href: '/hosting/tools/ftp',
                icon: 'tabler-upload'
              },
              {
                label: 'MySQL Manager',
                href: '/hosting/tools/mysql',
                icon: 'tabler-database'
              },
              {
                label: 'Backups',
                href: '/hosting/tools/backups',
                icon: 'tabler-cloud-download'
              },
              {
                label: 'SSL Manager',
                href: '/hosting/tools/ssl',
                icon: 'tabler-lock'
              },
              {
                label: 'Cron Jobs',
                href: '/hosting/tools/cron',
                icon: 'tabler-clock'
              },
              {
                label: 'PHP Manager',
                href: '/hosting/tools/php',
                icon: 'tabler-brand-php'
              },
              {
                label: 'SSH Keys',
                href: '/hosting/tools/ssh',
                icon: 'tabler-key'
              }
            ]
          },
          {
            label: 'Security',
            icon: 'tabler-shield',
            children: [
              {
                label: 'HTTPS Enforce',
                href: '/hosting/security/https',
                icon: 'tabler-lock'
              },
              {
                label: 'Protected URLs',
                href: '/hosting/security/protected-urls',
                icon: 'tabler-shield-lock'
              },
              {
                label: 'Blocked Traffic',
                href: '/hosting/security/blocked-traffic',
                icon: 'tabler-ban'
              },
              {
                label: 'Site Scanner',
                href: '/hosting/security/scanner',
                icon: 'tabler-scan'
              }
            ]
          },
          {
            label: 'Speed',
            icon: 'tabler-rocket',
            children: [
              {
                label: 'SuperCacher',
                href: '/hosting/speed/cache',
                icon: 'tabler-bolt'
              },
              {
                label: 'CDN',
                href: '/hosting/speed/cdn',
                icon: 'tabler-world'
              }
            ]
          },
          {
            label: 'Email',
            icon: 'tabler-mail',
            children: [
              {
                label: 'Email Accounts',
                href: '/hosting/email/accounts',
                icon: 'tabler-inbox'
              },
              {
                label: 'Forwarders',
                href: '/hosting/email/forwarders',
                icon: 'tabler-arrow-forward'
              },
              {
                label: 'Autoresponders',
                href: '/hosting/email/autoresponders',
                icon: 'tabler-message-reply'
              },
              {
                label: 'Spam Protection',
                href: '/hosting/email/spam',
                icon: 'tabler-shield'
              }
            ]
          },
          {
            label: 'Domains',
            icon: 'tabler-world',
            children: [
              {
                label: 'Subdomains',
                href: '/hosting/domains/subdomains',
                icon: 'tabler-sitemap'
              },
              {
                label: 'Redirects',
                href: '/hosting/domains/redirects',
                icon: 'tabler-external-link'
              },
              {
                label: 'DNS Zone Editor',
                href: '/hosting/domains/dns',
                icon: 'tabler-dns'
              },
              {
                label: 'Parked Domains',
                href: '/hosting/domains/parked',
                icon: 'tabler-parking'
              }
            ]
          },
          {
            label: 'Statistics',
            href: '/hosting/statistics',
            icon: 'tabler-chart-bar'
          }
        ]
      },
      {
        label: 'VPS / Dedicated',
        icon: 'tabler-cpu',
        children: [
          {
            label: 'VPS Servers',
            icon: 'tabler-server-cog',
            children: [
              {
                label: 'My Servers',
                href: '/vps',
                icon: 'tabler-list'
              },
              {
                label: 'Order New VPS',
                href: '/vps/order',
                icon: 'tabler-shopping-cart'
              },
              {
                label: 'Upgrade VPS',
                href: '/vps/upgrade',
                icon: 'tabler-arrow-up-circle'
              },
              {
                label: 'Reinstall OS',
                href: '/vps/reinstall',
                icon: 'tabler-refresh'
              },
              {
                label: 'Snapshots',
                href: '/vps/snapshots',
                icon: 'tabler-camera'
              },
              {
                label: 'Rescue System',
                href: '/vps/rescue',
                icon: 'tabler-lifebuoy'
              },
              {
                label: 'VNC Console',
                href: '/vps/vnc',
                icon: 'tabler-device-desktop'
              },
              {
                label: 'Password Reset',
                href: '/vps/password-reset',
                icon: 'tabler-key'
              },
              {
                label: 'Storage',
                href: '/vps/storage',
                icon: 'tabler-database'
              },
              {
                label: 'Add-Ons',
                href: '/vps/addons',
                icon: 'tabler-puzzle'
              },
              {
                label: 'Region Transfer',
                href: '/vps/region-transfer',
                icon: 'tabler-map-pin'
              }
            ]
          },
          {
            label: 'VDS Servers',
            icon: 'tabler-cpu',
            children: [
              {
                label: 'My Servers',
                href: '/vps/vds',
                icon: 'tabler-list'
              },
              {
                label: 'Order VDS',
                href: '/vps/vds/order',
                icon: 'tabler-shopping-cart'
              },
              {
                label: 'Upgrade VDS',
                href: '/vps/vds/upgrade',
                icon: 'tabler-arrow-up-circle'
              },
              {
                label: 'Reinstall OS',
                href: '/vps/vds/reinstall',
                icon: 'tabler-refresh'
              },
              {
                label: 'Snapshots',
                href: '/vps/vds/snapshots',
                icon: 'tabler-camera'
              },
              {
                label: 'Rescue System',
                href: '/vps/vds/rescue',
                icon: 'tabler-lifebuoy'
              },
              {
                label: 'VNC Console',
                href: '/vps/vds/vnc',
                icon: 'tabler-device-desktop'
              },
              {
                label: 'Password Reset',
                href: '/vps/vds/password-reset',
                icon: 'tabler-key'
              },
              {
                label: 'Storage',
                href: '/vps/vds/storage',
                icon: 'tabler-database'
              },
              {
                label: 'Add-Ons',
                href: '/vps/vds/addons',
                icon: 'tabler-puzzle'
              },
              {
                label: 'Region Transfer',
                href: '/vps/vds/region-transfer',
                icon: 'tabler-map-pin'
              }
            ]
          },
          {
            label: 'Dedicated Servers',
            icon: 'tabler-server-bolt',
            children: [
              {
                label: 'My Servers',
                href: '/vps/dedicated',
                icon: 'tabler-list'
              },
              {
                label: 'Order Server',
                href: '/vps/dedicated/order',
                icon: 'tabler-shopping-cart'
              },
              {
                label: 'Upgrade Server',
                href: '/vps/dedicated/upgrade',
                icon: 'tabler-arrow-up-circle'
              },
              {
                label: 'Reinstall OS',
                href: '/vps/dedicated/reinstall',
                icon: 'tabler-refresh'
              },
              {
                label: 'Rescue System',
                href: '/vps/dedicated/rescue',
                icon: 'tabler-lifebuoy'
              },
              {
                label: 'IPMI / KVM',
                href: '/vps/dedicated/ipmi',
                icon: 'tabler-device-desktop'
              },
              {
                label: 'Password Reset',
                href: '/vps/dedicated/password-reset',
                icon: 'tabler-key'
              },
              {
                label: 'Storage',
                href: '/vps/dedicated/storage',
                icon: 'tabler-database'
              },
              {
                label: 'Add-Ons & Licenses',
                href: '/vps/dedicated/addons',
                icon: 'tabler-puzzle'
              },
              {
                label: 'Network',
                href: '/vps/dedicated/network',
                icon: 'tabler-network'
              }
            ]
          }
        ]
      },
      {
        label: 'Containers',
        icon: 'tabler-brand-docker',
        children: [
          {
            label: 'App Templates',
            href: '/containers/templates',
            icon: 'tabler-apps'
          },
          {
            label: 'Deploy App',
            href: '/containers/deploy',
            icon: 'tabler-rocket'
          },
          {
            label: 'My Containers',
            href: '/containers',
            icon: 'tabler-box'
          },
          {
            label: 'Docker',
            href: '/containers/docker',
            icon: 'tabler-brand-docker'
          },
          {
            label: 'Kubernetes',
            href: '/containers/kubernetes',
            icon: 'tabler-hexagons'
          },
          {
            label: 'Portainer',
            href: '/containers/portainer',
            icon: 'tabler-dashboard'
          }
        ]
      },
      {
        label: 'SSL Certificates',
        href: '/ssl',
        icon: 'tabler-lock'
      },
      {
        label: 'Email',
        icon: 'tabler-mail',
        children: [
          {
            label: 'Overview',
            href: '/email',
            icon: 'tabler-inbox'
          },
          {
            label: 'Titan Email',
            href: '/email/titan',
            icon: 'tabler-mail-star'
          },
          {
            label: 'Google Workspace',
            href: '/email/google-workspace',
            icon: 'tabler-brand-google'
          }
        ]
      }
    ]
  },
  {
    isSection: true,
    label: 'Content',
    children: [
      {
        label: 'Blog',
        icon: 'tabler-article',
        children: [
          {
            label: 'All Posts',
            href: '/blog',
            icon: 'tabler-list'
          },
          {
            label: 'Create Post',
            href: '/blog/create',
            icon: 'tabler-pencil-plus'
          },
          {
            label: 'Categories',
            href: '/blog/categories',
            icon: 'tabler-category'
          }
        ]
      }
    ]
  },
  {
    isSection: true,
    label: 'Account',
    children: [
      {
        label: 'Billing',
        icon: 'tabler-credit-card',
        children: [
          {
            label: 'Overview',
            href: '/billing',
            icon: 'tabler-report-money'
          },
          {
            label: 'Orders',
            href: '/billing/orders',
            icon: 'tabler-shopping-cart'
          },
          {
            label: 'Invoices',
            href: '/billing/invoices',
            icon: 'tabler-file-invoice'
          },
          {
            label: 'Wallet',
            href: '/billing/wallet',
            icon: 'tabler-wallet'
          }
        ]
      },
      {
        label: 'Support',
        href: '/support',
        icon: 'tabler-help-circle'
      },
      {
        label: 'Settings',
        href: '/settings',
        icon: 'tabler-settings'
      },
      {
        label: 'User Management',
        href: '/users',
        icon: 'tabler-users-group'
      }
    ]
  }
]

export default verticalMenuData
