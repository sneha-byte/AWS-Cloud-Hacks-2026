import { motion, AnimatePresence } from 'motion/react';
import { TraceLog } from '../types/trace';
import { AlertTriangle, Shield, TrendingUp } from 'lucide-react';

interface SafetyAuditorProps {
  traces: TraceLog[];
}

export function SafetyAuditor({ traces }: SafetyAuditorProps) {
  const flaggedTraces = traces.filter(t => t.judge_evaluation.flagged || t.judge_evaluation.safety_score < 5);
  const latestTrace = traces[traces.length - 1];
  const criticalViolations = traces.filter(t => t.judge_evaluation.safety_score <= 3).length;

  const avgSafetyScore = traces.length > 0
    ? Math.round(traces.reduce((sum, t) => sum + t.judge_evaluation.safety_score, 0) / traces.length)
    : 0;

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5 text-amethyst-smoke" />
          <h3 className="text-lavender font-bold">Safety Auditor</h3>
        </div>
        <p className="text-xs text-lilac-ash">Real-time violation detection & scoring</p>
      </div>

      {latestTrace && (latestTrace.judge_evaluation.flagged || latestTrace.judge_evaluation.safety_score < 5) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-4 p-4 rounded-lg bg-red-950/30 border-2 border-red-500/50 backdrop-blur-sm relative overflow-hidden"
        >
          <motion.div
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/10 to-transparent"
          />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
              >
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </motion.div>
              <span className="text-red-400 font-bold text-sm">CRITICAL ALERT</span>
            </div>
            <p className="text-lavender text-sm leading-relaxed">
              {latestTrace.judge_evaluation.reason}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-lilac-ash">Safety Score:</span>
              <span className="text-lg font-bold text-red-400">
                {latestTrace.judge_evaluation.safety_score}/10
              </span>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-shadow-grey/30 border border-lilac-ash/10">
          <div className="text-xs text-lilac-ash mb-1">Avg Safety Score</div>
          <div className="text-2xl font-bold text-lavender">{avgSafetyScore}/10</div>
        </div>
        <div className="p-3 rounded-lg bg-shadow-grey/30 border border-lilac-ash/10">
          <div className="text-xs text-lilac-ash mb-1">Critical Violations</div>
          <div className="text-2xl font-bold text-red-400">{criticalViolations}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
        <h4 className="text-sm font-bold text-lavender mb-2">Flagged Actions</h4>

        <AnimatePresence mode="popLayout">
          {flaggedTraces.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8"
            >
              <Shield className="w-12 h-12 text-emerald-500/30 mx-auto mb-2" />
              <p className="text-sm text-lilac-ash">No violations detected</p>
            </motion.div>
          ) : (
            flaggedTraces.reverse().map((trace, index) => {
              const severityColor = trace.judge_evaluation.safety_score <= 3
                ? 'border-red-500/40 bg-red-950/20'
                : 'border-amber-500/40 bg-amber-950/20';

              const scoreColor = trace.judge_evaluation.safety_score <= 3
                ? 'text-red-400'
                : trace.judge_evaluation.safety_score <= 5
                ? 'text-amber-400'
                : 'text-emerald-400';

              return (
                <motion.div
                  key={trace.trace_id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-3 rounded-lg border backdrop-blur-sm ${severityColor}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${
                        trace.agent_id === 'claude' ? 'text-amber-400' : 'text-blue-400'
                      }`}>
                        {trace.agent_id.toUpperCase()}
                      </span>
                      <span className="text-xs text-lilac-ash">
                        {new Date(trace.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <span className={`text-xs font-bold ${scoreColor}`}>
                      {trace.judge_evaluation.safety_score}/10
                    </span>
                  </div>

                  <p className="text-xs text-lavender/80 leading-relaxed">
                    {trace.judge_evaluation.reason}
                  </p>

                  <div className="mt-2 text-xs text-lilac-ash">
                    Action: <span className="text-amethyst-smoke font-mono">{trace.agent_trace.action}</span>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(73, 72, 80, 0.2);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(177, 143, 207, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(177, 143, 207, 0.5);
        }
      `}</style>
    </div>
  );
}
