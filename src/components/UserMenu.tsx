import { User, LogOut, Settings, Shield, Key } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface UserMenuProps {
  onOpenSettings?: () => void;
  onOpenApiKeys?: () => void;
}

export function UserMenu({ onOpenSettings, onOpenApiKeys }: UserMenuProps) {
  const { user, logout, isAdmin } = useAuth();
  const { success } = useNotifications();

  const handleLogout = () => {
    logout();
    success("Logged Out", "You have been successfully logged out");
  };

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 px-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="hidden md:block text-left">
            <div className="text-sm font-medium">{user.username}</div>
            <div className="text-xs text-muted-foreground flex items-center">
              {isAdmin && <Shield className="w-3 h-3 mr-1" />}
              {user.role}
            </div>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>
          <div className="text-sm font-medium">{user.username}</div>
          <div className="text-xs text-muted-foreground font-normal">
            {user.email || "No email set"}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {onOpenApiKeys && (
          <DropdownMenuItem onClick={onOpenApiKeys}>
            <Key className="w-4 h-4 mr-2" />
            API Keys
          </DropdownMenuItem>
        )}
        {onOpenSettings && (
          <DropdownMenuItem onClick={onOpenSettings}>
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
