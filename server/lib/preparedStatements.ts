import { QueryValidator } from './queryValidator';

/**
 * Safe query utilities for Drizzle ORM
 * 
 * IMPORTANT: Always use Drizzle's query builder methods with parameterized values.
 * Never use sql.raw() with user input - it bypasses SQL injection protection.
 * 
 * Drizzle ORM automatically parameterizes all values passed to query builders,
 * which is the primary defense against SQL injection in this application.
 */
export class SafeQueryBuilder {
  /**
   * Validates and returns a safe limit value
   */
  static safeLimit(limit: any, maxLimit: number = 100): number {
    return QueryValidator.validateLimit(limit, maxLimit);
  }
  
  /**
   * Validates and returns a safe offset value
   */
  static safeOffset(offset: any): number {
    return QueryValidator.validateOffset(offset);
  }
  
  /**
   * Validates a column name against an allowlist
   * Use this for dynamic ORDER BY columns
   */
  static safeColumn<T extends string>(column: string, allowedColumns: T[]): T {
    const validated = QueryValidator.validateOrderByColumn(column, allowedColumns);
    return validated as T;
  }
  
  /**
   * Returns sanitized search input with SQL wildcards escaped
   */
  static safeSearchPattern(input: string): string {
    return QueryValidator.sanitizeForLike(input);
  }
  
  /**
   * Validates search input and returns sanitized version
   */
  static safeSearchQuery(query: string, maxLength: number = 100): string {
    return QueryValidator.validateSearchQuery(query, maxLength);
  }
  
  /**
   * Validates sort direction
   */
  static safeSortDirection(direction: string): 'asc' | 'desc' {
    return QueryValidator.validateSortDirection(direction);
  }
}
