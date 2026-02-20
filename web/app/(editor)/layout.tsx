import AppSidebar from '@/components/layout/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  title: '10xStudent - Editor',
  description: 'Document editor',
};

export default async function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true';

  return (
    <>
      {/* Preload the Typst compiler WASM so the browser fetches it in parallel with JS */}
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <link
        rel="preload"
        href="/wasm/typst_ts_web_compiler_bg.wasm"
        as="fetch"
        crossOrigin="anonymous"
      />
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />
        <SidebarInset>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
