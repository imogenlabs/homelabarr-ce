import { useState, useEffect } from "react";
import { Key, Copy, Check, Trash2, Plus, Loader2, Smartphone, AlertTriangle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface ApiKey {
  id: string;
  keyPreview: string;
  label: string;
  createdAt: string;
  lastUsed: string | null;
}

interface ApiKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApiKeysModal({ isOpen, onClose }: ApiKeysModalProps) {
  const { token } = useAuth();
  const { success, error } = useNotifications();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState("Mobile App");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const fetchKeys = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/api-keys", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setKeys(data.apiKeys || []);
      }
    } catch {
      error("Error", "Failed to load API keys");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchKeys();
      setNewKey(null);
      setShowCreate(false);
    }
  }, [isOpen]);

  const createKey = async () => {
    if (!token) return;
    setCreating(true);
    try {
      const res = await fetch("/api/auth/api-keys", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ label: newLabel }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewKey(data.key);
        success("API Key Created", "Copy it now — it won't be shown again.");
        fetchKeys();
      } else {
        error("Error", "Failed to create API key");
      }
    } catch {
      error("Error", "Failed to create API key");
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (keyId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/auth/api-keys/${keyId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        success("Revoked", "API key has been revoked");
        fetchKeys();
      }
    } catch {
      error("Error", "Failed to revoke API key");
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-full">
              <Key className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">API Keys</DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            Generate keys for the HomelabARR mobile app or third-party integrations
          </DialogDescription>
        </DialogHeader>

        {/* New key display */}
        {newKey && (
          <Card className="p-4 border-emerald-500/50 bg-emerald-50 dark:bg-emerald-900/20">
            <div className="flex items-start gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                Copy this key now — it won't be shown again
              </p>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <code className="flex-1 text-xs bg-black/10 dark:bg-black/30 px-3 py-2 rounded font-mono break-all">
                {newKey}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(newKey)}
                className="shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </Card>
        )}

        {/* Key list */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : keys.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Smartphone className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No API keys yet</p>
              <p className="text-xs mt-1">Create one to connect the mobile app</p>
            </div>
          ) : (
            keys.map((k) => (
              <Card key={k.id} className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{k.label}</span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {k.keyPreview}
                    </Badge>
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                    <span>Created {timeAgo(k.createdAt)}</span>
                    {k.lastUsed && <span>Used {timeAgo(k.lastUsed)}</span>}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => revokeKey(k.id)}
                  className="shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </Card>
            ))
          )}
        </div>

        {/* Create form */}
        {showCreate ? (
          <div className="flex gap-2">
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Key label (e.g. iPhone, Tablet)"
              className="flex-1"
            />
            <Button onClick={createKey} disabled={creating}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => setShowCreate(true)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            Generate New Key
          </Button>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
