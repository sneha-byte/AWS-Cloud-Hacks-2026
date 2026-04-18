import { motion } from 'motion/react';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  status?: 'normal' | 'warning' | 'critical';
  icon?: React.ReactNode;
}

export function MetricCard({ label, value, unit, status = 'normal', icon }: MetricCardProps) {
  const statusColors = {
    normal: 'from-lavender/10 to-amethyst-smoke/5 border-lavender/20',
    warning: 'from-amber-500/10 to-orange-500/5 border-amber-500/30',
    critical: 'from-red-500/20 to-red-600/10 border-red-500/40'
  };

  const textColors = {
    normal: 'text-lavender',
    warning: 'text-amber-400',
    critical: 'text-red-400'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${statusColors[status]} border backdrop-blur-xl p-6`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-lilac-ash text-sm uppercase tracking-wider font-medium">{label}</span>
          {icon && <div className="text-amethyst-smoke">{icon}</div>}
        </div>

        <div className="flex items-baseline gap-2">
          <motion.span
            className={`text-4xl font-bold ${textColors[status]}`}
            key={value}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {value}
          </motion.span>
          {unit && <span className="text-lg text-lilac-ash">{unit}</span>}
        </div>
      </div>
    </motion.div>
  );
}
