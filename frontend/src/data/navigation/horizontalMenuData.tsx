// Type Imports
import type { HorizontalMenuDataType } from '@/types/menuTypes'

const horizontalMenuData = (): HorizontalMenuDataType[] => [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'tabler-layout-dashboard'
  },
  {
    label: 'Domains',
    href: '/domains',
    icon: 'tabler-world'
  },
  {
    label: 'Hosting',
    href: '/hosting',
    icon: 'tabler-server'
  },
  {
    label: 'Billing',
    href: '/billing',
    icon: 'tabler-credit-card'
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
  }
]

export default horizontalMenuData
