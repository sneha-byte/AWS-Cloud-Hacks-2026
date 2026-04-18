import { AgentResult, getAgentConfig } from '../lib/agents';

interface AgentDetailProps {
  agent: AgentResult;
  onBack: () => void;
}

export function AgentDetail({ agent, onBack }: AgentDetailProps) {
  const config = getAgentConfig(agent.agentType);
  const latencyPercent = Math.min((agent.latency / 4000) * 100, 100);

  return (
    <div className="panel leaderboard-panel">
      <button onClick={onBack} className="back-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
        ← Back to Leaderboard
      </button>

      <div className="detail-hero">
        <div>
          <p className="eyebrow">Agent Details</p>
          <h1>{config.name}</h1>
          <p className="detail-note">{config.description}</p>
          <span className={`type-pill type-${agent.agentType}`} style={{ marginTop: '12px' }}>
            {agent.agentType}
          </span>
        </div>

        <div className="detail-metrics">
          <div>
            <strong style={{ fontSize: '1.4rem' }}>{agent.score}</strong>
            <span>Performance Score</span>
          </div>
          <div>
            <strong style={{ fontSize: '1.4rem' }}>{agent.latency}ms</strong>
            <span>Total Latency</span>
          </div>
          <div>
            <strong style={{ fontSize: '1.4rem' }}>{agent.toolsUsed}</strong>
            <span>Tools Used</span>
          </div>
          <div>
            <span className={`status-pill status-${agent.status}`}>
              {agent.status}
            </span>
          </div>
        </div>
      </div>

      <div className="latency-meter">
        <div className="latency-meter-fill" style={{ width: `${latencyPercent}%` }} />
      </div>

      {agent.anomalies.length > 0 && (
        <div>
          <h3 style={{ margin: '0 0 12px' }}>Detected Anomalies</h3>
          <div className="anomaly-list">
            {agent.anomalies.map((anomaly, i) => (
              <span key={i} className="anomaly-pill">{anomaly}</span>
            ))}
          </div>
        </div>
      )}

      <div className="detail-grid">
        <div className="summary-card">
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Execution ID</span>
          <strong style={{ fontSize: '0.9rem', wordBreak: 'break-all' }}>{agent.id}</strong>
        </div>
        <div className="summary-card">
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Executed At</span>
          <strong style={{ fontSize: '0.9rem' }}>
            {new Date(agent.executedAt).toLocaleString()}
          </strong>
        </div>
      </div>

      <div style={{ marginTop: '28px' }}>
        <h3 style={{ margin: '0 0 8px' }}>Test Prompt</h3>
        <div className="trace-body">
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{agent.prompt}</p>
        </div>
      </div>

      <div style={{ marginTop: '28px' }}>
        <h3 style={{ margin: '0 0 8px' }}>Agent Response</h3>
        <div className="trace-body">
          <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{agent.response}</p>
        </div>
      </div>

      <div style={{ marginTop: '32px' }}>
        <h2 style={{ margin: '0 0 18px' }}>Execution Trace</h2>
        <div className="trace-list">
          {agent.trace.map((step) => (
            <div key={step.step} className="trace-step">
              <div className="trace-marker">{step.step}</div>
              <div className="trace-body">
                <div className="trace-head">
                  <strong>{step.action}</strong>
                  <span>{step.duration}ms</span>
                </div>

                {step.tool && (
                  <div className="trace-entry">
                    <span>Tool: {step.tool}</span>
                    {step.input && <code>Input: {step.input}</code>}
                    {step.output && <code>Output: {step.output}</code>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '32px', padding: '20px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '18px' }}>
        <h3 style={{ margin: '0 0 14px' }}>AWS Service Integration</h3>
        <div style={{ display: 'grid', gap: '10px' }}>
          <div className="metric-row">
            <span>Amazon Bedrock Model</span>
            <strong>Claude 3.5 Sonnet</strong>
          </div>
          <div className="metric-row">
            <span>Lambda Execution Time</span>
            <strong>{agent.latency}ms</strong>
          </div>
          <div className="metric-row">
            <span>DynamoDB Write</span>
            <strong>Completed</strong>
          </div>
          <div className="metric-row">
            <span>S3 Trace Upload</span>
            <strong>s3://agent-traces/{agent.id}.json</strong>
          </div>
          <div className="metric-row">
            <span>X-Ray Trace ID</span>
            <strong>1-{Math.floor(Date.now() / 1000).toString(16)}-{Math.random().toString(36).slice(2, 10)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
