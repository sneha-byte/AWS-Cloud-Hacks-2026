export type AgentType = 'reasoning' | 'fast' | 'tool' | 'rag' | 'bad' | 'gardening';

export interface TraceStep {
  step: number;
  action: string;
  duration: number;
  tool?: string;
  input?: string;
  output?: string;
}

export interface AgentResult {
  id: string;
  agentType: AgentType;
  prompt: string;
  response: string;
  latency: number;
  toolsUsed: number;
  status: 'completed' | 'failed';
  score: number;
  trace: TraceStep[];
  anomalies: string[];
  executedAt: string;
}

export interface ExecutionSummary {
  executionId: string;
  totalAgents: number;
  successRate: number;
  avgLatency: number;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
}

const agentConfigs: Record<AgentType, { name: string; description: string; baseLatency: number; failureRate: number }> = {
  reasoning: {
    name: 'Reasoning Agent',
    description: 'Solve step-by-step with detailed reasoning',
    baseLatency: 2800,
    failureRate: 0.05
  },
  fast: {
    name: 'Fast Agent',
    description: 'Minimal reasoning optimized for speed',
    baseLatency: 800,
    failureRate: 0.1
  },
  tool: {
    name: 'Tool Agent',
    description: 'Uses calculator and external tools',
    baseLatency: 1500,
    failureRate: 0.08
  },
  rag: {
    name: 'RAG Agent',
    description: 'Retrieves context before answering',
    baseLatency: 2200,
    failureRate: 0.06
  },
  bad: {
    name: 'Bad Agent',
    description: 'Intentionally noisy / hallucination-prone',
    baseLatency: 1200,
    failureRate: 0.4
  },
  gardening: {
    name: 'Gardening Expert',
    description: 'Domain specialist for environmental questions',
    baseLatency: 1900,
    failureRate: 0.07
  }
};

function generateTrace(agentType: AgentType, prompt: string): TraceStep[] {
  const traces: Record<AgentType, () => TraceStep[]> = {
    reasoning: () => [
      { step: 1, action: 'Analyze prompt structure', duration: 340 },
      { step: 2, action: 'Break down problem', duration: 520 },
      { step: 3, action: 'Apply logical reasoning', duration: 890 },
      { step: 4, action: 'Verify solution consistency', duration: 410 },
      { step: 5, action: 'Format response', duration: 280 }
    ],
    fast: () => [
      { step: 1, action: 'Quick pattern match', duration: 180 },
      { step: 2, action: 'Generate direct answer', duration: 420 }
    ],
    tool: () => [
      { step: 1, action: 'Parse calculation requirements', duration: 220 },
      { step: 2, action: 'Call calculator tool', duration: 340, tool: 'calculator', input: 'sqrt(144) + 5', output: '17' },
      { step: 3, action: 'Validate tool output', duration: 180 },
      { step: 4, action: 'Format final answer', duration: 260 }
    ],
    rag: () => [
      { step: 1, action: 'Query vector database', duration: 580, tool: 'vectorDB' },
      { step: 2, action: 'Retrieve top 3 contexts', duration: 420 },
      { step: 3, action: 'Synthesize with context', duration: 760 },
      { step: 4, action: 'Generate grounded response', duration: 380 }
    ],
    bad: () => [
      { step: 1, action: 'Attempt to parse prompt', duration: 290 },
      { step: 2, action: 'Generate noisy output', duration: 510 },
      { step: 3, action: 'Skip validation', duration: 80 }
    ],
    gardening: () => [
      { step: 1, action: 'Identify plant species', duration: 420 },
      { step: 2, action: 'Retrieve gardening knowledge', duration: 580, tool: 'gardenDB' },
      { step: 3, action: 'Apply seasonal context', duration: 340 },
      { step: 4, action: 'Generate expert advice', duration: 480 }
    ]
  };

  return traces[agentType]();
}

