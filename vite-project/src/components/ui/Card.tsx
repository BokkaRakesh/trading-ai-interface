// ============================================
// Card Component - Reusable Container Component
// Single Responsibility: Provide styled container
// ============================================

import { cn } from '../../utils/helpers';
import type { CardProps } from '../../types';

export function Card({ children, className, title }: CardProps) {
  return (
    <div
      className={cn(
        'bg-gray-800 rounded-xl border border-gray-700',
        'shadow-lg',
        className
      )}
    >
      {title && (
        <div className="px-4 py-3 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
}
