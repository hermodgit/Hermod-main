import { WalletButton } from '@/components/shared/wallet-button';
import { useClerk, useUser } from '@clerk/react';
import { useLocation } from 'wouter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, ChevronRight, Settings } from 'lucide-react';
import { Link } from 'wouter';
import { useIsMobile } from '@/hooks/use-mobile';

interface TopbarProps {
  title: string;
}

export function Topbar({ title }: TopbarProps) {
  const { signOut } = useClerk();
  const { user } = useUser();
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

  const initials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() ?? 'U';

  const crumb = title.toUpperCase();

  return (
    <header
      style={{
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobile ? '0 12px' : '0 20px',
        borderBottom: '1px solid hsl(0 0% 10%)',
        background: 'hsl(0 0% 3%)',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        gap: 8,
      }}
    >
      {/* ── Left: breadcrumb ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
        {isMobile && (
          <Link
            href="/dashboard"
            style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', flexShrink: 0 }}
          >
            <img
              src={`${import.meta.env.BASE_URL.replace(/\/$/, '')}/logo.png`}
              alt="Hermod"
              style={{ width: 18, height: 18, objectFit: 'contain' }}
            />
          </Link>
        )}
        {!isMobile && (
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
            <img
              src={`${import.meta.env.BASE_URL.replace(/\/$/, '')}/logo.png`}
              alt="Hermod"
              style={{ width: 18, height: 18, objectFit: 'contain', flexShrink: 0 }}
            />
            <span style={{
              fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600,
              color: '#FFFFFF', letterSpacing: '0.08em',
            }}>HERMOD</span>
          </Link>
        )}
        <ChevronRight size={10} style={{ color: 'hsl(0 0% 25%)', flexShrink: 0 }} />
        <span style={{
          fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600,
          color: 'hsl(0 0% 75%)', letterSpacing: '0.08em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {crumb}
        </span>
      </div>

      {/* ── Center: system status — desktop only ── */}
      {!isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {[
            { label: 'API', active: true },
            { label: 'CHAIN', active: true },
            { label: 'AI', active: true },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: s.active ? 'hsl(112 100% 54%)' : 'hsl(0 100% 63%)',
                flexShrink: 0,
              }} />
              <span style={{
                fontFamily: 'Inter, sans-serif', fontSize: 9, fontWeight: 500,
                letterSpacing: '0.1em', color: 'hsl(0 0% 35%)',
              }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Right: wallet + user ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <WalletButton size="compact" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              data-testid="button-user-menu"
              title={user?.emailAddresses?.[0]?.emailAddress}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 26, height: 26, borderRadius: 2,
                border: '1px solid hsl(0 0% 14%)',
                background: 'hsl(0 0% 5%)',
                color: 'hsl(112 100% 54%)',
                fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 700,
                cursor: 'pointer', transition: 'border-color 150ms',
              }}
            >
              {initials}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div style={{ padding: '8px 12px', borderBottom: '1px solid hsl(0 0% 10%)' }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'hsl(0 0% 80%)' }}>
                {user?.fullName || 'User'}
              </div>
              <div style={{
                fontSize: 10, color: 'hsl(0 0% 40%)',
                fontFamily: 'JetBrains Mono, monospace', marginTop: 2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user?.emailAddresses?.[0]?.emailAddress}
              </div>
            </div>
            <DropdownMenuSeparator />
            <Link href="/settings">
              <DropdownMenuItem>
                <Settings size={12} className="mr-2" />
                <span style={{ fontSize: 11 }}>Settings</span>
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ redirectUrl: basePath || '/' })}
              data-testid="button-sign-out"
              style={{ color: 'hsl(0 100% 63%)' }}
            >
              <LogOut size={12} className="mr-2" />
              <span style={{ fontSize: 11 }}>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
