'use client';

import {
  Infobar,
  InfobarContent,
  InfobarHeader,
} from '@/components/ui/infobar';

interface InfoSidebarProps {
  side?: 'left' | 'right';
}

export function InfoSidebar({ side = 'right' }: InfoSidebarProps) {
  return (
    <Infobar side={side}>
      <InfobarHeader>
        <h3 className="font-semibold">Information Panel</h3>
        <p className="text-sm text-muted-foreground">
          Context and details about your current view.
        </p>
      </InfobarHeader>
      <InfobarContent>
        <div className="space-y-4 p-2">
          <p className="text-sm text-muted-foreground">
            Select an item to see more details here.
          </p>
        </div>
      </InfobarContent>
    </Infobar>
  );
}
