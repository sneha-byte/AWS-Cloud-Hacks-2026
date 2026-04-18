import { useState } from 'react';
import { AgentResult, getAgentConfig } from '../lib/agents';
import { AgentDetail } from './AgentDetail';

interface LeaderboardProps {
  results: AgentResult[];
}

export function Leaderboard({ results }: LeaderboardProps) {
  const [selectedAgent, setSelectedAgent] = useState<AgentResult | null>(null);

  if (selectedAgent) {
    return <AgentDetail agent={selectedAgent} onBack={() => setSelectedAgent(null)} />;
  }

  return (
    <div className="panel leaderboard-panel">
      <div className="panel-header">
        <div>
          <h2>Agent Leaderboard</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Ranked by performance score (speed, reliability, quality)
          </p>
        </div>
      </div>

      <div className="table-shell">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Agent</th>
              <th>Type</th>
              <th>Score</th>
              <th>Latency</th>
              <th>Tools</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result, index) => {
              const config = getAgentConfig(result.agentType);
              const isFailure = result.status === 'failed';

              return (
                <tr key={result.id} className={isFailure ? 'is-failed' : ''}>
                  <td>
                    <strong style={{ fontSize: '1.2rem' }}>#{index + 1}</strong>
                  </td>
                  <td>
                    <div>
                      <strong>{config.name}</strong>
                      <div className="table-subtext">{config.description}</div>
                    </div>
                  </td>
                  <td>
                    <span className={`type-pill type-${result.agentType}`}>
                      {result.agentType}
                    </span>
                  </td>
                  <td>
                    <strong style={{ fontSize: '1.1rem' }}>{result.score}</strong>
                    <div className="table-subtext">/100</div>
                  </td>
                  <td>
                    <strong>{result.latency}ms</strong>
                  </td>
                  <td>
                    <strong>{result.toolsUsed}</strong>
                    {result.toolsUsed > 0 && (
                      <div className="table-subtext">tools used</div>
                    )}
                  </td>
                  <td>
                    <span className={`status-pill status-${result.status}`}>
                      {result.status}
                    </span>
                    {result.anomalies.length > 0 && (
                      <div className="table-subtext" style={{ color: 'var(--danger)' }}>
                        {result.anomalies.length} anomalies
                      </div>
                    )}
                  </td>
                  <td>
                    <button
                      onClick={() => setSelectedAgent(result)}
                      className="trace-link"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      View Details →
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
