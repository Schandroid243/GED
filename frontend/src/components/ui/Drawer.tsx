import { Fragment, type ReactNode } from 'react';
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const widthStyles: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export function Drawer({ open, onClose, title, children, width = 'md', className }: DrawerProps) {
  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Overlay */}
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </TransitionChild>

        {/* Panel – slide from right */}
        <div className="fixed inset-0 flex justify-end">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-250"
            enterFrom="opacity-0 translate-x-full"
            enterTo="opacity-100 translate-x-0"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-x-0"
            leaveTo="opacity-0 translate-x-full"
          >
            <DialogPanel
              className={cn(
                'w-full h-full flex flex-col',
                'bg-[var(--color-bg-surface)] border-l border-[var(--color-border)]',
                'shadow-[-8px_0_24px_rgba(0,0,0,0.08)]',
                widthStyles[width],
                className,
              )}
            >
              {/* Header */}
              {title && (
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
                  <DialogTitle className="text-lg font-display text-[var(--color-text-primary)]">
                    {title}
                  </DialogTitle>
                  <button
                    onClick={onClose}
                    className="btn-ghost p-1 rounded-full"
                    aria-label="Fermer"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              )}

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
