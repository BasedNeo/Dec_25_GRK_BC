interface Metric {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
}

export class MonitoringService {
  private static metrics: Metric[] = [];
  private static readonly MAX_METRICS = 10000;
  
  static recordMetric(name: string, value: number, tags?: Record<string, string>) {
    this.metrics.push({
      name,
      value,
      timestamp: new Date(),
      tags
    });
    
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
  }
  
  static getMetrics(name?: string, since?: Date): Metric[] {
    let filtered = this.metrics;
    
    if (name) {
      filtered = filtered.filter(m => m.name === name);
    }
    
    if (since) {
      filtered = filtered.filter(m => m.timestamp >= since);
    }
    
    return filtered;
  }
  
  static getAverageMetric(name: string, minutes: number = 5): number {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    const metrics = this.getMetrics(name, since);
    
    if (metrics.length === 0) return 0;
    
    return metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
  }
  
  static getMetricsSummary(): Record<string, { count: number; avg: number; min: number; max: number }> {
    const summary: Record<string, { count: number; avg: number; min: number; max: number }> = {};
    const since = new Date(Date.now() - 5 * 60 * 1000);
    const recentMetrics = this.getMetrics(undefined, since);
    
    for (const metric of recentMetrics) {
      if (!summary[metric.name]) {
        summary[metric.name] = { count: 0, avg: 0, min: Infinity, max: -Infinity };
      }
      
      summary[metric.name].count++;
      summary[metric.name].min = Math.min(summary[metric.name].min, metric.value);
      summary[metric.name].max = Math.max(summary[metric.name].max, metric.value);
    }
    
    for (const name of Object.keys(summary)) {
      const metrics = recentMetrics.filter(m => m.name === name);
      summary[name].avg = metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
    }
    
    return summary;
  }
  
  static clearOldMetrics() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    this.metrics = this.metrics.filter(m => m.timestamp >= oneHourAgo);
  }
}
