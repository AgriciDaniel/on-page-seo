import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  animate?: boolean
}

export function Logo({ className, animate = false }: LogoProps) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 512 512'
      preserveAspectRatio='xMidYMid meet'
      className={cn('shrink-0', className)}
    >
      {animate && (
        <defs>
          <style>
            {`
              @keyframes blink {
                0%, 90%, 100% { transform: scaleY(1); }
                93%, 97% { transform: scaleY(0.1); }
              }

              @keyframes bounce {
                0%, 100% { transform: translateY(0) rotate(0deg); }
                25% { transform: translateY(-8px) rotate(-1.5deg); }
                50% { transform: translateY(0) rotate(0deg); }
                75% { transform: translateY(-5px) rotate(1.5deg); }
              }

              @keyframes eyebrowRaise {
                0%, 85%, 100% { transform: translateY(0); }
                88%, 92% { transform: translateY(-4px); }
              }

              @keyframes subtleGlow {
                0%, 100% { filter: drop-shadow(0 0 0px rgba(251, 191, 36, 0)); }
                50% { filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.4)); }
              }

              .logo-eye {
                animation: blink 4.5s infinite;
              }

              .logo-character {
                animation: bounce 2.8s ease-in-out infinite, subtleGlow 3.5s ease-in-out infinite;
                transform-origin: center;
              }

              .logo-eyebrow {
                transform-origin: center;
                animation: eyebrowRaise 6.5s infinite;
              }
            `}
          </style>
        </defs>
      )}

      <g className={animate ? 'logo-character' : ''}>
        {/* Main Head Triangle */}
        <path
          d='M 256 100 L 390 390 L 122 390 Z'
          fill='#FBBF24'
          stroke='#3D3D3D'
          strokeWidth='8'
          strokeLinejoin='round'
          strokeLinecap='round'
        />

        {/* Glasses */}
        <g fill='none' stroke='#3D3D3D' strokeWidth='8' strokeLinecap='round'>
          <circle cx='206' cy='240' r='45' />
          <circle cx='306' cy='240' r='45' />
          <line x1='251' y1='240' x2='261' y2='240' />
          <path d='M 161 240 L 130 225' />
          <path d='M 351 240 L 382 225' />
        </g>

        {/* Eyebrows */}
        <g
          className={animate ? 'logo-eyebrow' : ''}
          fill='none'
          stroke='#3D3D3D'
          strokeWidth='6'
          strokeLinecap='round'
        >
          <path d='M 172 185 Q 206 178 235 183' />
          <path d='M 277 183 Q 306 178 340 185' />
        </g>

        {/* Eyes */}
        <g fill='#3D3D3D'>
          <ellipse
            className={animate ? 'logo-eye' : ''}
            cx='206'
            cy='240'
            rx='11'
            ry='11'
            style={{ transformOrigin: '206px 240px' }}
          />
          <ellipse
            className={animate ? 'logo-eye' : ''}
            cx='306'
            cy='240'
            rx='11'
            ry='11'
            style={{ transformOrigin: '306px 240px' }}
          />
        </g>
      </g>
    </svg>
  )
}

// Small version for sidebar collapsed state and icons
export function LogoIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 512 512'
      preserveAspectRatio='xMidYMid meet'
      className={cn('shrink-0', className)}
    >
      {/* Main Head Triangle */}
      <path
        d='M 256 100 L 390 390 L 122 390 Z'
        fill='#FBBF24'
        stroke='#3D3D3D'
        strokeWidth='8'
        strokeLinejoin='round'
        strokeLinecap='round'
      />

      {/* Glasses */}
      <g fill='none' stroke='#3D3D3D' strokeWidth='8' strokeLinecap='round'>
        <circle cx='206' cy='240' r='45' />
        <circle cx='306' cy='240' r='45' />
        <line x1='251' y1='240' x2='261' y2='240' />
        <path d='M 161 240 L 130 225' />
        <path d='M 351 240 L 382 225' />
      </g>

      {/* Eyes */}
      <g fill='#3D3D3D'>
        <ellipse cx='206' cy='240' rx='11' ry='11' />
        <ellipse cx='306' cy='240' rx='11' ry='11' />
      </g>
    </svg>
  )
}
