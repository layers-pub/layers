'use client';

/**
 * Bottom-sheet drawer for mobile + dialog fallback for desktop.
 *
 * @remarks
 * Composes the {@link https://github.com/emilkowalski/vaul Vaul}
 * primitive on viewports below `md` and falls back to the existing
 * Radix `Dialog` on `md+`. The API surface mirrors Radix
 * `Dialog`/`AlertDialog` (Root/Trigger/Content/Header/Title/etc.) so
 * existing call sites can swap `Dialog` for `MobileDrawer` without
 * touching their JSX shape.
 *
 * @packageDocumentation
 */

import { Drawer as Vaul } from 'vaul';
import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  forwardRef,
  useEffect,
  useState,
} from 'react';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * Track viewport width to decide drawer-vs-dialog at runtime. Switches
 * at the Tailwind `md` breakpoint (768px).
 */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isMobile;
}

/** Props common to the desktop dialog + mobile drawer roots. */
interface MobileDrawerRootProps {
  readonly children: ReactNode;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly modal?: boolean;
  readonly dismissible?: boolean;
}

/**
 * Root of a `<MobileDrawer>`. Behaves like `Dialog.Root` on desktop
 * and `Vaul.Root` on mobile.
 */
function MobileDrawer({ children, ...props }: MobileDrawerRootProps): ReactNode {
  const isMobile = useIsMobile();
  if (isMobile) {
    return <Vaul.Root {...props}>{children}</Vaul.Root>;
  }
  return (
    <Dialog open={props.open} defaultOpen={props.defaultOpen} onOpenChange={props.onOpenChange}>
      {children}
    </Dialog>
  );
}

/**
 * Trigger button. Forwards to either `Dialog.Trigger` or
 * `Vaul.Trigger` depending on viewport.
 */
const MobileDrawerTrigger = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof Vaul.Trigger>
>(function MobileDrawerTriggerImpl(props, ref) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return <Vaul.Trigger ref={ref} {...props} />;
  }
  return <DialogTrigger ref={ref} {...props} />;
});

interface MobileDrawerContentProps
  extends ComponentPropsWithoutRef<typeof Vaul.Content> {
  readonly children: ReactNode;
  /**
   * When false, omit the desktop dialog fallback container so callers
   * that render a fully bespoke desktop layout don't get extra chrome.
   */
  readonly desktopAsDialog?: boolean;
}

/**
 * Content surface. Renders a slide-up Vaul panel on mobile and a
 * centered Radix Dialog on desktop.
 */
function MobileDrawerContent({
  className,
  children,
  desktopAsDialog = true,
  ...props
}: MobileDrawerContentProps): ReactNode {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <Vaul.Portal>
        <Vaul.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Vaul.Content
          {...props}
          className={cn(
            'fixed bottom-0 left-0 right-0 z-50 flex max-h-[92dvh] flex-col rounded-t-[24px] bg-background outline-none',
            'shadow-[0_-12px_40px_-8px_rgba(0,0,0,0.25)]',
            'pb-[env(safe-area-inset-bottom)]',
            className,
          )}
        >
          <div
            aria-hidden
            className="mx-auto mb-2 mt-2 h-1.5 w-12 rounded-full bg-muted-foreground/30"
          />
          {children}
        </Vaul.Content>
      </Vaul.Portal>
    );
  }
  if (!desktopAsDialog) return <>{children}</>;
  return <DialogContent className={className}>{children}</DialogContent>;
}

const MobileDrawerHeader = DialogHeader;
const MobileDrawerFooter = DialogFooter;
const MobileDrawerTitle = DialogTitle;
const MobileDrawerDescription = DialogDescription;
const MobileDrawerClose = DialogClose;

export {
  MobileDrawer,
  MobileDrawerTrigger,
  MobileDrawerContent,
  MobileDrawerHeader,
  MobileDrawerFooter,
  MobileDrawerTitle,
  MobileDrawerDescription,
  MobileDrawerClose,
};
