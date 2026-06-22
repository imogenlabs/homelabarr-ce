import { AppTemplate } from '../types';

export function validateConfig(
  template: AppTemplate,
  config: Record<string, string>,
  isAdvancedMode: boolean
): string[] {
  const errors: string[] = [];

  // Check required fields
  template.configFields?.forEach(field => {
    if (field.required && (!field.advanced || isAdvancedMode) && !config[field.name]) {
      errors.push(`${field.label} is required`);
    }
  });

  // Validate paths
  Object.entries(config).forEach(([key, value]) => {
    const field = template.configFields?.find(f => f.name === key);
    // Skip domain validation for path format. Case-insensitive on the key so
    // camelCase fields (dataPath, configPath) aren't silently skipped (HLCE-266).
    if (field?.type === 'text' && key.toLowerCase().includes('path') && (value.includes('/path/to') || !value.startsWith('/'))) {
      errors.push(`${field.label} must be a valid absolute path`);
    }
  });

  // Validate ports — for number-typed fields AND text-typed catalog port fields
  // (HLCE-276/280: catalog apps render ports as type 'text', so the old
  // `type === 'number'` gate skipped their range validation entirely).
  Object.entries(config).forEach(([key, value]) => {
    const field = template.configFields?.find(f => f.name === key);
    if (isPortField(field, key)) {
      const port = parseInt(value, 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        errors.push(`${field?.label ?? key} must be a valid port number (1-65535)`);
      }
      // NOTE: privileged ports (< 1024) are intentionally NOT flagged here.
      // The previous "Warning: …privileged port" string was pushed into this
      // blocking errors[] array, so DeployModal (which blocks on errors.length)
      // silently refused every deploy on port 80/443/etc. (HLCE-280). Privileged
      // ports are a legitimate operator choice; the backend governs the bind.
    }
  });

  return errors;
}

import { checkUsedPorts } from './api';

// A config field carries a port either when it's typed as a number OR when its
// key/label denotes a port (case-insensitive). Catalog apps render port fields
// as type 'text', so the type check alone misses them (HLCE-276).
function isPortField(field: { type: string; name: string; label?: string } | undefined, key: string): boolean {
  if (!field) return false;
  if (field.type === 'number') return true;
  return key.toLowerCase().includes('port') || (field.label?.toLowerCase().includes('port') ?? false);
}

// Async validation for port conflicts
export async function validatePortConflicts(
  template: AppTemplate,
  config: Record<string, string>
): Promise<string[]> {
  const errors: string[] = [];

  try {
    const { usedPorts } = await checkUsedPorts();

    // Check configured ports against used ports
    Object.entries(config).forEach(([key, value]) => {
      const field = template.configFields?.find(f => f.name === key);
      if (isPortField(field, key)) {
        const port = parseInt(value, 10);
        if (!isNaN(port) && usedPorts.includes(port)) {
          errors.push(`Port ${port} is already in use by another container`);
        }
      }
    });
    
    // Check template default ports
    if (template.defaultPorts) {
      Object.entries(template.defaultPorts).forEach(([portName, port]) => {
        if (usedPorts.includes(port)) {
          errors.push(`Default port ${port} (${portName}) is already in use`);
        }
      });
    }
  } catch (error) {
    console.warn('Could not check port conflicts:', error);
    // Don't block deployment if port check fails
  }
  
  return errors;
}