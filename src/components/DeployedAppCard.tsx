import { useState } from "react";
import { DeployedApp } from "../types";
import { ContainerControls } from "./ContainerControls";
import { ContainerStats } from "./ContainerStats";
import { Terminal, ChevronDown, ChevronUp, MoreVertical } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { AppIcon } from "./AppIcon";

interface DeployedAppCardProps {
  app: DeployedApp;
  onViewLogs: () => void;
  onRefresh: () => void;
}

export function DeployedAppCard({ app, onViewLogs, onRefresh }: DeployedAppCardProps) {
  const [showStats, setShowStats] = useState(false);

  return (
    <Card className="overflow-hidden dark:bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <Collapsible open={showStats} onOpenChange={setShowStats}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                {showStats ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
          <AppIcon appName={app.name} size={28} />
          <CardTitle>{app.name}</CardTitle>
        </div>
        <Badge variant={app.status === "running" ? "default" : "destructive"} className={app.status === "running" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" : ""}>
          <span className={`w-2 h-2 rounded-full mr-1.5 ${
            app.status === "running" ? "bg-green-500 animate-pulse-slow" : "bg-red-500"
          }`} />
          {app.status}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        {app.url && (
          <a
            href={app.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground hover:underline text-sm"
          >
            {app.url}
          </a>
        )}

        <p className="text-sm text-muted-foreground">
          Deployed: {new Date(app.deployedAt).toLocaleString()}
        </p>

        <div className="flex justify-between items-center pt-4 border-t">
          <ContainerControls
            containerId={app.id}
            status={app.status}
            onAction={onRefresh}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" title="More actions">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onViewLogs}>
                <Terminal className="w-4 h-4 mr-2" />
                View Logs
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>

      {showStats && app.stats && (
        <div className="border-t">
          <ContainerStats stats={app.stats} />
        </div>
      )}
    </Card>
  );
}
