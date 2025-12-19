import { useState } from 'react';
import { ClientValidator, ValidationRule } from '@/lib/validation';

export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  rules: Record<keyof T, ValidationRule>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  
  const validateField = (field: keyof T, value: any) => {
    const rule = rules[field];
    if (!rule) return;
    
    const result = ClientValidator.validateField(value, rule);
    
    setErrors(prev => ({
      ...prev,
      [field]: result.error || undefined
    }));
    
    return result.valid;
  };
  
  const handleChange = (field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }));
    
    if (touched[field]) {
      validateField(field, value);
    }
  };
  
  const handleBlur = (field: keyof T) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, values[field]);
  };
  
  const validateAll = () => {
    const result = ClientValidator.validateForm(values, rules as any);
    setErrors(result.errors as any);
    
    const allTouched = Object.keys(rules).reduce((acc, key) => {
      acc[key as keyof T] = true;
      return acc;
    }, {} as Record<keyof T, boolean>);
    setTouched(allTouched);
    
    return result.valid;
  };
  
  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  };
  
  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    reset,
    isValid: Object.keys(errors).length === 0
  };
}
