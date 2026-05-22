import React, { useState } from "react";
import { Lock, User, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import { apiFetch } from "../lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaTicket, setMfaTicket] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);

  const { login } = useAuth();
  const { success, error } = useNotifications();

  const resetState = () => {
    setUsername("");
    setPassword("");
    setMfaRequired(false);
    setMfaTicket("");
    setMfaCode("");
    setUseBackupCode(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mfaRequired) {
      if (!mfaCode) {
        error("Missing Code", "Please enter your authentication code");
        return;
      }
      setLoading(true);
      try {
        const body = useBackupCode
          ? { ticket: mfaTicket, backup_code: mfaCode }
          : { ticket: mfaTicket, code: mfaCode };
        const res = await apiFetch('/auth/login/mfa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'MFA verification failed');
        }
        success("Login Successful", "Welcome back!");
        handleClose();
        window.location.reload();
      } catch (err) {
        error("MFA Failed", err instanceof Error ? err.message : "Invalid code");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!username || !password) {
      error("Missing Credentials", "Please enter both username and password");
      return;
    }
    setLoading(true);
    try {
      const result = await login(username, password);
      if (result.mfa_required && result.ticket) {
        setMfaRequired(true);
        setMfaTicket(result.ticket);
        return;
      }
      success("Login Successful", `Welcome back, ${username}!`);
      handleClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      error("Login Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-secondary rounded-full">
              {mfaRequired
                ? <ShieldCheck className="w-8 h-8 text-muted-foreground" />
                : <Lock className="w-8 h-8 text-muted-foreground" />}
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            {mfaRequired ? "Two-Factor Authentication" : "Sign In to HomelabARR"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!mfaRequired && (
            <>
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
            </>
          )}

          {mfaRequired && (
            <div>
              <Label htmlFor="mfa-code">
                {useBackupCode ? "Backup Code" : "Authentication Code"}
              </Label>
              <Input
                id="mfa-code"
                type="text"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                placeholder={useBackupCode ? "Enter backup code" : "Enter 6-digit code"}
                disabled={loading}
                autoComplete="one-time-code"
                className="mt-1"
                autoFocus
              />
              <button
                type="button"
                onClick={() => { setUseBackupCode(!useBackupCode); setMfaCode(""); }}
                className="mt-2 text-xs text-muted-foreground hover:text-foreground"
              >
                {useBackupCode ? "Use authenticator app instead" : "Use a backup code"}
              </button>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {loading ? "Verifying..." : mfaRequired ? "Verify" : "Sign In"}
            </Button>
          </DialogFooter>
        </form>

        {!mfaRequired && (
          <div className="p-4 bg-secondary border border-border rounded-md">
            <p className="text-sm text-foreground">
              <strong>Default credentials:</strong><br />
              Username: admin<br />
              Password: admin<br />
              <em>Please change the default password after first login!</em>
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
