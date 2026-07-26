import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard, Send, ArrowDownUp, Bot, Menu, X,
  Wallet, PieChart, Shield, Key, Cpu, Repeat, ScrollText,
  Code2, Settings, Layers,
} from 'lucide-react';
import { useUser } from '@clerk/react';

const G = 'hsl(112 100% 54%)';

const TAB_ITEMS = [
  { href: '/dashboard', label: 'Home',     icon: LayoutDashboard },
  { href: '/transfer',  label: 'Transfer', icon: Send },
  { href: '/swap',      label: 'Swap',     icon: ArrowDownUp },
  { href: '/ai-agent',  label: 'AI',       icon: Bot },
];

const DRAWER_GROUPS = [
  {
    label: 'MAIN',
    items: [
      { href: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
      { href: '/wallets',      label: 'Wallets',      icon: Wallet },
      { href: '/portfolio',    label: 'Portfolio',    icon: PieChart },
    ],
  },
  {
    label: 'FINANCE',
    items: [
      { href: '/transfer',     label: 'Transfer',     icon: Send },
      { href: '/swap',         label: 'Swap',         icon: ArrowDownUp },
      { href: '/defi',         label: 'DeFi',         icon: Layers },
      { href: '/ai-agent',     label: 'AI Agent',     icon: Bot },
      { href: '/risk',         label: 'Risk',         icon: Shield },
      { href: '/approvals',    label: 'Approvals',    icon: Key },
      { href: '/transactions', label: 'Transactions', icon: ScrollText },
      { href: '/agents',       label: 'Agents',       icon: Cpu },
      { href: '/recurring',    label: 'Recurring',    icon: Repeat },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { href: '/audit',      label: 'Audit Log',  icon: Key },
      { href: '/developer',  label: 'Developer',  icon: Code2 },
      { href: '/settings',   label: 'Settings',   icon: Settings },
    ],
  },
];

export function MobileNav() {
  const [location, navigate] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user } = useUser();

  const initials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() ?? 'U';

  const isActive = (href: string) =>
    location === href || (href !== '/dashboard' && location.startsWith(href));

  const handleNavClick = (href: string) => {
    navigate(href);
    setDrawerOpen(false);
  };

  return (
    <>
      {/* ── Bottom tab bar ─────────────────────────────────────── */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 64,
          display: 'flex',
          alignItems: 'stretch',
          background: 'hsl(0 0% 3%)',
          borderTop: '1px solid hsl(0 0% 12%)',
          zIndex: 50,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {TAB_ITEMS.map(item => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <button
              key={item.href}
              onClick={() => handleNavClick(item.href)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: active ? G : 'hsl(0 0% 38%)',
                borderTop: active ? `2px solid ${G}` : '2px solid transparent',
                transition: 'color 150ms',
              }}
            >
              <Icon size={18} />
              <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: '0.06em', fontFamily: 'Inter, sans-serif' }}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setDrawerOpen(true)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: drawerOpen ? G : 'hsl(0 0% 38%)',
            borderTop: drawerOpen ? `2px solid ${G}` : '2px solid transparent',
            transition: 'color 150ms',
          }}
        >
          <Menu size={18} />
          <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: '0.06em', fontFamily: 'Inter, sans-serif' }}>
            More
          </span>
        </button>
      </nav>

      {/* ── Full-screen drawer overlay ──────────────────────────── */}
      {drawerOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
          onClick={() => setDrawerOpen(false)}
        >
          {/* Backdrop */}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} />

          {/* Drawer panel */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative',
              background: 'hsl(0 0% 3%)',
              borderTop: '1px solid hsl(0 0% 12%)',
              borderRadius: '12px 12px 0 0',
              maxHeight: '80vh',
              overflowY: 'auto',
              paddingBottom: 'calc(64px + env(safe-area-inset-bottom))',
            }}
          >
            {/* Handle bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 2,
                  background: 'hsl(112 100% 54% / 0.12)',
                  border: '1px solid hsl(112 100% 54% / 0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 600, color: G, fontFamily: 'Inter, sans-serif',
                }}>
                  {initials}
                </div>
                <span style={{ fontSize: 11, color: 'hsl(0 0% 60%)', fontFamily: 'Inter, sans-serif' }}>
                  {user?.emailAddresses?.[0]?.emailAddress?.split('@')[0]}
                </span>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                style={{
                  background: 'transparent', border: '1px solid hsl(0 0% 14%)',
                  borderRadius: 2, width: 28, height: 28,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'hsl(0 0% 40%)', cursor: 'pointer',
                }}
              >
                <X size={12} />
              </button>
            </div>

            {/* Nav groups */}
            {DRAWER_GROUPS.map(group => (
              <div key={group.label}>
                <div style={{
                  fontSize: 9, fontWeight: 600, letterSpacing: '0.14em',
                  color: 'hsl(0 0% 28%)', padding: '8px 20px 4px',
                  fontFamily: 'Inter, sans-serif',
                }}>
                  {group.label}
                </div>
                {group.items.map(item => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <button
                      key={item.href}
                      onClick={() => handleNavClick(item.href)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        height: 44,
                        padding: '0 20px',
                        background: active ? 'hsl(0 0% 7%)' : 'transparent',
                        border: 'none',
                        borderLeft: active ? `2px solid ${G}` : '2px solid transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 120ms',
                      }}
                    >
                      <Icon size={15} style={{ color: active ? G : 'hsl(0 0% 40%)', flexShrink: 0 }} />
                      <span style={{
                        fontSize: 12, fontWeight: active ? 500 : 400,
                        color: active ? 'hsl(0 0% 88%)' : 'hsl(0 0% 50%)',
                        fontFamily: 'Inter, sans-serif',
                      }}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
