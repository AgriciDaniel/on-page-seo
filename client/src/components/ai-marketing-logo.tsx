interface AIMarketingLogoProps {
  className?: string
  animate?: boolean
}

export function AIMarketingLogo({ className, animate = true }: AIMarketingLogoProps) {
  return (
    <svg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg' className={className}>
      <defs>
        <linearGradient id='linearGradient-red' x1='0%' y1='0%' x2='0%' y2='100%'>
          <stop offset='0%' stopColor='#FF5252' />
          <stop offset='100%' stopColor='#C62828' />
        </linearGradient>
        <linearGradient id='linearGradient-yellow' x1='0%' y1='0%' x2='0%' y2='100%'>
          <stop offset='0%' stopColor='#FFD54F' />
          <stop offset='100%' stopColor='#FFB300' />
        </linearGradient>
        <linearGradient id='linearGradient-green' x1='0%' y1='0%' x2='0%' y2='100%'>
          <stop offset='0%' stopColor='#AED581' />
          <stop offset='100%' stopColor='#689F38' />
        </linearGradient>
      </defs>

      {animate && (
        <style>{`
          @keyframes pulseBarRed {
            0%, 100% { transform: scaleY(1); }
            50% { transform: scaleY(1.05); }
          }
          @keyframes pulseBarYellow {
            0%, 100% { transform: scaleY(1); }
            50% { transform: scaleY(1.05); }
          }
          @keyframes pulseBarGreen {
            0%, 100% { transform: scaleY(1); }
            50% { transform: scaleY(1.05); }
          }
          .bar-red {
            transform-origin: 50% 100%;
            animation: pulseBarRed 2s ease-in-out infinite alternate;
          }
          .bar-yellow {
            transform-origin: 50% 100%;
            animation: pulseBarYellow 2.2s ease-in-out infinite alternate 0.5s;
          }
          .bar-green {
            transform-origin: 50% 100%;
            animation: pulseBarGreen 2.4s ease-in-out infinite alternate 1s;
          }
        `}</style>
      )}

      <g id='signal-bars-group'>
        <g className={animate ? 'bar-red' : ''}>
          <path
            d='M 65, 150 h 20 a 15,15 0 0 1 15,15 v 70 a 15,15 0 0 1 -15,15 h -20 a 15,15 0 0 1 -15,-15 v -70 a 15,15 0 0 1 15,-15 z'
            fill='url(#linearGradient-red)'
          />
        </g>
        <g className={animate ? 'bar-yellow' : ''}>
          <path
            d='M 135, 110 h 20 a 15,15 0 0 1 15,15 v 110 a 15,15 0 0 1 -15,15 h -20 a 15,15 0 0 1 -15,-15 v -110 a 15,15 0 0 1 15,-15 z'
            fill='url(#linearGradient-yellow)'
          />
        </g>
        <g className={animate ? 'bar-green' : ''}>
          <path
            d='M 205, 70 h 20 a 15,15 0 0 1 15,15 v 150 a 15,15 0 0 1 -15,15 h -20 a 15,15 0 0 1 -15,-15 v -150 a 15,15 0 0 1 15,-15 z'
            fill='url(#linearGradient-green)'
          />
        </g>
      </g>
    </svg>
  )
}
