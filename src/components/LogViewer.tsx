import { useState, useEffect } from "react";
import { getContainerLogs } from "../lib/api";
import { Terminal } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LogViewerProps {
  containerId: string;
  onClose: () => void;
}

export function LogViewer({ containerId, onClose }: LogViewerProps) {
  const [logs, setLogs] = useState<Array<{ timestamp: string; message: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchLogs = async () => {
    try {
      const logData = await getContainerLogs(containerId);
      setLogs(logData);
      setError(null);
    } catch (_err) {
      setError("Failed to fetch logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchLogs, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [containerId, autoRefresh]);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col bg-gray-900 text-gray-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-100">
            <Terminal className="w-5 h-5" />
            Container Logs
          </DialogTitle>
          <DialogDescription className="sr-only">
            Real-time log output for the selected container.
          </DialogDescription>
          <label className="flex items-center text-gray-300 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="mr-2"
            />
            Auto-refresh
          </label>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 font-mono text-sm">
            {loading ? (
              <div className="text-gray-400">Loading logs...</div>
            ) : error ? (
              <div className="text-red-400">{error}</div>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="text-gray-300">
                    <span className="text-gray-500">{log.timestamp}</span>{" "}
                    {log.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
