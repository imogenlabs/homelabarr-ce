import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, Loader2, ShieldCheck, Rocket, Globe, Layout, Smartphone, Github, Terminal } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { apiFetch } from '../lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from './ThemeToggle';

export function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaTicket, setMfaTicket] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);

  const { login } = useAuth();
  const { success, error } = useNotifications();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mfaRequired) {
      if (!mfaCode) { error('Missing Code', 'Please enter your authentication code'); return; }
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
        success('Login Successful', 'Welcome back!');
        window.location.reload();
      } catch (err) {
        error('MFA Failed', err instanceof Error ? err.message : 'Invalid code');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!username || !password) { error('Missing Credentials', 'Please enter both username and password'); return; }
    setLoading(true);
    try {
      const result = await login(username, password);
      if (result.mfa_required && result.ticket) {
        setMfaRequired(true);
        setMfaTicket(result.ticket);
        return;
      }
      success('Login Successful', `Welcome back, ${username}!`);
    } catch (err) {
      error('Login Failed', err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="flex items-center gap-3 mb-2">
          <img src="/mascot.webp" srcSet="/mascot.webp 1x, /mascot-2x.webp 2x" alt="" className="h-12 w-12 object-contain" />
          <h1 className="text-3xl font-bold text-foreground">HomelabARR</h1>
        </div>
        <p className="text-muted-foreground mb-8">Your homelab, one dashboard.</p>

        <div className="w-full max-w-sm bg-card border border-border rounded-xl p-6 shadow-xs">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-secondary rounded-full">
              {mfaRequired
                ? <ShieldCheck className="w-7 h-7 text-muted-foreground" />
                : <Lock className="w-7 h-7 text-muted-foreground" />}
            </div>
          </div>
          <h2 className="text-xl font-semibold text-center mb-5">
            {mfaRequired ? 'Two-Factor Authentication' : 'Sign In'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!mfaRequired && (
              <>
                <div>
                  <Label htmlFor="login-username">Username</Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="login-username" type="text" value={username} onChange={e => setUsername(e.target.value)}
                      className="pl-9" placeholder="Enter your username" disabled={loading} autoComplete="username" autoFocus />
                  </div>
                </div>
                <div>
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="login-password" type={showPassword ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)} className="pl-9 pr-9" placeholder="Enter your password"
                      disabled={loading} autoComplete="current-password" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" disabled={loading}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {mfaRequired && (
              <div>
                <Label htmlFor="mfa-code">{useBackupCode ? 'Backup Code' : 'Authentication Code'}</Label>
                <Input id="mfa-code" type="text" value={mfaCode} onChange={e => setMfaCode(e.target.value)}
                  placeholder={useBackupCode ? 'Enter backup code' : 'Enter 6-digit code'}
                  disabled={loading} autoComplete="one-time-code" className="mt-1" autoFocus />
                <button type="button" onClick={() => { setUseBackupCode(!useBackupCode); setMfaCode(''); }}
                  className="mt-2 text-xs text-muted-foreground hover:text-foreground">
                  {useBackupCode ? 'Use authenticator app instead' : 'Use a backup code'}
                </button>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {loading ? 'Verifying...' : mfaRequired ? 'Verify' : 'Sign In'}
            </Button>
          </form>
        </div>

        <a href="#features" className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors">
          New to HomelabARR? See what it can do ↓
        </a>
      </div>

      <div id="features" className="border-t border-border bg-card/50">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Tile icon={Rocket} title="100+ apps, one click">
              Plex, Sonarr, Radarr, Jellyfin, Ollama, Home Assistant, qBittorrent. The whole catalog. Click Deploy, app is running.
            </Tile>
            <Tile icon={Layout} title="Three ways to deploy">
              Quick start with IP and port. Want a domain? Deploy Traefik for SSL, or Traefik + Authelia for 2FA.
            </Tile>
            <Tile icon={Globe} title="Bring your own domain">
              Point a domain at your server, open ports 80 and 443, deploy Traefik from the catalog. HomelabARR handles the rest.
            </Tile>
            <Tile icon={Terminal} title="Manage what's running">
              Start, stop, restart, view logs. Port Manager shows every port in use so conflicts surface before they bite.
            </Tile>
            <Tile icon={Smartphone} title="Mobile app">
              iOS today, Android soon. Same dashboard, on your phone. Logs in with an API key.
            </Tile>
            <Tile icon={Github} title="Open source, MIT">
              22 rounds of security audit, threat model, incident response runbook, compliance binders. All in the repo.
            </Tile>
          </div>
        </div>

        <div className="text-center pb-8 text-xs text-muted-foreground">
          No telemetry. No account required. No cloud.
        </div>
      </div>
    </div>
  );
}

function Tile({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <Icon className="w-5 h-5 text-muted-foreground mb-3" />
      <h3 className="font-semibold text-foreground mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}
