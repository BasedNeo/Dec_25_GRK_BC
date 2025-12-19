import { Request, Response, NextFunction } from 'express';
import { ValidationRulesEngine } from '../lib/validationRules';
import { ValidationSchemas } from '../lib/validationSchemas';

export function validateRequest(schemaName: keyof typeof ValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction) => {
    const schema = ValidationSchemas[schemaName];
    
    if (!schema) {
      console.error(`[VALIDATION] Schema not found: ${schemaName}`);
      return res.status(500).json({ error: 'Validation configuration error' });
    }
    
    const result = ValidationRulesEngine.validate(req.body, schema);
    
    if (!result.valid) {
      console.warn(`[VALIDATION] Failed for ${schemaName}:`, result.errors);
      return res.status(400).json({
        error: 'Validation failed',
        errors: result.errors
      });
    }
    
    req.body = result.sanitized;
    
    next();
  };
}

export function validateQuery(schemaName: keyof typeof ValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction) => {
    const schema = ValidationSchemas[schemaName];
    
    if (!schema) {
      console.error(`[VALIDATION] Schema not found: ${schemaName}`);
      return res.status(500).json({ error: 'Validation configuration error' });
    }
    
    const result = ValidationRulesEngine.validate(req.query as any, schema);
    
    if (!result.valid) {
      console.warn(`[VALIDATION] Query validation failed for ${schemaName}:`, result.errors);
      return res.status(400).json({
        error: 'Query validation failed',
        errors: result.errors
      });
    }
    
    req.query = result.sanitized as any;
    
    next();
  };
}
