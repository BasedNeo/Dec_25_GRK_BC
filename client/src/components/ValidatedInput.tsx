import { InputHTMLAttributes } from 'react';

interface ValidatedInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  touched?: boolean;
}

export const ValidatedInput = ({ 
  label, 
  error, 
  touched, 
  className = '',
  ...props 
}: ValidatedInputProps) => {
  const hasError = touched && error;
  
  return (
    <div className="space-y-1" data-testid={`input-container-${props.name || 'field'}`}>
      <label className="block text-sm font-medium text-gray-300">
        {label}
        {props.required && <span className="text-red-400 ml-1">*</span>}
      </label>
      
      <input
        {...props}
        data-testid={`input-${props.name || 'field'}`}
        className={`w-full px-4 py-2 bg-black/60 border rounded-lg transition-colors text-white
          ${hasError 
            ? 'border-red-500 focus:border-red-400' 
            : 'border-purple-500/30 focus:border-purple-500'
          }
          ${className}
        `}
      />
      
      {hasError && (
        <div className="text-sm text-red-400 flex items-center gap-1" data-testid={`error-${props.name || 'field'}`}>
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
