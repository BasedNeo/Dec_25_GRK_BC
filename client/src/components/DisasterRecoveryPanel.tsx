import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Shield, Play, FileText, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

const DISASTER_TYPES = [
  { code: 'DB_CORRUPTION', name: 'Database Corruption', severity: 'critical' },
  { code: 'DATA_LOSS', name: 'Data Loss', severity: 'critical' },
  { code: 'SYSTEM_COMPROMISE', name: 'Security Compromise', severity: 'critical' },
  { code: 'NETWORK_FAILURE', name: 'Network Failure', severity: 'high' },
  { code: 'MANUAL_ERROR', name: 'Manual Error', severity: 'high' },
  { code: 'HARDWARE_FAILURE', name: 'Hardware Failure', severity: 'critical' }
];

interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  details?: any;
  error?: string;
}

export const DisasterRecoveryPanel = () => {
  const [selectedDisaster, setSelectedDisaster] = useState('');
  const [plan, setPlan] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [healthChecks, setHealthChecks] = useState<HealthCheck[] | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  
  const createPlan = async () => {
    if (!selectedDisaster) {
      alert('Please select a disaster type');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/admin/disaster-recovery/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disasterType: selectedDisaster })
      });
      
      const data = await res.json();
      if (data.error) {
        alert(`Error: ${data.error}`);
      } else {
        setPlan(data.plan);
      }
    } catch (error) {
      console.error('Failed to create plan:', error);
      alert('Failed to create recovery plan');
    } finally {
      setLoading(false);
    }
  };
  
  const executePlan = async () => {
    if (!plan) return;
    
    const confirmed = confirm(
      '⚠️ WARNING ⚠️\n\n' +
      'This will execute the disaster recovery plan.\n' +
      'This is a CRITICAL operation!\n\n' +
      'Are you sure?'
    );
    
    if (!confirmed) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/admin/disaster-recovery/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, automated: true })
      });
      
      const data = await res.json();
      if (data.error) {
        alert(`Recovery failed: ${data.error}`);
      } else {
        alert('✅ Recovery plan executed successfully!');
        setPlan(null);
      }
    } catch (error) {
      console.error('Recovery execution failed:', error);
      alert('Recovery execution failed. Check console for details.');
    } finally {
      setLoading(false);
    }
  };
  
  const testRecovery = async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/admin/disaster-recovery/test', {
        method: 'POST'
      });
      
      const results = await res.json();
      setTestResults(results);
    } catch (error) {
      console.error('Recovery test failed:', error);
      alert('Recovery test failed');
    } finally {
      setTesting(false);
    }
  };
  
  const checkHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await fetch('/api/health/detailed');
      const data = await res.json();
      setHealthChecks(data.checks);
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setLoadingHealth(false);
    }
  };
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-500/10';
      case 'high': return 'border-orange-500 bg-orange-500/10';
      default: return 'border-yellow-500 bg-yellow-500/10';
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'degraded': return 'text-yellow-400';
      case 'unhealthy': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'degraded': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'unhealthy': return <XCircle className="w-4 h-4 text-red-400" />;
      default: return null;
    }
  };
  
  return (
    <div className="space-y-6" data-testid="disaster-recovery-panel">
      <Card className="p-6 bg-black/60 border-blue-500/30">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              System Health Check
            </h3>
            <p className="text-sm text-gray-400">
              Monitor database, backups, disk space, and memory
            </p>
          </div>
          <Button 
            onClick={checkHealth} 
            disabled={loadingHealth}
            variant="outline"
            className="border-blue-500/30"
            data-testid="button-check-health"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loadingHealth ? 'animate-spin' : ''}`} />
            {loadingHealth ? 'Checking...' : 'Check Health'}
          </Button>
        </div>
        
        {healthChecks && (
          <div className="grid grid-cols-2 gap-3" data-testid="health-checks-grid">
            {healthChecks.map((check) => (
              <div 
                key={check.service}
                className={`p-3 rounded border border-gray-700 bg-black/40 ${getStatusColor(check.status)}`}
                data-testid={`health-check-${check.service}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {getStatusIcon(check.status)}
                  <span className="font-bold capitalize">{check.service.replace('_', ' ')}</span>
                </div>
                <div className="text-xs text-gray-400">
                  Response: {check.responseTime}ms
                  {check.details && Object.entries(check.details).map(([key, val]) => (
                    <div key={key}>{key}: {String(val)}</div>
                  ))}
                  {check.error && <div className="text-red-400">{check.error}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      
      <Card className="p-6 bg-black/60 border-green-500/30">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold mb-2">Test Disaster Recovery</h3>
            <p className="text-sm text-gray-400">
              Verify backup system and recovery procedures
            </p>
          </div>
          <Button 
            onClick={testRecovery} 
            disabled={testing}
            className="bg-gradient-to-r from-green-500 to-blue-500"
            data-testid="button-run-dr-test"
          >
            {testing ? 'Testing...' : 'Run Test'}
          </Button>
        </div>
        
        {testResults && (
          <div className={`mt-4 p-4 rounded border ${
            testResults.passed 
              ? 'border-green-500/30 bg-green-500/10' 
              : 'border-red-500/30 bg-red-500/10'
          }`} data-testid="dr-test-results">
            <div className="font-bold mb-2">
              {testResults.passed ? '✅ All Tests Passed' : '❌ Some Tests Failed'}
            </div>
            <div className="space-y-1">
              {testResults.tests?.map((test: any, i: number) => (
                <div key={i} className="text-sm">
                  {test.passed ? '✅' : '❌'} {test.name}
                  {test.duration && ` (${test.duration}ms)`}
                  {test.error && ` - ${test.error}`}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
      
      <Card className="p-6 bg-black/60 border-purple-500/30">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-400" />
          Create Recovery Plan
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Disaster Type
            </label>
            <select
              value={selectedDisaster}
              onChange={(e) => setSelectedDisaster(e.target.value)}
              className="w-full px-4 py-2 bg-black/60 border border-purple-500/30 rounded text-white"
              data-testid="select-disaster-type"
            >
              <option value="">-- Select Disaster Type --</option>
              {DISASTER_TYPES.map(d => (
                <option key={d.code} value={d.code}>
                  {d.name} ({d.severity})
                </option>
              ))}
            </select>
          </div>
          
          <Button 
            onClick={createPlan} 
            disabled={loading || !selectedDisaster}
            data-testid="button-create-plan"
          >
            <FileText className="w-4 h-4 mr-2" />
            Create Plan
          </Button>
        </div>
      </Card>
      
      {plan && (
        <Card className={`p-6 border ${getSeverityColor(plan.disasterType.severity)}`} data-testid="recovery-plan-display">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <div>
              <h3 className="text-xl font-bold">{plan.disasterType.name}</h3>
              <p className="text-sm text-gray-400">
                Severity: {plan.disasterType.severity.toUpperCase()}
              </p>
              <p className="text-sm text-gray-400">
                Estimated Duration: {Math.ceil(plan.estimatedTotalDuration / 60)} minutes
              </p>
            </div>
          </div>
          
          <div className="space-y-2 mb-4">
            <h4 className="font-bold">Recovery Steps:</h4>
            {plan.steps.map((step: any, i: number) => (
              <div 
                key={step.id}
                className={`p-3 rounded border ${
                  step.critical 
                    ? 'border-red-500/30 bg-red-500/5' 
                    : 'border-blue-500/30 bg-blue-500/5'
                }`}
                data-testid={`recovery-step-${step.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-bold">
                      {i + 1}. {step.description}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {step.automated ? '🤖 Automated' : '👤 Manual'} • 
                      ~{Math.ceil(step.estimatedDuration / 60)} min • 
                      {step.critical ? '⚠️ Critical' : '✓ Optional'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={executePlan} 
              disabled={loading}
              className="bg-gradient-to-r from-orange-500 to-red-500"
              data-testid="button-execute-plan"
            >
              <Play className="w-4 h-4 mr-2" />
              Execute Plan
            </Button>
            <Button 
              onClick={() => setPlan(null)} 
              variant="outline"
              data-testid="button-cancel-plan"
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
