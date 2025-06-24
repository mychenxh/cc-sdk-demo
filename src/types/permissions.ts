/**
 * Permission types for MCP server-level control
 */

/**
 * Permission level for an MCP server
 * - 'whitelist': All tools from this MCP server are automatically allowed
 * - 'blacklist': All tools from this MCP server are automatically denied
 * - 'ask': Prompt user for each tool usage from this MCP server
 */
export type MCPServerPermission = 'whitelist' | 'blacklist' | 'ask';

/**
 * Configuration mapping MCP server names to their permission levels
 */
export interface MCPServerPermissionConfig {
  [serverName: string]: MCPServerPermission;
}

/**
 * Tool-level permission setting
 * - 'allow': Tool is allowed
 * - 'deny': Tool is denied
 * - 'ask': Prompt user when tool is used
 */
export type ToolPermission = 'allow' | 'deny' | 'ask';

/**
 * Detailed permission configuration for an MCP server
 */
export interface MCPServerDetailedPermission {
  /** Default permission for all tools from this server */
  defaultPermission: ToolPermission;
  /** Optional tool-specific permissions that override the default */
  tools?: {
    [toolName: string]: ToolPermission;
  };
}

/**
 * Extended permission configuration supporting both simple and detailed formats
 */
export type MCPServerPermissionConfigExtended = {
  [serverName: string]: MCPServerPermission | MCPServerDetailedPermission;
};