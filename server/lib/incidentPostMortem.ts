interface Incident {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: Date;
  resolvedAt?: Date;
  duration?: number;
  description: string;
  impactedSystems: string[];
  rootCause?: string;
  resolution?: string;
  preventativeMeasures?: string[];
  lessonsLearned?: string[];
  timeline: Array<{
    timestamp: Date;
    event: string;
    actor: string;
  }>;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
}

export class IncidentPostMortemService {
  private static incidents: Map<string, Incident> = new Map();
  
  static createIncident(
    title: string,
    severity: Incident['severity'],
    description: string,
    impactedSystems: string[]
  ): Incident {
    const incident: Incident = {
      id: `incident-${Date.now()}`,
      title,
      severity,
      detectedAt: new Date(),
      description,
      impactedSystems,
      timeline: [
        {
          timestamp: new Date(),
          event: 'Incident detected',
          actor: 'system'
        }
      ],
      status: 'open'
    };
    
    this.incidents.set(incident.id, incident);
    
    console.log(`[INCIDENT] Created: ${incident.id} - ${title}`);
    
    return incident;
  }
  
  static addTimelineEvent(incidentId: string, event: string, actor: string): void {
    const incident = this.incidents.get(incidentId);
    
    if (!incident) {
      throw new Error(`Incident not found: ${incidentId}`);
    }
    
    incident.timeline.push({
      timestamp: new Date(),
      event,
      actor
    });
  }
  
  static updateStatus(incidentId: string, status: Incident['status']): void {
    const incident = this.incidents.get(incidentId);
    
    if (!incident) {
      throw new Error(`Incident not found: ${incidentId}`);
    }
    
    incident.status = status;
    this.addTimelineEvent(incidentId, `Status changed to ${status}`, 'admin');
  }
  
  static resolveIncident(
    incidentId: string,
    rootCause: string,
    resolution: string,
    preventativeMeasures: string[]
  ): void {
    const incident = this.incidents.get(incidentId);
    
    if (!incident) {
      throw new Error(`Incident not found: ${incidentId}`);
    }
    
    incident.resolvedAt = new Date();
    incident.duration = incident.resolvedAt.getTime() - incident.detectedAt.getTime();
    incident.rootCause = rootCause;
    incident.resolution = resolution;
    incident.preventativeMeasures = preventativeMeasures;
    incident.status = 'resolved';
    
    this.addTimelineEvent(incidentId, 'Incident resolved', 'admin');
    
    console.log(`[INCIDENT] Resolved: ${incidentId} (${Math.ceil(incident.duration / 1000 / 60)} minutes)`);
  }
  
  static generatePostMortem(incidentId: string): string {
    const incident = this.incidents.get(incidentId);
    
    if (!incident) {
      throw new Error(`Incident not found: ${incidentId}`);
    }
    
    const durationMinutes = incident.duration 
      ? Math.ceil(incident.duration / 1000 / 60)
      : 'Ongoing';
    
    return `
# INCIDENT POST-MORTEM: ${incident.title}

**Incident ID:** ${incident.id}
**Severity:** ${incident.severity.toUpperCase()}
**Status:** ${incident.status.toUpperCase()}

## Summary
${incident.description}

## Timeline
**Detected:** ${incident.detectedAt.toISOString()}
${incident.resolvedAt ? `**Resolved:** ${incident.resolvedAt.toISOString()}` : '**Status:** Still investigating'}
**Duration:** ${durationMinutes} ${typeof durationMinutes === 'number' ? 'minutes' : ''}

## Impacted Systems
${incident.impactedSystems.map(s => `- ${s}`).join('\n')}

## Root Cause
${incident.rootCause || 'Under investigation'}

## Resolution
${incident.resolution || 'Not yet resolved'}

## Preventative Measures
${incident.preventativeMeasures ? incident.preventativeMeasures.map(m => `- ${m}`).join('\n') : 'To be determined'}

## Lessons Learned
${incident.lessonsLearned ? incident.lessonsLearned.map(l => `- ${l}`).join('\n') : 'To be documented'}

## Detailed Timeline
${incident.timeline.map(t => 
  `- **${t.timestamp.toISOString()}** [${t.actor}]: ${t.event}`
).join('\n')}

---
*Generated: ${new Date().toISOString()}*
    `.trim();
  }
  
  static getAllIncidents(): Incident[] {
    return Array.from(this.incidents.values())
      .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
  }
  
  static getIncident(id: string): Incident | undefined {
    return this.incidents.get(id);
  }
}
