import { Link } from '@tanstack/react-router'
import { Logo, LogoIcon } from '@/components/logo'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

type TeamSwitcherProps = {
  teams: {
    name: string
    logo: React.ElementType
    plan: string
  }[]
}

export function TeamSwitcher({ teams }: TeamSwitcherProps) {
  const { state } = useSidebar()
  const activeTeam = teams[0]
  const isCollapsed = state === 'collapsed'

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size='lg'
          className='cursor-pointer hover:bg-muted/50 px-2 transition-colors'
          asChild
        >
          <Link to='/'>
            <div className='flex items-center gap-3'>
              <div className='shrink-0'>
                {isCollapsed ? (
                  <LogoIcon className='size-9' />
                ) : (
                  <Logo className='size-10' animate />
                )}
              </div>
              {!isCollapsed && (
                <div className='flex flex-col'>
                  <span className='font-bold text-base text-foreground leading-tight'>
                    OnPage<span className='text-orange-500'>SEO</span>
                  </span>
                  <span className='text-xs text-muted-foreground leading-tight'>
                    {activeTeam.plan}
                  </span>
                </div>
              )}
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
