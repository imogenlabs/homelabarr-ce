import { AppTemplate, CLIApplication } from "../types";
import { Shield, Network, Monitor, Star, Cpu } from "lucide-react";
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
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 dark:hover:shadow-indigo-500/20 hover:translate-y-[-3px] flex flex-col h-full border-0 ring-1 ring-gray-200 dark:ring-white/[0.08] hover:ring-indigo-400/50 dark:hover:ring-indigo-500/40 bg-white dark:bg-[hsl(222,28%,10%)]">
      {/* Category accent stripe */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500 opacity-60 group-hover:opacity-100 transition-opacity" />

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
        <div className="p-3 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/20 rounded-xl ring-1 ring-indigo-100 dark:ring-indigo-800/30 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-indigo-500/20">
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
                letter.className = "w-7 h-7 flex items-center justify-center rounded-md bg-indigo-500/20 text-indigo-300 text-sm font-bold";
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
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50" variant="outline">
              <Network className="w-3 h-3 mr-1" />
              Traefik
            </Badge>
          )}
          {cliApp?.requiresAuthelia && (
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800/50" variant="outline">
              <Shield className="w-3 h-3 mr-1" />
              Auth
            </Badge>
          )}
          {cliApp?.gpuSupport && (
            <Badge className="bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300 border-lime-200 dark:border-lime-800/50" variant="outline">
              <Cpu className="w-3 h-3 mr-1" />
              GPU
            </Badge>
          )}
          {!cliApp && app.deploymentModes && app.deploymentModes.map(mode => {
            const styles: Record<string, string> = {
              traefik: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50",
              authelia: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800/50",
              local: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 border-sky-200 dark:border-sky-800/50",
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
          <Badge variant="outline" className="capitalize text-xs bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 border-amber-200 dark:border-amber-800">
            {cliApp?.category || app.category}
          </Badge>
        </div>
      </CardContent>

      <CardFooter className="pt-0 pb-4">
        <Button
          onClick={() => onDeploy(app)}
          className="w-full bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-medium shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-200"
          size="default"
        >
          Deploy
        </Button>
      </CardFooter>
    </Card>
  );
}
