import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncateAddress(address: string, start = 6, end = 4): string {
  if (!address || address.length < start + end) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

export function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '$0.00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatNumber(value: string | number | null | undefined, decimals = 4): string {
  if (value === null || value === undefined || value === '') return '0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function getRiskLevelClass(level: string): string {
  switch (level.toLowerCase()) {
    case 'low':
      return 'risk-low';
    case 'medium':
      return 'risk-medium';
    case 'high':
      return 'risk-high';
    case 'critical':
      return 'risk-critical';
    default:
      return 'text-muted-foreground';
  }
}

export function getRiskLevelBgClass(level: string): string {
  switch (level.toLowerCase()) {
    case 'low':
      return 'risk-low-bg';
    case 'medium':
      return 'risk-medium-bg';
    case 'high':
      return 'risk-high-bg';
    case 'critical':
      return 'risk-critical-bg';
    default:
      return 'bg-muted';
  }
}
