'use client';

import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Button } from '@/components/ui/button';
import { useInfobar } from '@/components/ui/infobar';
import { Separator } from '@/components/ui/separator';
import {
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { PanelRight } from 'lucide-react';

export default function Header() {
  const { toggleInfobar } = useInfobar();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={toggleInfobar}
        >
          <PanelRight className="h-4 w-4" />
          <span className="sr-only">Toggle Info Panel</span>
        </Button>
      </div>
    </header>
  );
}
