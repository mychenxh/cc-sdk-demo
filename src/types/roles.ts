/**
 * Role and persona system types
 */

import type { PermissionMode, ToolName } from '../types.js';
import type { MCPServerPermissionConfig } from './permissions.js';

/**
 * Role definition with comprehensive configuration
 */
export interface RoleDefinition {
  /** Unique name for the role */
  name: string;
  /** Optional description of the role's purpose */
  description?: string;
  /** Model to use for this role (e.g., 'opus', 'sonnet', 'haiku') */
  model: string;
  /** Permission configuration for the role */
  permissions: {
    /** MCP server-level permissions */
    mcpServers?: MCPServerPermissionConfig;
    /** Tool-level permissions */
    tools?: {
      /** Explicitly allowed tools */
      allowed?: ToolName[];
      /** Explicitly denied tools */
      denied?: ToolName[];
    };
    /** Permission mode for the role */
    mode?: PermissionMode;
  };
  /** Custom prompting template for this role */
  promptingTemplate?: string;
  /** System prompt to prepend to queries */
  systemPrompt?: string;
  /** Context configuration */
  context?: {
    /** Maximum tokens for responses */
    maxTokens?: number;
    /** Temperature for model responses */
    temperature?: number;
    /** Additional context to include */
    additionalContext?: string[];
  };
  /** Parent role to inherit from */
  extends?: string;
  /** Metadata for the role */
  metadata?: {
    /** Role creator */
    author?: string;
    /** Creation date */
    created?: string;
    /** Last modified date */
    modified?: string;
    /** Role version */
    version?: string;
    /** Tags for categorization */
    tags?: string[];
  };
}

/**
 * Roles configuration file schema
 */
export interface RolesConfig {
  /** Configuration schema version */
  version: '1.0';
  /** Role definitions */
  roles: {
    [roleName: string]: Omit<RoleDefinition, 'name'>;
  };
  /** Default role to use if none specified */
  defaultRole?: string;
}

/**
 * Role application options
 */
export interface RoleApplicationOptions {
  /** Whether to override existing settings */
  override?: boolean;
  /** Whether to merge arrays (tools, context) */
  mergeArrays?: boolean;
  /** Whether to apply prompting template */
  applyPrompting?: boolean;
}

/**
 * Role validation result
 */
export interface RoleValidationResult {
  /** Whether the role is valid */
  valid: boolean;
  /** Validation errors if any */
  errors?: string[];
  /** Validation warnings if any */
  warnings?: string[];
}

/**
 * Role inheritance chain
 */
export interface RoleInheritanceChain {
  /** Ordered list of roles from child to parent */
  chain: string[];
  /** Whether the chain has circular dependencies */
  hasCircularDependency: boolean;
  /** Merged role definition */
  merged?: RoleDefinition;
}