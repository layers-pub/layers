'use client';

/**
 * Chooses between Dialog (md+) and bottom Sheet (<md) automatically.
 *
 * Consumers get a single uniform API: `<ResponsiveDialog open ...><Title/><Body/></ResponsiveDialog>`.
 * This replaces ad-hoc Dialog usage in form-heavy flows so every create/edit
 * surface becomes phone-friendly without per-call-site changes.
 */

import * as React from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isDesktop;
}

interface ResponsiveDialogProps {
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  /** The element that opens the dialog. Wrapped as a trigger via base-ui's render prop. */
  readonly trigger?: React.ReactElement;
  readonly title?: React.ReactNode;
  readonly description?: React.ReactNode;
  readonly children: React.ReactNode;
  readonly className?: string;
}

export function ResponsiveDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  className,
}: ResponsiveDialogProps): React.JSX.Element {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        {trigger ? <DialogTrigger render={trigger} /> : null}
        <DialogContent className={className}>
          {title || description ? (
            <DialogHeader>
              {title ? <DialogTitle>{title}</DialogTitle> : null}
              {description ? <DialogDescription>{description}</DialogDescription> : null}
            </DialogHeader>
          ) : null}
          {children}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger ? <SheetTrigger render={trigger} /> : null}
      <SheetContent side="bottom" className={className}>
        {title || description ? (
          <SheetHeader>
            {title ? <SheetTitle>{title}</SheetTitle> : null}
            {description ? <SheetDescription>{description}</SheetDescription> : null}
          </SheetHeader>
        ) : null}
        <div className="p-4 pb-6">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
