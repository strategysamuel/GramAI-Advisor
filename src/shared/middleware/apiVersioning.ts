// API versioning middleware
import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';

export interface VersionedRequest extends Request {
  apiVersion?: string;
}

interface ApiVersionConfig {
  supportedVersions: string[];
  defaultVersion: string;
  deprecatedVersions: string[];
}

class ApiVersionManager {
  private config: ApiVersionConfig;

  constructor() {
    this.config = {
      supportedVersions: ['v1'],
      defaultVersion: 'v1',
      deprecatedVersions: [],
    };
  }

  // Extract version from request
  private extractVersion(req: Request): string | null {
    // Check URL path first (/api/v1/...)
    const pathMatch = req.path.match(/^\/api\/(v\d+)\//);
    if (pathMatch) {
      return pathMatch[1];
    }

    // Check Accept header (application/vnd.gramai.v1+json)
    const acceptHeader = req.get('Accept');
    if (acceptHeader) {
      const acceptMatch = acceptHeader.match(/application\/vnd\.gramai\.(v\d+)\+json/);
      if (acceptMatch) {
        return acceptMatch[1];
      }
    }

    // Check custom header
    const versionHeader = req.get('X-API-Version');
    if (versionHeader) {
      return versionHeader.startsWith('v') ? versionHeader : `v${versionHeader}`;
    }

    return null;
  }

  // Validate version
  private isVersionSupported(version: string): boolean {
    return this.config.supportedVersions.includes(version);
  }

  // Check if version is deprecated
  private isVersionDeprecated(version: string): boolean {
    return this.config.deprecatedVersions.includes(version);
  }

  // Version middleware
  public middleware = (req: VersionedRequest, res: Response, next: NextFunction): void => {
    const requestedVersion = this.extractVersion(req);
    const version = requestedVersion || this.config.defaultVersion;

    // Validate version
    if (!this.isVersionSupported(version)) {
      const response: ApiResponse = {
        success: false,
        message: 'Unsupported API version',
        error: `Version '${version}' is not supported. Supported versions: ${this.config.supportedVersions.join(', ')}`,
      };
      res.status(400).json(response);
      return;
    }

    // Set version in request
    req.apiVersion = version;

    // Add version headers to response
    res.set({
      'X-API-Version': version,
      'X-Supported-Versions': this.config.supportedVersions.join(', '),
    });

    // Add deprecation warning if needed
    if (this.isVersionDeprecated(version)) {
      res.set('X-API-Deprecated', 'true');
      res.set('X-API-Deprecation-Warning', `API version ${version} is deprecated. Please upgrade to the latest version.`);
    }

    next();
  };

  // Add new version
  public addVersion(version: string): void {
    if (!this.config.supportedVersions.includes(version)) {
      this.config.supportedVersions.push(version);
      this.config.supportedVersions.sort();
    }
  }

  // Deprecate version
  public deprecateVersion(version: string): void {
    if (this.config.supportedVersions.includes(version) && 
        !this.config.deprecatedVersions.includes(version)) {
      this.config.deprecatedVersions.push(version);
    }
  }

  // Remove version
  public removeVersion(version: string): void {
    this.config.supportedVersions = this.config.supportedVersions.filter(v => v !== version);
    this.config.deprecatedVersions = this.config.deprecatedVersions.filter(v => v !== version);
  }

  // Get version info
  public getVersionInfo(): ApiVersionConfig {
    return { ...this.config };
  }
}

export const apiVersionManager = new ApiVersionManager();
export const apiVersioning = apiVersionManager.middleware;

// Version-specific route handler
export const versionedRoute = (versions: string[], handler: (req: VersionedRequest, res: Response, next: NextFunction) => void) => {
  return (req: VersionedRequest, res: Response, next: NextFunction): void => {
    const currentVersion = req.apiVersion || 'v1';
    
    if (!versions.includes(currentVersion)) {
      const response: ApiResponse = {
        success: false,
        message: 'Endpoint not available in this API version',
        error: `Endpoint not available in version ${currentVersion}. Available in versions: ${versions.join(', ')}`,
      };
      res.status(404).json(response);
      return;
    }
    
    handler(req, res, next);
  };
};

export default apiVersionManager;