import { Badge } from '@/components/ui/badge';
import { getRiskLevelClass, getRiskLevelBgClass } from '@/lib/utils';

interface RiskBadgeProps {
  level: string;
  className?: string;
}

export function RiskBadge({ level, className = '' }: RiskBadgeProps) {
  return (
    <Badge 
      variant="outline" 
      className={`${getRiskLevelBgClass(level)} ${getRiskLevelClass(level)} border font-medium uppercase text-xs ${className}`}
    >
      {level}
    </Badge>
  );
}
