import { ButtonHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
};

export function Button({ className, variant = 'primary', ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center rounded px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60';
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-700 text-white hover:bg-gray-600',
    ghost: 'bg-transparent text-gray-200 hover:bg-gray-800'
  } as const;
  return <button className={twMerge(base, variants[variant], className)} {...props} />;
}