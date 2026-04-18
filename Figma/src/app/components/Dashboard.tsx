import { useState } from 'react';
import { AgentResult, ExecutionSummary, executeAllAgents, rankAgents } from '../lib/agents';
import { Leaderboard } from './Leaderboard';
import { Clock, Zap, CheckCircle, AlertTriangle } from 'lucide-react';

export function Dashboard() {
  const [prompt, setPrompt] = useState('What is the best renewable energy solution for residential homes in 2026?');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AgentResult[]>([]);
  const [summary, setSummary] = useState<ExecutionSummary | null>(null);

  const handleLaunch = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setResults([]);
    setSummary(null);

    try {
      const { results: agentResults, summary: execSummary } = await executeAllAgents(prompt);
      const ranked = rankAgents(agentResults);
      setResults(ranked);
      setSummary(execSummary);
    } catch (error) {
      console.error('Execution failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="panel">
        <div className="hero">
          <div>
            <p className="eyebrow">Multi-Agent Orchestration</p>
            <h1>AWS Bedrock Agent Evaluator</h1>
            <p className="hero-copy">
              Run multiple AI agents in parallel across AWS infrastructure. Track execution traces,
              compare performance metrics, and rank agents based on latency, tool usage, and response quality.
            </p>
          </div>

          <div className="launch-form">
            <label htmlFor="prompt">Test Query</label>
            <textarea
              id="prompt"
              rows={5}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your query to test across all agents..."
            />
            <button onClick={handleLaunch} disabled={loading || !prompt.trim()}>
              {loading ? 'Executing Agents...' : 'Launch Agent Execution'}
            </button>
            <p className="form-note" style={{ margin: 0, fontSize: '0.82rem' }}>
              Executes 6 agents in parallel: Reasoning, Fast, Tool, RAG, Bad, Gardening
            </p>
          </div>
        </div>

        {summary && (
          <>
            <div className="execution-banner">
              <span>Execution ID: {summary.executionId}</span>
              <span className="capsule">{summary.totalAgents} agents</span>
              <span className="capsule">
                {summary.status === 'completed' ? 'Completed' : 'Running'}
              </span>
            </div>

            <div className="summary-grid">
              <div className="summary-card">
                <strong>{summary.totalAgents}</strong>
                <span>Total Agents</span>
              </div>
              <div className="summary-card tone-accent">
                <strong>{summary.successRate}%</strong>
                <span>Success Rate</span>
              </div>
              <div className="summary-card">
                <strong>{summary.avgLatency}ms</strong>
                <span>Avg Latency</span>
              </div>
              <div className="summary-card">
                <strong>{results.filter(r => r.toolsUsed > 0).length}</strong>
                <span>Agents Used Tools</span>
              </div>
            </div>
          </>
        )}
      </div>

      {loading && (
        <div className="panel loading-panel">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⚡</div>
            <h3>Executing agents in parallel via AWS Step Functions...</h3>
            <p className="hero-copy">Running 6 agents concurrently on Amazon Bedrock</p>
          </div>
        </div>
      )}

      {results.length > 0 && <Leaderboard results={results} />}

      {results.length > 0 && (
        <div className="panel trace-panel">
          <h2>Architecture Overview</h2>
          <div className="trace-list">
            <div className="trace-step">
              <div className="trace-marker">1</div>
              <div className="trace-body">
                <div className="trace-head">
                  <strong>API Gateway</strong>
                  <span className="status-pill status-completed">Active</span>
                </div>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  User submits query → triggers Lambda function → initiates Step Functions workflow
                </p>
              </div>
            </div>

            <div className="trace-step">
              <div className="trace-marker">2</div>
              <div className="trace-body">
                <div className="trace-head">
                  <strong>AWS Step Functions</strong>
                  <span className="status-pill status-completed">Parallel Execution</span>
                </div>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Map state spawns {summary?.totalAgents} parallel branches, each invoking Amazon Bedrock
                </p>
              </div>
            </div>

            <div className="trace-step">
              <div className="trace-marker">3</div>
              <div className="trace-body">
                <div className="trace-head">
                  <strong>Amazon Bedrock Agents</strong>
                  <span className="capsule">{results.filter(r => r.status === 'completed').length} succeeded</span>
                </div>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Each agent processes prompt with different strategies. X-Ray traces execution path.
                </p>
              </div>
            </div>

            <div className="trace-step">
              <div className="trace-marker">4</div>
              <div className="trace-body">
                <div className="trace-head">
                  <strong>Data Storage</strong>
                  <span className="status-pill status-completed">Persisted</span>
                </div>
                <div className="trace-entry">
                  <span>DynamoDB</span>
                  <code>Results: {results.length} records | Avg Score: {Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)}</code>
                </div>
                <div className="trace-entry">
                  <span>S3 Bucket</span>
                  <code>Trace files: agent-traces/{summary?.executionId}/*.json</code>
                </div>
              </div>
            </div>

            <div className="trace-step">
              <div className="trace-marker">5</div>
              <div className="trace-body">
                <div className="trace-head">
                  <strong>CloudWatch + X-Ray</strong>
                  <span className="status-pill status-completed">Monitored</span>
                </div>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Logs aggregated in CloudWatch. X-Ray service map shows cross-service latency breakdown.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
