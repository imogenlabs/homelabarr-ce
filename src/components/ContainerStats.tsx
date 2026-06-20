import { useEffect } from 'react';
import { Cpu, HardDrive, Network, Clock } from 'lucide-react';

interface ContainerStatsProps {
  stats: {
    cpu: number;
    memory: {
      usage: number;
      limit: number;
      percentage: number;
    };
    network: Record<string, {
      rx_bytes: number;
      tx_bytes: number;
    }>;
    uptime: number; // in seconds
  };
}

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getUptimeColor(seconds: number): string {
  const days = seconds / (24 * 60 * 60);
  if (days >= 30) return 'text-green-500 dark:text-green-400';
  if (days >= 7) return 'text-emerald-500 dark:text-emerald-400';
  if (days >= 1) return 'text-yellow-500 dark:text-yellow-400';
  return 'text-orange-500 dark:text-orange-400';
}

function getUptimeLabel(seconds: number): string {
  const days = seconds / (24 * 60 * 60);
  if (days >= 90) return 'Excellent';
  if (days >= 30) return 'Stable';
  if (days >= 7) return 'Good';
  if (days >= 1) return 'Recent';
  return 'Just started';
}

function useStatsHistory() {
  const updateHistory = (stats: ContainerStatsProps['stats']) => {
    // History tracking — will be implemented with charts in a future update
    void stats;
  };
  return { updateHistory };
}

export function ContainerStats({ stats }: ContainerStatsProps) {
  const { updateHistory } = useStatsHistory();

  useEffect(() => {
    updateHistory(stats);
  }, [stats]);

  const totalNetwork = Object.values(stats.network).reduce(
    (acc, { rx_bytes, tx_bytes }) => ({
      rx: acc.rx + rx_bytes,
      tx: acc.tx + tx_bytes,
    }),
    { rx: 0, tx: 0 }
  );

  const uptimeColor = getUptimeColor(stats.uptime);
  const uptimeLabel = getUptimeLabel(stats.uptime);

  return (
    <div className="space-y-3 p-4 bg-muted/50 dark:bg-muted/20 rounded-lg">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* CPU Usage */}
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-secondary rounded-lg">
            <Cpu className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">CPU</div>
            <div className="text-sm font-semibold">{stats.cpu.toFixed(1)}%</div>
          </div>
        </div>

        {/* Memory Usage */}
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
            <HardDrive className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">Memory</div>
            <div className="text-sm font-semibold">
              {stats.memory.percentage.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">
              {formatBytes(stats.memory.usage)} / {formatBytes(stats.memory.limit)}
            </div>
          </div>
        </div>

        {/* Network Usage */}
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-secondary rounded-lg">
            <Network className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">Network</div>
            <div className="text-sm font-semibold">
              <span className="text-green-500">↓</span> {formatBytes(totalNetwork.rx)}
            </div>
            <div className="text-sm font-semibold">
              <span className="text-red-500">↑</span> {formatBytes(totalNetwork.tx)}
            </div>
          </div>
        </div>

        {/* Uptime */}
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-secondary rounded-lg">
            <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">Uptime</div>
            <div className={`text-sm font-semibold ${uptimeColor}`}>
              {formatUptime(stats.uptime)}
            </div>
            <div className="text-xs text-muted-foreground">{uptimeLabel}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
