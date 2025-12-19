import React, { useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ElementType;
}

export const Input: React.FC<InputProps> = ({ label, error, icon: Icon, className = '', id, ...props }) => {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label 
          htmlFor={inputId} 
          className="block text-xs font-medium text-zinc-400 uppercase tracking-wider"
        >
          {label}
        </label>
      )}
      <div className="relative group">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-zinc-500 group-focus-within:text-ninja-500 transition-colors" />
          </div>
        )}
        <input
          id={inputId}
          className={`
            block w-full rounded-lg bg-dark-800 border border-dark-600 text-zinc-100 
            placeholder-zinc-500 focus:border-ninja-500 focus:ring-1 focus:ring-ninja-500 
            transition-all sm:text-sm py-2.5
            ${Icon ? 'pl-10' : 'pl-3'}
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
};