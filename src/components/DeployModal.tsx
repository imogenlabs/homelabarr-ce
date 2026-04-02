import React, { useState } from "react";
import { AppTemplate, ConfigField, DeploymentMode } from "../types";
import { Settings2, ChevronDown, ChevronUp, Loader2, Home } from "lucide-react";
import { validateConfig, validatePortConflicts } from "../lib/validation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

interface DeployModalProps {
  app: AppTemplate;
  onClose: () => void;
  onDeploy: (appId: string, config: Record<string, string>, mode: DeploymentMode) => void;
  loading?: boolean;
  isOpen: boolean;
  deploymentModes?: DeploymentMode[];
  cliIntegration?: boolean;
}

export function DeployModal({
  app,
  onClose,
  onDeploy,
  loading,
  isOpen,
  deploymentModes = [],
  cliIntegration = false,
}: DeployModalProps) {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [validating, setValidating] = useState(false);
  const [autheliaEnabled, setAutheliaEnabled] = useState(false);
  const [deploymentMode, setDeploymentMode] = useState<DeploymentMode>(
    deploymentModes.length > 0
      ? deploymentModes[0]
      : { type: "local", name: "Local", description: "Direct port mapping", features: [], icon: Home }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidating(true);
    try {
      const validationErrors = validateConfig(app, config, showAdvanced);
      const portErrors = await validatePortConflicts(app, config);
      const allErrors = [...validationErrors, ...portErrors];
      if (allErrors.length > 0) {
        setErrors(allErrors);
        return;
      }
      setErrors([]);
      onDeploy(app.id, config, deploymentMode);
    } finally {
      setValidating(false);
    }
  };

  const handleInputChange = (field: ConfigField, value: string) => {
    setConfig(prev => ({ ...prev, [field.name]: value }));
    setErrors([]);
  };

  const isTraefikMode = deploymentMode.type === "traefik" || deploymentMode.type === "authelia";
  const basicFields = app.configFields?.filter(field => !field.advanced && (!field.trafikOnly || isTraefikMode)) || [];
  const advancedFields = app.configFields?.filter(field => field.advanced) || [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Deploy {app.name}</DialogTitle>
          <DialogDescription>Configure deployment settings</DialogDescription>
        </DialogHeader>

        {errors.length > 0 && (
          <div className="p-3 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-md">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
              Please fix the following errors:
            </h3>
            <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Deployment Mode Selection */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h3 className="text-sm font-medium mb-3">
              Deployment Mode
              {cliIntegration && <Badge variant="secondary" className="ml-2">CLI</Badge>}
            </h3>
            <div className="space-y-3">
              {deploymentModes.length > 0 ? (
                deploymentModes.map((mode) => (
                  <label key={mode.type} className="flex items-start space-x-3">
                    <input
                      type="radio"
                      checked={deploymentMode.type === mode.type}
                      onChange={() => setDeploymentMode(mode)}
                      className="h-4 w-4 text-blue-600 mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{mode.name || mode.type}</div>
                      {mode.description && (
                        <div className="text-xs text-muted-foreground mt-1">{mode.description}</div>
                      )}
                      {mode.features && mode.features.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {mode.features.map((feature, index) => (
                            <Badge key={index} variant="secondary">{feature}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </label>
                ))
              ) : (
                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input type="radio" checked={deploymentMode.type === "local"} onChange={() => setDeploymentMode({ type: "local", name: "Local", description: "Direct port mapping", features: [], icon: Home })} className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">Local (Direct Port Mapping)</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input type="radio" checked={deploymentMode.type === "traefik"} onChange={() => setDeploymentMode({ type: "traefik", name: "Traefik", description: "Reverse proxy", features: [], icon: Home })} className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">Traefik (Reverse Proxy)</span>
                  </label>
                  {(deploymentMode.type === "traefik" || deploymentMode.type === "authelia") && (
                    <label className="flex items-center space-x-3 ml-6 mt-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autheliaEnabled}
                        onChange={(e) => {
                          setAutheliaEnabled(e.target.checked);
                          setDeploymentMode(e.target.checked
                            ? { type: "authelia", name: "Traefik + Authelia", description: "Reverse proxy with 2FA authentication", features: ["Traefik", "Authelia 2FA"], icon: Home }
                            : { type: "traefik", name: "Traefik", description: "Reverse proxy", features: [], icon: Home }
                          );
                        }}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                      <span className="text-sm">Enable Authelia Authentication</span>
                    </label>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Basic Configuration Fields */}
          <div className="space-y-4">
            {basicFields.map((field) => (
              <div key={field.name}>
                <Label htmlFor={field.name}>
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {field.type === "select" ? (
                  <select
                    name={field.name}
                    required={field.required}
                    onChange={(e) => handleInputChange(field, e.target.value)}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select an option</option>
                    {field.options?.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type={field.type}
                    name={field.name}
                    placeholder={field.placeholder}
                    required={field.required}
                    defaultValue={field.defaultValue}
                    onChange={(e) => handleInputChange(field, e.target.value)}
                    className="mt-1"
                  />
                )}
                {field.helpText && (
                  <p className="mt-1 text-xs text-muted-foreground">{field.helpText}</p>
                )}
              </div>
            ))}
          </div>

          {/* Advanced Configuration */}
          {advancedFields.length > 0 && (
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" className="gap-1">
                  <Settings2 className="w-4 h-4" />
                  Advanced Configuration
                  {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-4 space-y-4 p-4 bg-muted/50 rounded-lg">
                  {advancedFields.map((field) => (
                    <div key={field.name}>
                      <Label htmlFor={field.name}>
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      {field.type === "select" ? (
                        <select
                          name={field.name}
                          required={field.required}
                          onChange={(e) => handleInputChange(field, e.target.value)}
                          className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="">Select an option</option>
                          {field.options?.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          type={field.type}
                          name={field.name}
                          placeholder={field.placeholder}
                          required={field.required}
                          defaultValue={field.defaultValue}
                          onChange={(e) => handleInputChange(field, e.target.value)}
                          className="mt-1"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || validating}>
              {(loading || validating) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {loading ? "Deploying..." : validating ? "Validating..." : "Deploy"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
