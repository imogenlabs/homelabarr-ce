import React, { useState, useEffect, useCallback } from 'react';
import { X, Key, Users, Shield, Loader2, Trash2, KeyRound, Plus, RefreshCw, ListRestart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface Activity {
  id: string;
  userId: string;
  username: string;
  timestamp: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  targetName: string | null;
  details: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
}

interface ManagedUser {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
  updatedAt?: string;
}

interface UserSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserSettings({ isOpen, onClose }: UserSettingsProps) {
  const [activeTab, setActiveTab] = useState<'password' | 'users' | 'activity'>('password');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { isAdmin, token, user } = useAuth();
  const { success, error } = useNotifications();

  // User management state
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<ManagedUser | null>(null);
  const [createForm, setCreateForm] = useState({ username: '', email: '', password: '', role: 'user' });
  const [resetForm, setResetForm] = useState({ newPassword: '', confirmPassword: '' });
  const [actionLoading, setActionLoading] = useState(false);

  // Activity log state
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityTotal, setActivityTotal] = useState(0);
  const [activityOffset, setActivityOffset] = useState(0);
  const ACTIVITY_PAGE_SIZE = 25;

  const fetchUsers = useCallback(async () => {
    if (!isAdmin || !token) return;
    setUsersLoading(true);
    try {
      const res = await fetch('/api/auth/users', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      error('Error', err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  }, [isAdmin, token, error]);

  const fetchActivities = useCallback(async (offset = 0) => {
    if (!isAdmin || !token) return;
    setActivityLoading(true);
    try {
      const res = await fetch(`/api/auth/activity-log?limit=${ACTIVITY_PAGE_SIZE}&offset=${offset}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch activity log');
      const data = await res.json();
      setActivities(data.activities);
      setActivityTotal(data.total);
      setActivityOffset(offset);
    } catch (err) {
      error('Error', 'Failed to load activity log');
    } finally {
      setActivityLoading(false);
    }
  }, [isAdmin, token, error]);

  useEffect(() => {
    if (isOpen && activeTab === 'users' && isAdmin) {
      fetchUsers();
    }
    if (isOpen && activeTab === 'activity' && isAdmin) {
      fetchActivities(0);
    }
  }, [isOpen, activeTab, isAdmin, fetchUsers, fetchActivities]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword) {
      error('Missing Fields', 'Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      error('Password Mismatch', 'New password and confirmation do not match');
      return;
    }

    if (newPassword.length < 6) {
      error('Weak Password', 'Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to change password');
      }

      success('Password Changed', 'Your password has been updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to change password';
      error('Password Change Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!createForm.username || !createForm.email || !createForm.password) {
      error('Missing Fields', 'All fields are required');
      return;
    }
    if (createForm.password.length < 6) {
      error('Weak Password', 'Password must be at least 6 characters');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(createForm),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create user');
      }
      success('User Created', `User ${createForm.username} created successfully`);
      setCreateForm({ username: '', email: '', password: '', role: 'user' });
      setCreateDialogOpen(false);
      fetchUsers();
    } catch (err) {
      error('Error', err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (targetUser: ManagedUser) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/auth/users/${targetUser.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete user');
      }
      success('User Deleted', `User ${targetUser.username} has been deleted`);
      fetchUsers();
    } catch (err) {
      error('Error', err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser) return;
    if (!resetForm.newPassword || resetForm.newPassword.length < 6) {
      error('Weak Password', 'Password must be at least 6 characters');
      return;
    }
    if (resetForm.newPassword !== resetForm.confirmPassword) {
      error('Password Mismatch', 'Passwords do not match');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/auth/users/${resetPasswordUser.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword: resetForm.newPassword }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reset password');
      }
      success('Password Reset', `Password reset for ${resetPasswordUser.username}`);
      setResetForm({ newPassword: '', confirmPassword: '' });
      setResetPasswordDialogOpen(false);
      setResetPasswordUser(null);
    } catch (err) {
      error('Error', err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`bg-white dark:bg-gray-800 rounded-lg w-full max-h-[90vh] overflow-hidden ${activeTab === 'activity' ? 'max-w-4xl' : 'max-w-2xl'}`}>
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">User Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('password')}
            className={`px-6 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'password'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Key className="w-4 h-4 inline mr-2" />
            Change Password
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              User Management
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'activity'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <ListRestart className="w-4 h-4 inline mr-2" />
              Activity Log
            </button>
          )}
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-800 flex items-center"
                  disabled={loading}
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {loading ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'users' && isAdmin && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    User Management
                  </h3>
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <Shield className="w-3 h-3 mr-1" />
                    Admin
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={fetchUsers} disabled={usersLoading}>
                    <RefreshCw className={`w-4 h-4 ${usersLoading ? 'animate-spin' : ''}`} />
                  </Button>
                  <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-1" />
                        Add User
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="dark:bg-gray-800 dark:border-gray-700">
                      <DialogHeader>
                        <DialogTitle className="dark:text-white">Create New User</DialogTitle>
                        <DialogDescription className="dark:text-gray-400">
                          Add a new user account to HomelabARR.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <div>
                          <Label htmlFor="create-username" className="dark:text-gray-300">Username</Label>
                          <Input
                            id="create-username"
                            value={createForm.username}
                            onChange={(e) => setCreateForm(f => ({ ...f, username: e.target.value }))}
                            className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor="create-email" className="dark:text-gray-300">Email</Label>
                          <Input
                            id="create-email"
                            type="email"
                            value={createForm.email}
                            onChange={(e) => setCreateForm(f => ({ ...f, email: e.target.value }))}
                            className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor="create-password" className="dark:text-gray-300">Password</Label>
                          <Input
                            id="create-password"
                            type="password"
                            value={createForm.password}
                            onChange={(e) => setCreateForm(f => ({ ...f, password: e.target.value }))}
                            className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor="create-role" className="dark:text-gray-300">Role</Label>
                          <Select value={createForm.role} onValueChange={(v) => setCreateForm(f => ({ ...f, role: v }))}>
                            <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="dark:border-gray-600 dark:text-gray-300">
                          Cancel
                        </Button>
                        <Button onClick={handleCreateUser} disabled={actionLoading}>
                          {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Create User
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {usersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700">
                  <Table>
                    <TableHeader>
                      <TableRow className="dark:border-gray-700">
                        <TableHead className="dark:text-gray-300">Username</TableHead>
                        <TableHead className="dark:text-gray-300">Email</TableHead>
                        <TableHead className="dark:text-gray-300">Role</TableHead>
                        <TableHead className="dark:text-gray-300">Created</TableHead>
                        <TableHead className="dark:text-gray-300 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id} className="dark:border-gray-700">
                          <TableCell className="font-medium dark:text-white">{u.username}</TableCell>
                          <TableCell className="dark:text-gray-300">{u.email}</TableCell>
                          <TableCell>
                            <Badge variant={u.role === 'admin' ? 'destructive' : 'default'}>
                              {u.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="dark:text-gray-300">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setResetPasswordUser(u);
                                  setResetForm({ newPassword: '', confirmPassword: '' });
                                  setResetPasswordDialogOpen(true);
                                }}
                                title="Reset password"
                              >
                                <KeyRound className="w-4 h-4" />
                              </Button>
                              {u.id !== user?.id && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" title="Delete user">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="dark:bg-gray-800 dark:border-gray-700">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="dark:text-white">Delete user {u.username}?</AlertDialogTitle>
                                      <AlertDialogDescription className="dark:text-gray-400">
                                        This cannot be undone. The user will lose all access.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel className="dark:border-gray-600 dark:text-gray-300">Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteUser(u)}
                                        className="bg-red-600 hover:bg-red-700 text-white"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {users.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-gray-500 dark:text-gray-400 py-8">
                            No users found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              <Dialog open={resetPasswordDialogOpen} onOpenChange={(open) => {
                setResetPasswordDialogOpen(open);
                if (!open) setResetPasswordUser(null);
              }}>
                <DialogContent className="dark:bg-gray-800 dark:border-gray-700">
                  <DialogHeader>
                    <DialogTitle className="dark:text-white">
                      Reset Password for {resetPasswordUser?.username}
                    </DialogTitle>
                    <DialogDescription className="dark:text-gray-400">
                      Set a new password for this user.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div>
                      <Label htmlFor="reset-password" className="dark:text-gray-300">New Password</Label>
                      <Input
                        id="reset-password"
                        type="password"
                        value={resetForm.newPassword}
                        onChange={(e) => setResetForm(f => ({ ...f, newPassword: e.target.value }))}
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="reset-confirm" className="dark:text-gray-300">Confirm Password</Label>
                      <Input
                        id="reset-confirm"
                        type="password"
                        value={resetForm.confirmPassword}
                        onChange={(e) => setResetForm(f => ({ ...f, confirmPassword: e.target.value }))}
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setResetPasswordDialogOpen(false)} className="dark:border-gray-600 dark:text-gray-300">
                      Cancel
                    </Button>
                    <Button onClick={handleResetPassword} disabled={actionLoading}>
                      {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Reset Password
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {activeTab === 'activity' && isAdmin && (
            <ActivityLogTab
              activities={activities}
              loading={activityLoading}
              total={activityTotal}
              offset={activityOffset}
              pageSize={ACTIVITY_PAGE_SIZE}
              onPageChange={fetchActivities}
              onRefresh={() => fetchActivities(activityOffset)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

const ACTION_LABELS: Record<string, string> = {
  user_login: 'Logged in',
  user_logout: 'Logged out',
  user_created: 'Created user',
  user_deleted: 'Deleted user',
  user_password_reset: 'Reset password',
  password_changed: 'Changed password',
  container_started: 'Started container',
  container_stopped: 'Stopped container',
  container_restarted: 'Restarted container',
  container_deleted: 'Deleted container',
  application_deployed: 'Deployed app',
};

const ACTION_COLORS: Record<string, string> = {
  user_login: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  user_logout: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  user_created: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  user_deleted: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  user_password_reset: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  password_changed: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  container_started: 'bg-green-500/20 text-green-400 border-green-500/30',
  container_stopped: 'bg-red-500/20 text-red-400 border-red-500/30',
  container_restarted: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  container_deleted: 'bg-red-500/20 text-red-400 border-red-500/30',
  application_deployed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function ActivityLogTab({
  activities,
  loading,
  total,
  offset,
  pageSize,
  onPageChange,
  onRefresh,
}: {
  activities: Activity[];
  loading: boolean;
  total: number;
  offset: number;
  pageSize: number;
  onPageChange: (offset: number) => void;
  onRefresh: () => void;
}) {
  const showingFrom = total === 0 ? 0 : offset + 1;
  const showingTo = Math.min(offset + pageSize, total);
  const hasPrev = offset > 0;
  const hasNext = offset + pageSize < total;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Activity Log</h3>
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
            <Shield className="w-3 h-3 mr-1" />
            Admin
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <ListRestart className="w-8 h-8 mx-auto mb-3 opacity-50" />
          <p>No activity recorded yet.</p>
          <p className="text-sm mt-1">Actions like logins, deployments, and user management will appear here.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700">
            <TooltipProvider>
              <Table>
                <TableHeader>
                  <TableRow className="dark:border-gray-700">
                    <TableHead className="dark:text-gray-300">Time</TableHead>
                    <TableHead className="dark:text-gray-300">User</TableHead>
                    <TableHead className="dark:text-gray-300">Action</TableHead>
                    <TableHead className="dark:text-gray-300">Target</TableHead>
                    <TableHead className="dark:text-gray-300">IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((a) => (
                    <TableRow key={a.id} className="dark:border-gray-700">
                      <TableCell className="dark:text-gray-300 whitespace-nowrap">
                        <Tooltip>
                          <TooltipTrigger className="cursor-default">
                            {formatRelativeTime(a.timestamp)}
                          </TooltipTrigger>
                          <TooltipContent>
                            {new Date(a.timestamp).toLocaleString()}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="font-medium dark:text-white">{a.username}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${ACTION_COLORS[a.action] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
                          {ACTION_LABELS[a.action] || a.action}
                        </span>
                      </TableCell>
                      <TableCell className="dark:text-gray-300">
                        {a.targetName || a.targetId || '-'}
                      </TableCell>
                      <TableCell className="dark:text-gray-400 text-sm font-mono">
                        {a.ipAddress || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TooltipProvider>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>Showing {showingFrom}-{showingTo} of {total}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onPageChange(offset - pageSize)} disabled={!hasPrev || loading}>
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => onPageChange(offset + pageSize)} disabled={!hasNext || loading}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
