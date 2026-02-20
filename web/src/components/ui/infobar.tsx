'use client';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { CircleXIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';
import * as React from 'react';

const INFOBAR_WIDTH = '22rem';
const INFOBAR_WIDTH_MOBILE = '22rem';
const INFOBAR_WIDTH_ICON = '3rem';
const INFOBAR_KEYBOARD_SHORTCUT = 'i';

export type HelpfulLink = {
  title: string;
  url: string;
};

export type DescriptiveSection = {
  title: string;
  description: string;
  links?: HelpfulLink[];
};

export interface InfobarContentData {
  title: string;
  sections: DescriptiveSection[];
}

interface InfobarContextProps {
  state: 'expanded' | 'collapsed';
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleInfobar: () => void;
  content: InfobarContentData | null;
  setContent: (content: InfobarContentData | null) => void;
  isPathnameChanging: boolean;
}

const InfobarContext = React.createContext<InfobarContextProps | null>(null);

function useInfobar(): InfobarContextProps {
  const context = React.useContext(InfobarContext);
  if (!context) {
    throw new Error('useInfobar must be used within a InfobarProvider.');
  }
  return context;
}

function InfobarProvider({
  defaultOpen = false,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}): React.ReactElement {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React.useState(false);
  const [content, setContent] = React.useState<InfobarContentData | null>(null);
  const [contentPathname, setContentPathname] = React.useState<string | null>(null);
  const [isPathnameChanging, setIsPathnameChanging] = React.useState(false);
  const pathname = usePathname();

  const [_open, _setOpen] = React.useState(defaultOpen);
  const open = openProp ?? _open;
  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === 'function' ? value(open) : value;

      if (isMobile) {
        setOpenMobile(openState);
      }

      if (setOpenProp) {
        setOpenProp(openState);
      } else {
        _setOpen(openState);
      }
    },
    [setOpenProp, open, isMobile]
  );

  const toggleInfobar = React.useCallback(() => {
    return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open);
  }, [isMobile, setOpen]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (
        event.key === INFOBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        toggleInfobar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleInfobar]);

  React.useEffect(() => {
    if (contentPathname !== null && contentPathname !== pathname) {
      setIsPathnameChanging(true);
      setContent(null);
      setContentPathname(null);
      setOpen(false);

      setTimeout(() => {
        setIsPathnameChanging(false);
      }, 200);
    }
  }, [pathname, contentPathname, setOpen]);

  const handleSetContent = React.useCallback(
    (newContent: InfobarContentData | null) => {
      setContent(newContent);
      setContentPathname(newContent ? pathname : null);
    },
    [pathname]
  );

  const state = open ? 'expanded' : 'collapsed';

  const contextValue = React.useMemo<InfobarContextProps>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleInfobar,
      content,
      setContent: handleSetContent,
      isPathnameChanging,
    }),
    [
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleInfobar,
      content,
      handleSetContent,
      isPathnameChanging,
    ]
  );

  return (
    <InfobarContext.Provider value={contextValue}>
      <TooltipProvider delayDuration={0}>
        <div
          data-slot="infobar-wrapper"
          style={
            {
              '--infobar-width': INFOBAR_WIDTH,
              '--infobar-width-icon': INFOBAR_WIDTH_ICON,
              ...style,
            } as React.CSSProperties
          }
          className={cn(
            'group/infobar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full',
            className
          )}
          {...props}
        >
          {children}
        </div>
      </TooltipProvider>
    </InfobarContext.Provider>
  );
}

