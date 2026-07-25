import * as React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  'whitespace-nowrap inline-flex items-center border px-1.5 py-0.5 text-[10px] font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-ring leading-none',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary/15 text-primary border-primary/25',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground',
        destructive:
          'border-transparent bg-destructive/10 text-destructive border-destructive/25',
        outline:
          'text-foreground border-border',
        success:
          'bg-[hsl(112_100%_54%/0.08)] text-[hsl(112_100%_54%)] border-[hsl(112_100%_54%/0.2)]',
        warning:
          'bg-[hsl(40_100%_50%/0.08)] text-[hsl(40_100%_50%)] border-[hsl(40_100%_50%/0.2)]',
        danger:
          'bg-[hsl(0_100%_63%/0.08)] text-[hsl(0_100%_63%)] border-[hsl(0_100%_63%/0.2)]',
        cyan:
          'bg-[hsl(168_100%_50%/0.08)] text-[hsl(168_100%_50%)] border-[hsl(168_100%_50%/0.2)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
