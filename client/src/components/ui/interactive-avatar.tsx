import { useState, useCallback, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/logo'

const seoTips = [
  "Title tags: 50-60 characters optimal",
  "Meta descriptions: 150-160 chars for best CTR",
  "Use only ONE H1 tag per page",
  "53% leave if load > 3 seconds",
  "Internal links help site structure",
  "Alt text helps SEO & accessibility",
  "HTTPS is a ranking factor",
  "Google uses mobile-first indexing",
  "Core Web Vitals impact rankings",
  "Broken links damage SEO",
  "Canonical tags prevent duplicates",
  "Schema markup aids understanding",
  "Fresh content signals active site",
  "Long-form content ranks higher",
  "Keep URLs short & descriptive",
  "Write naturally for humans first",
  "Use descriptive image file names",
  "Compress images for speed",
  "Link to authoritative sources",
  "Engagement matters for rankings",
  "Optimize for featured snippets",
  "Voice search is growing",
  "Optimize Google Business Profile",
  "Robots.txt controls crawling",
  "XML sitemaps aid discovery",
  "UX and SEO go hand in hand",
  "Dwell time indicates quality",
  "Avoid thin content pages",
  "E-E-A-T matters for rankings",
  "Use descriptive anchor text",
  "Breadcrumbs improve navigation",
  "Important pages within 3 clicks",
  "Responsive design is essential",
  "Ensure JS content is renderable",
  "Lazy loading improves speed",
  "Avoid excessive above-fold ads",
  "Structured data earns rich snippets",
  "Monitor Core Web Vitals",
  "404 pages should be helpful",
  "Avoid redirect chains",
  "Hreflang for multilingual sites",
  "Content clustering builds authority",
  "FAQ schema for PAA boxes",
  "Video increases time on page",
  "Audit & remove bad backlinks",
  "Page experience is ranking factor",
  "Optimize for zero-click searches",
  "Semantic HTML aids structure",
  "Mobile speed is critical",
  "Quality backlinks beat quantity",
]

interface InteractiveAvatarProps {
  className?: string
}

export function InteractiveAvatar({ className }: InteractiveAvatarProps) {
  const [clickCount, setClickCount] = useState(0)
  const [currentTipIndex, setCurrentTipIndex] = useState(() =>
    Math.floor(Math.random() * seoTips.length)
  )
  const [showTip, setShowTip] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [isWiggling, setIsWiggling] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleClick = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    const newClickCount = clickCount + 1
    setClickCount(newClickCount)

    const nextIndex = (currentTipIndex + 1) % seoTips.length
    setCurrentTipIndex(nextIndex)
    setShowTip(true)
    requestAnimationFrame(() => setIsVisible(true))

    if (newClickCount === 10) {
      setIsWiggling(true)
      setTimeout(() => setIsWiggling(false), 500)
    }

    timeoutRef.current = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => setShowTip(false), 200)
    }, 3500)
  }, [clickCount, currentTipIndex])

  const isEasterEgg = clickCount >= 10

  return (
    <div className={cn('relative inline-flex items-center', className)}>
      {/* Logo Button */}
      <button
        onClick={handleClick}
        className={cn(
          'relative rounded-full p-1 transition-all duration-200 hover:scale-105 focus:outline-none shrink-0',
          isEasterEgg && 'ring-1 ring-green-500/40 ring-offset-1 ring-offset-background',
          isWiggling && 'animate-wiggle'
        )}
        title='Click for SEO tips'
        aria-label='SEO tips'
      >
        <Logo className='h-14 w-14 sm:h-16 sm:w-16' animate />

        {clickCount > 0 && clickCount < 10 && (
          <span className='absolute -bottom-0.5 -right-0.5 w-4 h-4 flex items-center justify-center bg-muted text-muted-foreground text-[8px] rounded-full border border-border/50'>
            {clickCount}
          </span>
        )}
        {isEasterEgg && (
          <span className='absolute -bottom-0.5 -right-0.5 w-4 h-4 flex items-center justify-center bg-green-500/20 text-green-400 text-[8px] rounded-full'>
            ✓
          </span>
        )}
      </button>

      {/* Chat bubble - positioned to the right */}
      {showTip && (
        <div
          className={cn(
            'absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50',
            'transition-all duration-200 ease-out',
            isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
          )}
        >
          {/* Chat bubble with tail */}
          <div className='relative'>
            {/* Tail pointing left */}
            <div className='absolute -left-1.5 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[6px] border-r-muted' />

            {/* Bubble content */}
            <div className='bg-muted rounded-lg px-3 py-2 shadow-md min-w-[140px] max-w-[180px] sm:max-w-[220px]'>
              <p className='text-[11px] sm:text-xs text-foreground/80 leading-snug'>
                {seoTips[currentTipIndex]}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