function Infobar({
  side = 'right',
  variant = 'sidebar',
  collapsible = 'offcanvas',
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  side?: 'left' | 'right';
  variant?: 'sidebar' | 'floating' | 'inset';
  collapsible?: 'offcanvas' | 'icon' | 'none';
}): React.ReactElement {
  const { isMobile, state, openMobile, setOpenMobile, isPathnameChanging } =
    useInfobar();

  if (collapsible === 'none') {
    return (
      <div
        data-slot="infobar"
        className={cn(
          'bg-sidebar text-sidebar-foreground flex h-full w-(--infobar-width) flex-col',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
        <SheetContent
          data-infobar="infobar"
          data-slot="infobar"
          data-mobile="true"
          className="bg-sidebar text-sidebar-foreground w-(--infobar-width) p-0 [&>button]:hidden"
          style={
            {
              '--infobar-width': INFOBAR_WIDTH_MOBILE,
            } as React.CSSProperties
          }
          side={side}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Info Panel</SheetTitle>
            <SheetDescription>Displays contextual information.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      className="group peer text-sidebar-foreground hidden md:block"
      data-state={state}
      data-collapsible={state === 'collapsed' ? collapsible : ''}
      data-variant={variant}
      data-side={side}
      data-slot="infobar"
      style={
        {
          '--infobar-transition-duration': isPathnameChanging ? '0ms' : '200ms',
        } as React.CSSProperties
      }
    >
      <div
        data-slot="infobar-gap"
        className={cn(
          'relative w-(--infobar-width) bg-transparent transition-[width] duration-(--infobar-transition-duration,200ms) ease-linear',
          'group-data-[collapsible=offcanvas]:w-0',
          'group-data-[side=right]:rotate-180',
          variant === 'floating' || variant === 'inset'
            ? 'group-data-[collapsible=icon]:w-[calc(var(--infobar-width-icon)+(--spacing(4)))]'
            : 'group-data-[collapsible=icon]:w-(--infobar-width-icon)'
        )}
      />
      <div
        data-slot="infobar-container"
        className={cn(
          'absolute inset-y-0 z-10 hidden h-svh w-(--infobar-width) transition-[left,right,width] duration-(--infobar-transition-duration,200ms) ease-linear md:flex',
          side === 'left'
            ? 'left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--infobar-width)*-1)]'
            : 'right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--infobar-width)*-1)]',
          variant === 'floating' || variant === 'inset'
            ? 'p-2 group-data-[collapsible=icon]:w-[calc(var(--infobar-width-icon)+(--spacing(4))+2px)]'
            : 'group-data-[collapsible=icon]:w-(--infobar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l',
          className
        )}
        {...props}
      >
        <div
          data-infobar="infobar"
          data-slot="infobar-inner"
          className="bg-sidebar group-data-[variant=floating]:border-sidebar-border flex h-full w-full flex-col group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:shadow-sm"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function InfobarTrigger({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>): React.ReactElement {
  const { toggleInfobar } = useInfobar();

  return (
    <Button
      data-infobar="trigger"
      data-slot="infobar-trigger"
      variant="ghost"
      size="icon"
      className={cn('size-7', className)}
      aria-label="Toggle info panel"
      onClick={(event) => {
        onClick?.(event);
        toggleInfobar();
      }}
      {...props}
    >
      <CircleXIcon className="size-7" />
      <span className="sr-only">Toggle Info Panel</span>
    </Button>
  );
}

function InfobarRail({
  className,
  ...props
}: React.ComponentProps<'button'>): React.ReactElement {
  const { toggleInfobar } = useInfobar();

  return (
    <button
      data-infobar="rail"
      data-slot="infobar-rail"
      aria-label="Toggle Info Panel"
      tabIndex={-1}
      onClick={toggleInfobar}
      title="Toggle Info Panel"
      className={cn(
        'hover:after:bg-sidebar-border absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] sm:flex',
        'in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize',
        '[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize',
        'hover:group-data-[collapsible=offcanvas]:bg-sidebar group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full',
        '[[data-side=left][data-collapsible=offcanvas]_&]:-right-2',
        '[[data-side=right][data-collapsible=offcanvas]_&]:-left-2',
        className
      )}
      {...props}
    />
  );
}

function InfobarHeader({
  className,
  ...props
}: React.ComponentProps<'div'>): React.ReactElement {
  return (
    <div
      data-slot="infobar-header"
      data-infobar="header"
      className={cn('flex flex-col gap-2 p-2', className)}
      {...props}
    />
  );
}

function InfobarContent({
  className,
  ...props
}: React.ComponentProps<'div'>): React.ReactElement {
  return (
    <div
      data-slot="infobar-content"
      data-infobar="content"
      className={cn(
        'flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden',
        className
      )}
      {...props}
    />
  );
}

function InfobarGroup({
  className,
  ...props
}: React.ComponentProps<'div'>): React.ReactElement {
  return (
    <div
      data-slot="infobar-group"
      data-infobar="group"
      className={cn('relative flex w-full min-w-0 flex-col p-2', className)}
      {...props}
    />
  );
}

function InfobarGroupContent({
  className,
  ...props
}: React.ComponentProps<'div'>): React.ReactElement {
  return (
    <div
      data-slot="infobar-group-content"
      data-infobar="group-content"
      className={cn('w-full text-sm', className)}
      {...props}
    />
  );
}

export {
  Infobar,
  InfobarContent,
  InfobarGroup,
  InfobarGroupContent,
  InfobarHeader,
  InfobarProvider,
  InfobarRail,
  InfobarTrigger,
  useInfobar,
};
