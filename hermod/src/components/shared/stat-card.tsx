import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  accent?: 'green' | 'cyan' | 'amber' | 'red';
  className?: string;
}

const accentColors = {
  green: 'hsl(112 100% 54%)',
  cyan:  'hsl(168 100% 50%)',
  amber: 'hsl(40 100% 50%)',
  red:   'hsl(0 100% 63%)',
};

export function StatCard({ title, value, icon: Icon, trend, accent = 'green', className = '' }: StatCardProps) {
  const color = accentColors[accent];

  return (
    <div
      className={className}
      data-testid={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}
      style={{
        background: 'hsl(0 0% 5%)',
        border: '1px solid hsl(0 0% 10%)',
        borderTop: `2px solid ${color}`,
        borderRadius: 2,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <span
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: '0.1em',
            color: 'hsl(0 0% 45%)',
            textTransform: 'uppercase',
          }}
        >
          {title}
        </span>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 2,
            background: `${color}14`,
            border: `1px solid ${color}30`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={14} style={{ color }} />
        </div>
      </div>

      {/* Value */}
      <div
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 20,
          fontWeight: 600,
          color: 'hsl(0 0% 91%)',
          lineHeight: 1,
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </div>

      {/* Trend */}
      {trend && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 10,
              color: trend.isPositive ? 'hsl(112 100% 54%)' : 'hsl(0 100% 63%)',
            }}
          >
            {trend.isPositive ? '▲' : '▼'} {trend.value}
          </span>
        </div>
      )}
    </div>
  );
}
