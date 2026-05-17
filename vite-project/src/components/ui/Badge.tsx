// ============================================
// Badge Component - For status/sentiment display
// ============================================

import { cn } from '../../utils/helpers';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'danger' | 'warning' | 'neutral';
  className?: string;
}

const variantStyles = {
  success: 'bg-green-900/50 text-green-400 border-green-700',
  danger: 'bg-red-900/50 text-red-400 border-red-700',
  warning: 'bg-yellow-900/50 text-yellow-400 border-yellow-700',
  neutral: 'bg-gray-700/50 text-gray-300 border-gray-600',
};

export function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
