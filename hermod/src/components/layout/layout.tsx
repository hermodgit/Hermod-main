import { ReactNode } from 'react';
import { Show } from '@clerk/react';
import { Redirect } from 'wouter';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { MobileNav } from './mobile-nav';
import { SidebarProvider, useSidebar } from '@/lib/sidebar-context';
import { useIsMobile } from '@/hooks/use-mobile';

interface LayoutProps {
  children: ReactNode;
  title: string;
}

function LayoutInner({ children, title }: LayoutProps) {
  const { collapsed } = useSidebar();
  const isMobile = useIsMobile();
  const sidebarWidth = collapsed ? 48 : 240;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar — desktop only */}
      {!isMobile && <Sidebar />}

      <div
        className="main-transition flex-1 flex flex-col min-w-0"
        style={{ marginLeft: isMobile ? 0 : sidebarWidth }}
      >
        <Topbar title={title} />
        <main
          className="flex-1 overflow-auto"
          style={{
            padding: isMobile ? '16px 16px' : '20px',
            paddingBottom: isMobile ? 80 : 20,
          }}
        >
          {children}
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      {isMobile && <MobileNav />}
    </div>
  );
}

export function Layout({ children, title }: LayoutProps) {
  return (
    <>
      <Show when="signed-in">
        <SidebarProvider>
          <LayoutInner title={title}>{children}</LayoutInner>
        </SidebarProvider>
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}
