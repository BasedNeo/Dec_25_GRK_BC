#!/usr/bin/env tsx
import request from 'supertest';
import pLimit from 'p-limit';

interface LoadTestConfig {
  baseUrl: string;
  concurrency: number;
  iterations: number;
  warmupRequests: number;
  endpoints: EndpointConfig[];
}

interface EndpointConfig {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  body?: (index: number) => object;
  headers?: Record<string, string>;
}

interface RequestMetrics {
  endpoint: string;
  latencies: number[];
  errors: number;
  successes: number;
}

interface TestResults {
  totalRequests: number;
  totalErrors: number;
  totalSuccesses: number;
  durationMs: number;
  requestsPerSecond: number;
  endpoints: EndpointResult[];
}

interface EndpointResult {
  name: string;
  requests: number;
  errors: number;
  errorRate: string;
  avgLatencyMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  minMs: number;
  maxMs: number;
}

function generateWalletAddress(index: number): string {
  const hex = index.toString(16).padStart(40, '0');
  return `0x${hex}`;
}

function generateSessionId(index: number): string {
  return `anon:loadtest_${index}_${Date.now()}`;
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function calculateMetrics(metrics: RequestMetrics): EndpointResult {
  const latencies = metrics.latencies;
  const avg = latencies.length > 0 
    ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
    : 0;

  return {
    name: metrics.endpoint,
    requests: metrics.successes + metrics.errors,
    errors: metrics.errors,
    errorRate: `${((metrics.errors / (metrics.successes + metrics.errors)) * 100).toFixed(2)}%`,
    avgLatencyMs: Math.round(avg),
    p50Ms: Math.round(percentile(latencies, 50)),
    p95Ms: Math.round(percentile(latencies, 95)),
    p99Ms: Math.round(percentile(latencies, 99)),
    minMs: latencies.length > 0 ? Math.min(...latencies) : 0,
    maxMs: latencies.length > 0 ? Math.max(...latencies) : 0,
  };
}

async function runLoadTest(config: LoadTestConfig): Promise<TestResults> {
  const limit = pLimit(config.concurrency);
  const metricsMap = new Map<string, RequestMetrics>();

  for (const endpoint of config.endpoints) {
    metricsMap.set(endpoint.name, {
      endpoint: endpoint.name,
      latencies: [],
      errors: 0,
      successes: 0,
    });
  }

  console.log('\n========================================');
  console.log('    LOAD TEST CONFIGURATION');
  console.log('========================================');
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`Concurrency: ${config.concurrency} concurrent requests`);
  console.log(`Iterations: ${config.iterations} per endpoint`);
  console.log(`Warmup: ${config.warmupRequests} requests`);
  console.log(`Total requests: ${config.endpoints.length * config.iterations}`);
  console.log(`Endpoints: ${config.endpoints.map(e => e.name).join(', ')}`);
  console.log('========================================\n');

  if (config.warmupRequests > 0) {
    console.log('Running warmup requests...');
    const warmupPromises: Promise<void>[] = [];
    for (let i = 0; i < config.warmupRequests; i++) {
      const endpoint = config.endpoints[i % config.endpoints.length];
      warmupPromises.push(
        limit(async () => {
          try {
            await makeRequest(config.baseUrl, endpoint, i);
          } catch (e) {
          }
        })
      );
    }
    await Promise.all(warmupPromises);
    console.log('Warmup complete.\n');
  }

  console.log('Starting load test...');
  const startTime = Date.now();

  const allPromises: Promise<void>[] = [];

  for (const endpoint of config.endpoints) {
    for (let i = 0; i < config.iterations; i++) {
      allPromises.push(
        limit(async () => {
          const metrics = metricsMap.get(endpoint.name)!;
          const requestStart = Date.now();

          try {
            const response = await makeRequest(config.baseUrl, endpoint, i);
            const latency = Date.now() - requestStart;
            
            if (response.status >= 200 && response.status < 400) {
              metrics.successes++;
              metrics.latencies.push(latency);
            } else {
              metrics.errors++;
              metrics.latencies.push(latency);
            }
          } catch (error) {
            metrics.errors++;
            metrics.latencies.push(Date.now() - requestStart);
          }
        })
      );
    }
  }

  const progressInterval = setInterval(() => {
    let completed = 0;
    let errors = 0;
    metricsMap.forEach(m => {
      completed += m.successes + m.errors;
      errors += m.errors;
    });
    const total = config.endpoints.length * config.iterations;
    const pct = ((completed / total) * 100).toFixed(1);
    process.stdout.write(`\rProgress: ${completed}/${total} (${pct}%) - Errors: ${errors}`);
  }, 500);

  await Promise.all(allPromises);
  clearInterval(progressInterval);

  const endTime = Date.now();
  const durationMs = endTime - startTime;

  let totalSuccesses = 0;
  let totalErrors = 0;
  const endpointResults: EndpointResult[] = [];

  metricsMap.forEach(metrics => {
    totalSuccesses += metrics.successes;
    totalErrors += metrics.errors;
    endpointResults.push(calculateMetrics(metrics));
  });

  return {
    totalRequests: totalSuccesses + totalErrors,
    totalSuccesses,
    totalErrors,
    durationMs,
    requestsPerSecond: Math.round((totalSuccesses + totalErrors) / (durationMs / 1000)),
    endpoints: endpointResults,
  };
}

