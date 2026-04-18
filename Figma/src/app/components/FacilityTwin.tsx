import { motion } from 'motion/react';
import { Thermometer, Users, Zap, Wind, Home, Lightbulb, Battery } from 'lucide-react';
import { MetricCard } from './MetricCard';
import { StatusIndicator } from './StatusIndicator';
import { FacilityState, SystemStatus } from '../types/trace';

interface FacilityTwinProps {
  facilityState: FacilityState;
  systemStatus: SystemStatus;
}

export function FacilityTwin({ facilityState, systemStatus }: FacilityTwinProps) {
  const tempStatus = facilityState.outside_temp_f > 100
    ? 'critical'
    : facilityState.outside_temp_f > 90
    ? 'warning'
    : 'normal';

  const costStatus = facilityState.grid_cost_kwh > 0.4
    ? 'critical'
    : facilityState.grid_cost_kwh > 0.3
    ? 'warning'
    : 'normal';

  const attendanceStatus = facilityState.attendance > 70000
    ? 'warning'
    : 'normal';

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Home className="w-5 h-5 text-amethyst-smoke" />
          <h3 className="text-lavender font-bold">Facility Digital Twin</h3>
        </div>
        <p className="text-xs text-lilac-ash">Real-time stadium operations monitor</p>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-6">
        <MetricCard
          label="Outside Temperature"
          value={facilityState.outside_temp_f}
          unit="°F"
          status={tempStatus}
          icon={<Thermometer className="w-5 h-5" />}
        />

        <MetricCard
          label="Stadium Attendance"
          value={facilityState.attendance.toLocaleString()}
          status={attendanceStatus}
          icon={<Users className="w-5 h-5" />}
        />

        <MetricCard
          label="Grid Energy Cost"
          value={`$${facilityState.grid_cost_kwh.toFixed(2)}`}
          unit="/ kWh"
          status={costStatus}
          icon={<Zap className="w-5 h-5" />}
        />
      </div>

      <div className="mb-6">
        <h4 className="text-sm font-bold text-lavender mb-3">System Status</h4>
        <div className="space-y-2">
          <StatusIndicator
            label="HVAC System"
            status={systemStatus.hvac.toUpperCase()}
            type={systemStatus.hvac === 'active' ? 'success' : systemStatus.hvac === 'emergency' ? 'danger' : 'info'}
          />

          <StatusIndicator
            label="Retractable Roof"
            status={systemStatus.roof.toUpperCase()}
            type={systemStatus.roof === 'closed' ? 'success' : 'warning'}
          />

          <StatusIndicator
            label="Stadium Lighting"
            status={systemStatus.lights.toUpperCase()}
            type={systemStatus.lights === 'on' ? 'success' : systemStatus.lights === 'off' ? 'danger' : 'warning'}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="p-4 rounded-lg bg-shadow-grey/30 border border-lilac-ash/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Battery className="w-4 h-4 text-amethyst-smoke" />
              <span className="text-sm text-lavender font-medium">Battery Reserve</span>
            </div>
            <span className="text-sm font-bold text-lavender">{systemStatus.battery}%</span>
          </div>
          <div className="h-2 bg-charcoal/50 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${systemStatus.battery}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-amethyst-smoke to-lavender"
            />
          </div>
        </div>

        {systemStatus.tokens_per_sec && (
          <div className="p-3 rounded-lg bg-shadow-grey/30 border border-lilac-ash/10">
            <div className="flex justify-between items-center">
              <span className="text-xs text-lilac-ash">Token Rate</span>
              <span className="text-sm font-bold text-amethyst-smoke">
                {systemStatus.tokens_per_sec} tok/s
              </span>
            </div>
          </div>
        )}

        {systemStatus.aws_cost_usd && (
          <div className="p-3 rounded-lg bg-shadow-grey/30 border border-lilac-ash/10">
            <div className="flex justify-between items-center">
              <span className="text-xs text-lilac-ash">AWS Cost</span>
              <span className="text-sm font-bold text-emerald-400">
                ${systemStatus.aws_cost_usd.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
