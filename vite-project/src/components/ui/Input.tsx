// ============================================
// Input Component - Reusable UI Component
// Single Responsibility: Handle text input
// ============================================

import { cn } from '../../utils/helpers';
import type { InputProps } from '../../types';

export function Input({
  value,
  onChange,
  placeholder,
  onSubmit,
  disabled = false,
  className,
}: InputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSubmit && !disabled) {
      onSubmit();
    }
  };

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        'w-full px-4 py-3 rounded-lg',
        'bg-gray-800 border border-gray-700',
        'text-white placeholder-gray-500',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'transition-colors duration-200',
        className
      )}
    />
  );
}
