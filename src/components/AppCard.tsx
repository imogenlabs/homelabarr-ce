import { AppTemplate, CLIApplication } from "../types";
import { Shield, Network, Monitor, Star } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAppIconPath, getCdnFallbackUrl } from '../utils/iconMap';
import { useTheme } from '../contexts/ThemeContext';

interface AppCardProps {
  app: AppTemplate;
  onDeploy: (app: AppTemplate) => void;
  starred?: boolean;
  onToggleStar?: (appId: string) => void;
}

export function AppCard({ app, onDeploy, starred = false, onToggleStar }: AppCardProps) {
  const { theme } = useTheme();
  const cliApp = (app as any)._cliApp as CLIApplication | undefined;

  return (
    <Card className="group relative overflow-hidden transition-colors duration-200 flex flex-col h-full hover:border-muted-foreground/30">

      {/* Star button */}
      {onToggleStar && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleStar(cliApp?.id || app.name); }}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-lg transition-all duration-200 hover:scale-110"
          aria-label={starred ? 'Unstar app' : 'Star app'}
        >
          <Star
            className={`w-4 h-4 transition-colors ${
              starred
                ? 'fill-amber-400 text-amber-400'
                : 'text-zinc-400 hover:text-amber-400'
            }`}
          />
        </button>
      )}

      <CardHeader className="flex flex-row items-center gap-4 pt-5 pb-3">
        <div className="p-2.5 bg-secondary rounded-lg border border-border">
          <img
            src={getAppIconPath(app.name, theme)}
            alt={`${app.name} icon`}
            className="w-7 h-7 object-contain"
            onError={(e) => {
              const target = e.currentTarget;
              const cdnUrl = getCdnFallbackUrl(app.name);
              if (!target.dataset.triedCdn && target.src !== cdnUrl) {
                target.dataset.triedCdn = "1";
                target.src = cdnUrl;
              } else {
                target.style.display = "none";
                const letter = document.createElement("span");
                letter.className = "w-7 h-7 flex items-center justify-center rounded-md bg-secondary text-muted-foreground text-sm font-bold";
                letter.textContent = (target.alt || "?")[0].toUpperCase();
                target.parentElement?.appendChild(letter);
              }
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base font-semibold truncate">{app.name}</CardTitle>
          {cliApp && (
            <CardDescription className="truncate text-xs mt-0.5">
              {cliApp.image.split(":")[0]}
            </CardDescription>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-grow pb-3">
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-4">
          {app.description}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {cliApp?.requiresTraefik && (
            <Badge variant="outline">
              <Network className="w-3 h-3 mr-1" />
              Traefik
            </Badge>
          )}
          {cliApp?.requiresAuthelia && (
            <Badge variant="outline">
              <Shield className="w-3 h-3 mr-1" />
              Auth
            </Badge>
          )}
          {!cliApp && app.deploymentModes && app.deploymentModes.map(mode => {
            const styles: Record<string, string> = {
              traefik: "",
              authelia: "",
              local: "",
            };
            const icons: Record<string, typeof Network> = { traefik: Network, authelia: Shield, local: Monitor };
            const labels: Record<string, string> = { traefik: "Traefik", authelia: "Authelia", local: "Local" };
            const ModeIcon = icons[mode] || Monitor;
            return (
              <Badge key={mode} variant="outline" className={styles[mode] || ""}>
                <ModeIcon className="w-3 h-3 mr-1" />
                {labels[mode] || mode}
              </Badge>
            );
          })}
          <Badge variant="secondary" className="capitalize text-xs">
            {cliApp?.category || app.category}
          </Badge>
        </div>
      </CardContent>

      <CardFooter className="pt-0 pb-4">
        <Button
          onClick={() => onDeploy(app)}
          className="w-full"
          size="default"
        >
          Deploy
        </Button>
      </CardFooter>
    </Card>
  );
}
