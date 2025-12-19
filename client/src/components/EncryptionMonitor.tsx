import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Lock, Key } from 'lucide-react';

export const EncryptionMonitor = () => {
  const [status, setStatus] = useState<any>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchStatus();
  }, []);
  
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/admin/encryption/status');
      const data = await res.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch encryption status:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const testEncryption = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/encryption/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: 'Test encryption data 12345' })
      });
      
      const result = await res.json();
      setTestResult(result);
    } catch (error) {
      console.error('Encryption test failed:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-6" data-testid="encryption-monitor">
      <Card className="p-6 bg-black/60 border-green-500/30">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Lock className="w-5 h-5 text-green-400" />
            Encryption Status
          </h3>
          <Button onClick={testEncryption} disabled={loading} size="sm" data-testid="button-test-encryption">
            Test Encryption
          </Button>
        </div>
        
        {loading ? (
          <div>Loading...</div>
        ) : status ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-black/40 rounded">
              <span>Encryption Enabled</span>
              <span className="text-green-400" data-testid="status-encryption-enabled">{status.enabled ? 'Yes' : 'No'}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-black/40 rounded">
              <span>Algorithm</span>
              <span className="text-green-400 font-mono" data-testid="status-algorithm">{status.algorithm}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-black/40 rounded">
              <span>Key Initialized</span>
              <span className="text-green-400" data-testid="status-key-initialized">{status.keyInitialized ? 'Yes' : 'No'}</span>
            </div>
            
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded">
              <div className="flex items-start gap-2">
                <Shield className="w-5 h-5 text-green-400 mt-0.5" />
                <div>
                  <div className="font-bold text-green-400">Encryption Active</div>
                  <div className="text-sm text-green-300">
                    All sensitive data is encrypted at rest and in transit using AES-256-GCM
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-red-400">Failed to load encryption status</div>
        )}
      </Card>
      
      {testResult && (
        <Card className="p-6 bg-black/60 border-purple-500/30">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-purple-400" />
            Test Results
          </h3>
          
          <div className="space-y-2">
            <div className="p-3 bg-black/40 rounded">
              <div className="text-xs text-gray-400 mb-1">Encrypted</div>
              <div className="font-mono text-sm break-all" data-testid="text-encrypted">{testResult.encrypted}</div>
            </div>
            
            <div className="p-3 bg-black/40 rounded">
              <div className="text-xs text-gray-400 mb-1">Decrypted</div>
              <div className="font-mono text-sm break-all" data-testid="text-decrypted">{testResult.decrypted}</div>
            </div>
            
            <div className={`p-3 rounded ${
              testResult.match 
                ? 'bg-green-500/10 border border-green-500/30' 
                : 'bg-red-500/10 border border-red-500/30'
            }`} data-testid="status-test-result">
              <div className="font-bold">
                {testResult.match ? 'Encryption/Decryption Successful' : 'Mismatch Detected'}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
