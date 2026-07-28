import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard,
  Wallet,
  PieChart,
  Shield,
  Key,
  Send,
  Cpu,
  Repeat,
  ScrollText,
  Code2,
  Settings,
  ChevronLeft,
  ChevronRight,
  ArrowDownUp,
  Bot,
  Layers,
  Zap,
  LayoutTemplate,
  BarChart2,
  Radio,
  Bell,
} from 'lucide-react';
import { useUser } from '@clerk/react';
import { useSidebar } from '@/lib/sidebar-context';
import { useAgentMessagesPendingCount } from '@workspace/api-client-react';
import { useNotificationsListener } from '@/hooks/use-notifications';

const navGroups = [
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
      { href: '/agents',           label: 'Agents',    icon: Cpu },
      { href: '/signals',          label: 'Signals',   icon: Radio },
      { href: '/policy-templates', label: 'Templates', icon: LayoutTemplate },
      { href: '/recurring',        label: 'Recurring', icon: Repeat },
      { href: '/triggers',         label: 'Triggers',  icon: Zap },
    ],
  },
  {
    label: 'INTELLIGENCE',
    items: [
      { href: '/analytics',    label: 'Analytics',    icon: BarChart2 },
      { href: '/audit',        label: 'Audit Log',    icon: Key },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { href: '/developer', label: 'Developer', icon: Code2 },
      { href: '/settings',  label: 'Settings',  icon: Settings },
    ],
  },
];

export function Sidebar() {
  const [location] = useLocation();
  const { collapsed, toggle } = useSidebar();
  const { user } = useUser();
  const { data: pendingCount } = useAgentMessagesPendingCount();
  const { unreadCount, markAllRead } = useNotificationsListener();

  const initials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() ?? 'U';

  const email = user?.emailAddresses?.[0]?.emailAddress ?? '';
  const shortEmail = email.length > 18 ? email.slice(0, 16) + '…' : email;

  return (
    <aside
      className="sidebar-transition fixed left-0 top-0 h-screen flex flex-col z-40 overflow-hidden"
      style={{
        width: collapsed ? 48 : 240,
        background: 'hsl(0 0% 3%)',
        borderRight: '1px solid hsl(0 0% 10%)',
      }}
    >
      {/* ── Logo ── */}
      <div
        className="flex items-center shrink-0 overflow-hidden"
        style={{
          height: 48,
          borderBottom: '1px solid hsl(0 0% 10%)',
          padding: collapsed ? '0 12px' : '0 16px',
          justifyContent: collapsed ? 'center' : 'space-between',
        }}
      >
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
            <img
              src={`${import.meta.env.BASE_URL.replace(/\/$/, '')}/logo.png`}
              alt="Hermod"
              className="w-5 h-5 shrink-0"
            />
            <span
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: '#FFFFFF',
              }}
            >
              HERMOD
            </span>
          </Link>
        )}

        <button
          onClick={toggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            borderRadius: 2,
            border: '1px solid hsl(0 0% 14%)',
            background: 'transparent',
            color: 'hsl(0 0% 40%)',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'color 150ms, border-color 150ms',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.color = 'hsl(112 100% 54%)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'hsl(112 100% 54% / 0.4)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.color = 'hsl(0 0% 40%)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'hsl(0 0% 14%)';
          }}
        >
          {collapsed
            ? <ChevronRight size={12} />
            : <ChevronLeft size={12} />
          }
        </button>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3" style={{ scrollbarWidth: 'none' }}>
        {navGroups.map(group => (
          <div key={group.label} className="mb-1">
            {/* Group label — only visible when expanded */}
            {!collapsed && (
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: '0.14em',
                  color: 'hsl(0 0% 30%)',
                  padding: '8px 16px 4px',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                {group.label}
              </div>
            )}

            {group.items.map(item => {
              const Icon = item.icon;
              const isActive = location === item.href ||
                (item.href !== '/dashboard' && location.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    height: 34,
                    padding: collapsed ? '0' : '0 16px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    position: 'relative',
                    textDecoration: 'none',
                    borderLeft: isActive && !collapsed ? '2px solid hsl(112 100% 54%)' : '2px solid transparent',
                    background: isActive ? 'hsl(0 0% 8%)' : 'transparent',
                    transition: 'background 120ms',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) (e.currentTarget as HTMLAnchorElement).style.background = 'hsl(0 0% 7%)';
                  }}
                  onMouseLeave={e => {
                    if (!isActive) (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                  }}
                >
                  <Icon
                    size={14}
                    style={{
                      color: isActive ? 'hsl(112 100% 54%)' : 'hsl(0 0% 40%)',
                      flexShrink: 0,
                    }}
                  />
                  {!collapsed && (
                    <span
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: 11,
                        fontWeight: isActive ? 500 : 400,
                        color: isActive ? 'hsl(0 0% 88%)' : 'hsl(0 0% 50%)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        flex: 1,
                      }}
                    >
                      {item.label}
                    </span>
                  )}
                  {/* Pending inbox badge for Agents */}
                  {item.href === '/agents' && (pendingCount?.count ?? 0) > 0 && (
                    <span style={{
                      fontSize: 8, fontWeight: 700, lineHeight: 1,
                      padding: collapsed ? '2px 4px' : '2px 5px',
                      borderRadius: 999,
                      background: 'hsl(43 100% 54%)',
                      color: '#000',
                      flexShrink: 0,
                    }}>
                      {pendingCount!.count}
                    </span>
                  )}

                  {/* Collapsed: active dot */}
                  {collapsed && isActive && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 4,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 3,
                        height: 3,
                        borderRadius: '50%',
                        background: 'hsl(112 100% 54%)',
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── User section ── */}
      <div
        style={{
          borderTop: '1px solid hsl(0 0% 10%)',
          padding: collapsed ? '10px 0' : '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          justifyContent: collapsed ? 'center' : 'flex-start',
          overflow: 'hidden',
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 2,
            background: 'hsl(112 100% 54% / 0.12)',
            border: '1px solid hsl(112 100% 54% / 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 600,
            color: 'hsl(112 100% 54%)',
            flexShrink: 0,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {initials}
        </div>

        {!collapsed && (
          <div className="min-w-0">
            <div
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: 'hsl(0 0% 70%)',
                fontFamily: 'Inter, sans-serif',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {shortEmail}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: 'hsl(112 100% 54%)',
                  flexShrink: 0,
                  display: 'inline-block',
                }}
              />
              <span style={{ fontSize: 9, color: 'hsl(0 0% 40%)', fontFamily: 'Inter, sans-serif' }}>
                ONLINE
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
