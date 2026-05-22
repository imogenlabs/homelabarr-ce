import { useState } from 'react';
import { Play, Square, RefreshCw, Trash2 } from 'lucide-react';
import { startContainer, stopContainer, restartContainer, removeContainer } from '../lib/api';
import { useNotifications } from '../contexts/NotificationContext';
import { Button } from "@/components/ui/button";

interface ContainerControlsProps {
  containerId: string;
  status: string;
  onAction: () => void;
}

export function ContainerControls({ containerId, status, onAction }: ContainerControlsProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const { success, error } = useNotifications();

  const handleAction = async (
    action: () => Promise<any>, 
    actionName: string,
    successMessage: string
  ) => {
    setLoadingAction(actionName);
    try {
      await action();
      success('Action Completed', successMessage);
      onAction();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      error(`Failed to ${actionName}`, errorMessage);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="flex space-x-1">
      {status !== 'running' && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => handleAction(
            () => startContainer(containerId),
            'start',
            'Container started successfully'
          )}
          disabled={loadingAction === 'start'}
          title="Start"
          className="text-green-600 hover:text-green-800 hover:bg-green-50 dark:hover:bg-green-900/30"
        >
          <Play className={`w-4 h-4 ${loadingAction === 'start' ? 'animate-pulse' : ''}`} />
        </Button>
      )}
      {status === 'running' && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => handleAction(
            () => stopContainer(containerId),
            'stop',
            'Container stopped successfully'
          )}
          disabled={loadingAction === 'stop'}
          title="Stop"
          className="text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/30"
        >
          <Square className={`w-4 h-4 ${loadingAction === 'stop' ? 'animate-pulse' : ''}`} />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => handleAction(
          () => restartContainer(containerId),
          'restart',
          'Container restarted successfully'
        )}
        disabled={loadingAction === 'restart'}
        title="Restart"
        className="text-muted-foreground hover:text-foreground hover:bg-accent"
      >
        <RefreshCw className={`w-4 h-4 ${loadingAction === 'restart' ? 'animate-spin' : ''}`} />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => handleAction(
          () => removeContainer(containerId),
          'remove',
          'Container removed successfully'
        )}
        disabled={loadingAction === 'remove'}
        title="Remove"
        className="text-muted-foreground hover:text-foreground hover:bg-accent"
      >
        <Trash2 className={`w-4 h-4 ${loadingAction === 'remove' ? 'animate-pulse' : ''}`} />
      </Button>
    </div>
  );
}
