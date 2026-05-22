import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../lib/utils';

type Position = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: Position;
  delay?: number;
  className?: string;
}

const positionStyles: Record<Position, string> = {
  top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left:   'right-full top-1/2 -translate-y-1/2 mr-2',
  right:  'left-full top-1/2 -translate-y-1/2 ml-2',
};

const arrowStyles: Record<Position, string> = {
  top:    'top-full left-1/2 -translate-x-1/2 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-[var(--color-text-primary)]',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-[5px] border-r-[5px] border-b-[5px] border-l-transparent border-r-transparent border-b-[var(--color-text-primary)]',
  left:   'left-full top-1/2 -translate-y-1/2 border-t-[5px] border-b-[5px] border-l-[5px] border-t-transparent border-b-transparent border-l-[var(--color-text-primary)]',
  right:  'right-full top-1/2 -translate-y-1/2 border-t-[5px] border-b-[5px] border-r-[5px] border-t-transparent border-b-transparent border-r-[var(--color-text-primary)]',
};

export function Tooltip({ content, children, position = 'top', delay = 300, className }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  let timeout: ReturnType<typeof setTimeout>;

  const handleMouseEnter = () => {
    timeout = setTimeout(() => setIsVisible(true), delay);
  };

  const handleMouseLeave = () => {
    clearTimeout(timeout);
    setIsVisible(false);
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute z-50 pointer-events-none',
              positionStyles[position],
              className,
            )}
            role="tooltip"
          >
            <div
              className={cn(
                'px-2 py-1 rounded text-2xs whitespace-nowrap',
                'bg-[var(--color-text-primary)] text-[var(--color-text-inverse)]',
              )}
            >
              {content}
            </div>
            <div className={cn('absolute', arrowStyles[position])} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
