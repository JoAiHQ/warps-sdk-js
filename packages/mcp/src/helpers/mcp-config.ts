import type { AppMcpConfig, ResourceMeta } from '../types'

const DEFAULT_CSP = {
  connectDomains: [] as string[],
  resourceDomains: [] as string[],
  frameDomains: [] as string[],
  baseUriDomains: [] as string[],
}

/**
 * Builds the resource metadata `ui` block expected by MCP Apps clients.
 * Applies secure defaults for any fields not provided by the app config.
 *
 * @see https://modelcontextprotocol.github.io/ext-apps/api/documents/Migrate_OpenAI_App.html#resource-metadata
 */
export const buildAppMcpResourceMeta = (appMcp?: AppMcpConfig): ResourceMeta => ({
  ui: {
    prefersBorder: appMcp?.prefersBorder ?? true,
    csp: {
      connectDomains: appMcp?.csp?.connectDomains ?? [...DEFAULT_CSP.connectDomains],
      resourceDomains: appMcp?.csp?.resourceDomains ?? [...DEFAULT_CSP.resourceDomains],
      frameDomains: appMcp?.csp?.frameDomains ?? [...DEFAULT_CSP.frameDomains],
      baseUriDomains: appMcp?.csp?.baseUriDomains ?? [...DEFAULT_CSP.baseUriDomains],
    },
    permissions: appMcp?.permissions ?? {},
    ...(appMcp?.domain ? { domain: appMcp.domain } : {}),
  },
})