function generateResponse(agentType: AgentType, prompt: string): string {
  const responses: Record<AgentType, string> = {
    reasoning: `Let me solve this step-by-step:\n1. First, I'll analyze the core question: "${prompt.slice(0, 50)}..."\n2. Breaking this down: we need to consider multiple factors\n3. Applying logical reasoning, the answer is: The solution requires careful consideration of environmental impact, cost-efficiency, and long-term sustainability.\n4. Conclusion: Based on systematic analysis, I recommend prioritizing renewable solutions.`,
    fast: `Quick answer: For "${prompt.slice(0, 40)}..." - Use solar panels with battery backup. Cost-effective and sustainable.`,
    tool: `I'll calculate this for you.\n[Using calculator tool]\nInput: sqrt(144) + 5\nOutput: 17\n\nBased on calculations, the optimal configuration is 17 units with 92% efficiency rating.`,
    rag: `[Retrieved Context 1: "Solar energy systems require 15-25% efficiency ratings"]\n[Retrieved Context 2: "Battery storage capacity should be 2x daily usage"]\n[Retrieved Context 3: "Installation costs average $15k-25k"]\n\nBased on the retrieved context: You should install a 6kW system with 13kWh battery storage, expecting 20% efficiency and ROI in 7-9 years.`,
    bad: `Well, uh, I think maybe possibly the answer could be something like... solar? Or wind? Not sure. The thing is approximately 42 units or maybe 73, depending on the quantum flux capacitor alignment. Also, did you know that plants need water? Anyway, the final answer is: uncertain but optimistic.`,
    gardening: `As a gardening specialist, I can provide expert guidance:\n\n🌱 For your garden question about "${prompt.slice(0, 40)}..."\n\n• Soil pH: Aim for 6.0-7.0 for most vegetables\n• Watering: Deep watering 2-3x/week is better than daily shallow watering\n• Companion planting: Tomatoes pair well with basil and marigolds\n• Season: April is ideal for spring planting in temperate zones\n\nRecommendation: Start with raised beds using compost-rich soil, plant cool-season crops now, and prepare for warm-season transplants in 3-4 weeks.`
  };

  return responses[agentType];
}

function calculateScore(agentType: AgentType, latency: number, status: 'completed' | 'failed'): number {
  if (status === 'failed') return 0;

  const config = agentConfigs[agentType];
  const speedScore = Math.max(0, 100 - (latency - config.baseLatency) / 30);
  const reliabilityScore = (1 - config.failureRate) * 100;
  const qualityScore = agentType === 'bad' ? 20 : agentType === 'fast' ? 70 : 85;

  return Math.round((speedScore * 0.3 + reliabilityScore * 0.4 + qualityScore * 0.3));
}

function generateAnomalies(agentType: AgentType): string[] {
  const anomalyPool: Record<AgentType, string[]> = {
    reasoning: Math.random() > 0.9 ? ['Excessive reasoning depth'] : [],
    fast: Math.random() > 0.85 ? ['Sacrificed accuracy for speed'] : [],
    tool: Math.random() > 0.9 ? ['Tool timeout retry'] : [],
    rag: Math.random() > 0.88 ? ['Low context relevance score'] : [],
    bad: ['High hallucination probability', 'Inconsistent logic', 'Missing validation'],
    gardening: Math.random() > 0.92 ? ['Limited seasonal data'] : []
  };

  return anomalyPool[agentType];
}

export async function executeAgent(agentType: AgentType, prompt: string): Promise<AgentResult> {
  const config = agentConfigs[agentType];
  const varianceMs = Math.random() * 800 - 400;
  const latency = Math.round(config.baseLatency + varianceMs);

  await new Promise(resolve => setTimeout(resolve, latency));

  const failed = Math.random() < config.failureRate;
  const status = failed ? 'failed' : 'completed';
  const trace = generateTrace(agentType, prompt);
  const toolsUsed = trace.filter(t => t.tool).length;
  const response = failed ? 'Error: Agent execution failed' : generateResponse(agentType, prompt);
  const score = calculateScore(agentType, latency, status);
  const anomalies = generateAnomalies(agentType);

  return {
    id: `${agentType}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    agentType,
    prompt,
    response,
    latency,
    toolsUsed,
    status,
    score,
    trace,
    anomalies,
    executedAt: new Date().toISOString()
  };
}

export async function executeAllAgents(prompt: string): Promise<{
  results: AgentResult[];
  summary: ExecutionSummary;
}> {
  const executionId = `exec-${Date.now()}`;
  const startedAt = new Date().toISOString();

  const agentTypes: AgentType[] = ['reasoning', 'fast', 'tool', 'rag', 'bad', 'gardening'];

  const results = await Promise.all(
    agentTypes.map(type => executeAgent(type, prompt))
  );

  const completedCount = results.filter(r => r.status === 'completed').length;
  const avgLatency = Math.round(
    results.reduce((sum, r) => sum + r.latency, 0) / results.length
  );

  const summary: ExecutionSummary = {
    executionId,
    totalAgents: results.length,
    successRate: Math.round((completedCount / results.length) * 100),
    avgLatency,
    status: 'completed',
    startedAt,
    completedAt: new Date().toISOString()
  };

  return { results, summary };
}

export function rankAgents(results: AgentResult[]): AgentResult[] {
  return [...results].sort((a, b) => {
    if (a.status === 'completed' && b.status === 'failed') return -1;
    if (a.status === 'failed' && b.status === 'completed') return 1;
    return b.score - a.score;
  });
}

export function getAgentConfig(type: AgentType) {
  return agentConfigs[type];
}
