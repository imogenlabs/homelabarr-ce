import React, { useState } from "react";
import { Lock, User, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { success, error } = useNotifications();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      error("Missing Credentials", "Please enter both username and password");
      return;
    }
    setLoading(true);
    try {
      await login(username, password);
      success("Login Successful", `Welcome back, ${username}!`);
      onClose();
      setUsername("");
      setPassword("");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      error("Login Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
              <Lock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">Sign In to HomelabARR</DialogTitle>
          <DialogDescription className="sr-only">
            Enter your username and password to sign in to the HomelabARR dashboard.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="login-username">Username</Label>
            <div className="relative mt-1">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10"
                placeholder="Enter your username"
                disabled={loading}
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="login-password">Password</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
                placeholder="Enter your password"
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {loading ? "Signing In..." : "Sign In"}
            </Button>
          </DialogFooter>
        </form>

        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/50 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Default credentials:</strong><br />
            Username: admin<br />
            Password: admin<br />
            <em>Please change the default password after first login!</em>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
