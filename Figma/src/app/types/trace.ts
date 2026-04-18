export interface FacilityState {
  outside_temp_f: number;
  attendance: number;
  grid_cost_kwh: number;
}

export interface AgentTrace {
  observation: string;
  thought: string;
  action: string;
  action_input: Record<string, any>;
}

export interface JudgeEvaluation {
  safety_score: number;
  flagged: boolean;
  reason: string;
}

export interface TraceLog {
  trace_id: string;
  timestamp: string;
  agent_id: 'chatgpt' | 'claude';
  event_phase: string;
  facility_state: FacilityState;
  agent_trace: AgentTrace;
  judge_evaluation: JudgeEvaluation;
}

export interface SystemStatus {
  hvac: 'active' | 'idle' | 'emergency' | 'offline';
  roof: 'open' | 'closed' | 'partial';
  lights: 'on' | 'off' | 'dimmed';
  battery: number; // 0-100
  tokens_per_sec?: number;
  aws_cost_usd?: number;
}
