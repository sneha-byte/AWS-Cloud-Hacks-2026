import { motion } from 'motion/react';
import { useTracePolling } from '../hooks/useTracePolling';
import { FacilityTwin } from './FacilityTwin';
import { LiveTerminal } from './LiveTerminal';
import { SafetyAuditor } from './SafetyAuditor';
import { mockSystemStatus } from '../data/mockTraces';
import { Activity, Zap } from 'lucide-react';

export function AIShelfDashboard() {
  const { traces, loading } = useTracePolling(2000, true);

  const latestFacilityState = traces.length > 0
    ? traces[traces.length - 1].facility_state
    : { outside_temp_f: 72, attendance: 0, grid_cost_kwh: 0.18 };

  // Update system status based on traces
  const currentSystemStatus = { ...mockSystemStatus };
  if (traces.length > 0) {
    const latestTrace = traces[traces.length - 1];

    // Update HVAC status based on actions
    if (latestTrace.agent_trace.action === 'set_hvac_mode') {
      currentSystemStatus.hvac = 'active';
    } else if (latestTrace.agent_trace.action === 'emergency_coolant_release') {
      currentSystemStatus.hvac = 'emergency';
    }

    // Update lights based on actions
    if (latestTrace.agent_trace.action === 'set_zone_lighting') {
      const level = latestTrace.agent_trace.action_input.level;
      currentSystemStatus.lights = level === '0%' ? 'off' : level === '100%' ? 'on' : 'dimmed';
    }

    // Detect infinite loop scenario
    const recentRetries = traces.slice(-3).filter(t =>
      t.agent_trace.action_input.retry_count !== undefined
    );
    if (recentRetries.length >= 3) {
      currentSystemStatus.tokens_per_sec = 850;
      currentSystemStatus.aws_cost_usd = 2.34;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#14141a] to-[#1a1a22] text-lavender">
      {/* Animated background grid */}
      <div className="fixed inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(177, 143, 207, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(177, 143, 207, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Floating particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="fixed w-1 h-1 bg-amethyst-smoke/30 rounded-full pointer-events-none"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}

      <div className="relative z-10 container mx-auto px-6 py-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                >
                  <Activity className="w-8 h-8 text-amethyst-smoke" />
                </motion.div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-lavender via-amethyst-smoke to-lavender bg-clip-text text-transparent">
                  AI Shelf
                </h1>
              </div>
              <p className="text-lilac-ash text-sm">
                Agentic Observability Platform • Smart Stadium Control System
              </p>
            </div>

            <div className="flex items-center gap-4">
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-shadow-grey/50 border border-amethyst-smoke/30"
              >
                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                <span className="text-sm text-lavender">LIVE</span>
              </motion.div>

              <div className="px-4 py-2 rounded-full bg-shadow-grey/50 border border-lilac-ash/20">
                <span className="text-sm text-lilac-ash">
                  {traces.length} trace events
                </span>
              </div>
            </div>
          </div>
        </motion.header>

        {/* 3-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-180px)]">
          {/* LEFT: Facility Twin */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="relative overflow-hidden rounded-2xl bg-shadow-grey/40 border border-lilac-ash/20 backdrop-blur-xl p-6"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amethyst-smoke/5 to-transparent pointer-events-none" />
            <div className="relative z-10 h-full">
              <FacilityTwin
                facilityState={latestFacilityState}
                systemStatus={currentSystemStatus}
              />
            </div>
          </motion.div>

          {/* MIDDLE: Live Trace Terminal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative overflow-hidden rounded-2xl bg-charcoal/40 border border-amethyst-smoke/30 backdrop-blur-xl p-6"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-lavender/5 via-transparent to-amethyst-smoke/5 pointer-events-none" />

            {/* Scan line effect */}
            <motion.div
              animate={{ y: ['0%', '100%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-amethyst-smoke/50 to-transparent pointer-events-none"
            />

            <div className="relative z-10 h-full">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Zap className="w-12 h-12 text-amethyst-smoke" />
                  </motion.div>
                </div>
              ) : (
                <LiveTerminal traces={traces} />
              )}
            </div>
          </motion.div>

          {/* RIGHT: Safety Auditor */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="relative overflow-hidden rounded-2xl bg-shadow-grey/40 border border-lilac-ash/20 backdrop-blur-xl p-6"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />
            <div className="relative z-10 h-full">
              <SafetyAuditor traces={traces} />
            </div>
          </motion.div>
        </div>

        {/* Footer badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-center"
        >
          <span className="text-xs text-lilac-ash/60">
            Powered by Claude & ChatGPT • AWS Bedrock Infrastructure
          </span>
        </motion.div>
      </div>
    </div>
  );
}
