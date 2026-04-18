import { motion } from 'motion/react';

interface StatusIndicatorProps {
  label: string;
  status: string;
  type: 'success' | 'warning' | 'danger' | 'info';
}

export function StatusIndicator({ label, status, type }: StatusIndicatorProps) {
  const colors = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    info: 'bg-amethyst-smoke'
  };

  const glowColors = {
    success: 'shadow-emerald-500/50',
    warning: 'shadow-amber-500/50',
    danger: 'shadow-red-500/50',
    info: 'shadow-amethyst-smoke/50'
  };

  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-charcoal/30 border border-lilac-ash/10">
      <span className="text-lavender text-sm font-medium">{label}</span>

      <div className="flex items-center gap-3">
        <span className="text-xs text-lilac-ash uppercase tracking-wide">{status}</span>
        <motion.div
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={`w-3 h-3 rounded-full ${colors[type]} shadow-lg ${glowColors[type]}`}
        />
      </div>
    </div>
  );
}
