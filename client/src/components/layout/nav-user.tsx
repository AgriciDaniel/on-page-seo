import { AIMarketingLogo } from '@/components/ai-marketing-logo'
import {
  SidebarMenu,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

const AI_MARKETING_HUB_URL = 'https://www.skool.com/ai-marketing-hub-pro'

export function NavUser() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <a
          href={AI_MARKETING_HUB_URL}
          target='_blank'
          rel='noopener noreferrer'
          className='flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-sidebar-accent'
          title='AI Marketing Hub Pro'
        >
          <div className='shrink-0'>
            <AIMarketingLogo className='h-10 w-10' animate />
          </div>
          <div className='flex flex-col overflow-hidden'>
            <span className='truncate text-sm font-semibold text-sidebar-foreground'>
              AI Marketing Hub
            </span>
            <span className='truncate text-xs text-muted-foreground'>
              Join our community
            </span>
          </div>
        </a>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
