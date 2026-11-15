import React from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Surface } from './Surface';

export interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  className = '',
}) => {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger>}

      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[400] transition-opacity animate-in fade-in" />
        <RadixDialog.Content asChild>
          <div className="fixed inset-0 z-[401] flex items-center justify-center p-4">
            <Surface
              elevation="e5"
              variant="raised"
              className={`w-full max-w-lg p-6 relative rounded-2xl border border-surface-border animate-in zoom-in-95 duration-200 ${className}`}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <RadixDialog.Title className="text-lg font-bold text-text-primary">
                    {title}
                  </RadixDialog.Title>
                  {description && (
                    <RadixDialog.Description className="text-xs text-text-secondary mt-1">
                      {description}
                    </RadixDialog.Description>
                  )}
                </div>
                <RadixDialog.Close asChild>
                  <button
                    aria-label="Close"
                    className="p-1 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-inset transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </RadixDialog.Close>
              </div>

              <div className="text-sm text-text-primary">{children}</div>
            </Surface>
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
};
