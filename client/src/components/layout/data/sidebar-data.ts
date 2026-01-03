import {
  Search,
  LayoutDashboard,
  Palette,
  Key,
  Triangle,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  teams: [
    {
      name: 'OnPageSEO',
      logo: Triangle,
      plan: 'SEO Analysis Tool',
    },
  ],
  navGroups: [
    {
      title: 'SEO Tools',
      items: [
        {
          title: 'New Audit',
          url: '/',
          icon: Search,
        },
        {
          title: 'Dashboard',
          url: '/audits',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: 'Settings',
      items: [
        {
          title: 'API Keys',
          url: '/settings/api-keys',
          icon: Key,
        },
        {
          title: 'Appearance',
          url: '/settings/appearance',
          icon: Palette,
        },
      ],
    },
  ],
}
