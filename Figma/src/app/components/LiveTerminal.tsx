import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TraceLog } from '../types/trace';

interface LiveTerminalProps {
  traces: TraceLog[];
}

function TypewriterText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
  }, [text]);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, delay + 15);

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, delay]);

  return <span>{displayedText}</span>;
}

export function LiveTerminal({ traces }: LiveTerminalProps) {
  const [expandedTrace, setExpandedTrace] = useState<string | null>(null);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-lilac-ash/20">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-amber-500/60" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
          </div>
          <span className="text-lavender font-mono text-sm">live_trace_terminal.log</span>
        </div>
        <div className="text-xs text-lilac-ash font-mono">
          {traces.length} events
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {traces.map((trace, index) => {
            const isExpanded = expandedTrace === trace.trace_id;
            const agentColor = trace.agent_id === 'claude' ? 'text-amber-400' : 'text-blue-400';
            const isLatest = index === traces.length - 1;

            return (
              <motion.div
                key={trace.trace_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.1 }}
                className={`relative p-4 rounded-lg border backdrop-blur-sm ${
                  trace.judge_evaluation.flagged
                    ? 'bg-red-950/20 border-red-500/30'
                    : 'bg-shadow-grey/30 border-lilac-ash/10'
                }`}
              >
                {trace.judge_evaluation.flagged && (
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute inset-0 border-2 border-red-500/30 rounded-lg pointer-events-none"
                  />
                )}

                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      className={`w-2 h-2 rounded-full ${agentColor.replace('text-', 'bg-')}`}
                    />
                    <span className={`font-mono text-sm font-bold ${agentColor}`}>
                      {trace.agent_id.toUpperCase()}
                    </span>
                    <span className="text-xs text-lilac-ash">
                      {new Date(trace.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-charcoal/50 text-amethyst-smoke">
                    {trace.event_phase}
                  </span>
                </div>

                <div className="space-y-3 font-mono text-sm">
                  <div>
                    <span className="text-emerald-400 font-bold">[OBSERVATION]</span>
                    <p className="text-lavender/90 mt-1 leading-relaxed">
                      {trace.agent_trace.observation}
                    </p>
                  </div>

                  <div>
                    <span className="text-amethyst-smoke font-bold">[THOUGHT]</span>
                    <p className="text-lavender/80 mt-1 leading-relaxed italic">
                      {isLatest ? (
                        <TypewriterText text={trace.agent_trace.thought} />
                      ) : (
                        trace.agent_trace.thought
                      )}
                    </p>
                  </div>

                  <div>
                    <span className="text-amber-400 font-bold">[ACTION]</span>
                    <p className="text-lavender/90 mt-1">
                      {trace.agent_trace.action}
                    </p>
                    <button
                      onClick={() => setExpandedTrace(isExpanded ? null : trace.trace_id)}
                      className="text-xs text-lilac-ash hover:text-lavender mt-1 underline"
                    >
                      {isExpanded ? 'Hide' : 'Show'} input →
                    </button>
                  </div>

                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-charcoal/40 rounded p-3 overflow-hidden"
                    >
                      <pre className="text-xs text-lavender/70 overflow-x-auto">
                        {JSON.stringify(trace.agent_trace.action_input, null, 2)}
                      </pre>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
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