async function makeRequest(
  baseUrl: string, 
  endpoint: EndpointConfig, 
  index: number
): Promise<request.Response> {
  const agent = request(baseUrl);
  
  let req: request.Test;
  
  switch (endpoint.method) {
    case 'GET':
      req = agent.get(endpoint.path);
      break;
    case 'POST':
      req = agent.post(endpoint.path);
      break;
    case 'PUT':
      req = agent.put(endpoint.path);
      break;
    case 'DELETE':
      req = agent.delete(endpoint.path);
      break;
  }

  if (endpoint.headers) {
    for (const [key, value] of Object.entries(endpoint.headers)) {
      req = req.set(key, value);
    }
  }

  req = req.set('Content-Type', 'application/json');

  if (endpoint.body && (endpoint.method === 'POST' || endpoint.method === 'PUT')) {
    req = req.send(endpoint.body(index));
  }

  return req.timeout(30000);
}

function printResults(results: TestResults): void {
  console.log('\n\n========================================');
  console.log('    LOAD TEST RESULTS');
  console.log('========================================');
  console.log(`Duration: ${(results.durationMs / 1000).toFixed(2)}s`);
  console.log(`Total Requests: ${results.totalRequests}`);
  console.log(`Successful: ${results.totalSuccesses}`);
  console.log(`Failed: ${results.totalErrors}`);
  console.log(`Error Rate: ${((results.totalErrors / results.totalRequests) * 100).toFixed(2)}%`);
  console.log(`Throughput: ${results.requestsPerSecond} req/s`);
  console.log('----------------------------------------\n');

  console.log('ENDPOINT BREAKDOWN:');
  console.log('----------------------------------------');

  for (const ep of results.endpoints) {
    console.log(`\n[${ep.name}]`);
    console.log(`  Requests: ${ep.requests} (${ep.errors} errors, ${ep.errorRate})`);
    console.log(`  Latency: avg=${ep.avgLatencyMs}ms, p50=${ep.p50Ms}ms, p95=${ep.p95Ms}ms, p99=${ep.p99Ms}ms`);
    console.log(`  Range: min=${ep.minMs}ms, max=${ep.maxMs}ms`);
  }

  console.log('\n========================================');
  
  if (results.totalErrors === 0) {
    console.log('STATUS: PASS - No errors detected');
  } else if (results.totalErrors / results.totalRequests < 0.01) {
    console.log('STATUS: PASS - Error rate below 1%');
  } else if (results.totalErrors / results.totalRequests < 0.05) {
    console.log('STATUS: WARNING - Error rate between 1-5%');
  } else {
    console.log('STATUS: FAIL - Error rate above 5%');
  }
  console.log('========================================\n');
}

async function main() {
  const args = process.argv.slice(2);
  const concurrency = parseInt(args.find(a => a.startsWith('--concurrency='))?.split('=')[1] || '100');
  const iterations = parseInt(args.find(a => a.startsWith('--iterations='))?.split('=')[1] || '50');
  const baseUrl = args.find(a => a.startsWith('--url='))?.split('=')[1] || 'http://localhost:5000';

  const config: LoadTestConfig = {
    baseUrl,
    concurrency,
    iterations,
    warmupRequests: Math.min(20, iterations),
    endpoints: [
      {
        name: 'GET /api/health',
        method: 'GET',
        path: '/api/health',
      },
      {
        name: 'GET /api/points/balance',
        method: 'GET',
        path: '/api/points/balance/anon:loadtest_user_0',
      },
      {
        name: 'GET /api/points/leaderboard',
        method: 'GET',
        path: '/api/points/leaderboard',
      },
      {
        name: 'GET /api/activity/logs',
        method: 'GET',
        path: '/api/activity/logs?limit=20',
      },
      {
        name: 'GET /api/ws/stats',
        method: 'GET',
        path: '/api/ws/stats',
      },
    ],
  };

  console.log('\n');
  console.log('========================================');
  console.log('   BASED GUARDIANS LOAD TEST SUITE');
  console.log('========================================');
  console.log(`\nUsage: npx tsx scripts/loadTest.ts [options]`);
  console.log(`Options:`);
  console.log(`  --concurrency=N  Number of concurrent requests (default: 100)`);
  console.log(`  --iterations=N   Requests per endpoint (default: 50)`);
  console.log(`  --url=URL        Base URL (default: http://localhost:5000)`);
  
  try {
    const results = await runLoadTest(config);
    printResults(results);
    
    if (results.totalErrors / results.totalRequests > 0.05) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Load test failed:', error);
    process.exit(1);
  }
}

main();
