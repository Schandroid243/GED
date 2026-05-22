import { Fragment, type ReactNode } from 'react';
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';

type Size = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: Size;
  className?: string;
}

const sizeStyles: Record<Size, string> = {
  sm:   'max-w-sm',
  md:   'max-w-md',
  lg:   'max-w-lg',
  xl:   'max-w-xl',
  full: 'max-w-4xl',
};

export function Modal({ open, onClose, title, children, size = 'md', className }: ModalProps) {
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

        {/* Panel */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95 translate-y-4"
            enterTo="opacity-100 scale-100 translate-y-0"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100 translate-y-0"
            leaveTo="opacity-0 scale-95 translate-y-4"
          >
            <DialogPanel
              className={cn(
                'w-full rounded-2xl shadow-modal',
                'bg-[var(--color-bg-surface)] border border-[var(--color-border)]',
                sizeStyles[size],
                className,
              )}
            >
              {/* Header */}
              {title && (
                <div className="flex items-center justify-between px-6 pt-6 pb-0">
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
              <div className="px-6 py-6">{children}</div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
