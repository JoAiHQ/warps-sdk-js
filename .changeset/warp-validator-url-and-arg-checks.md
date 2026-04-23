---
"@joai/warps": minor
---

WarpValidator now catches two bug classes that silently break HTTP warp dispatches:

- **URL path placeholders without url-positioned inputs.** A warp whose action URL contains `{{X}}` on a path segment must have an input with `position: "url:X"` (or declare `X` in `vars`). Otherwise the placeholder resolves to empty and the route collapses (e.g. `/v1/contacts/{{contactId}}/activities` becomes `/v1/contacts/activities`, hitting a different handler that rejects the request). Uppercase placeholders (`{{JOAI_AGENT_UUID}}`, `{{API_BASE}}`) are treated as runtime/brand globals and skipped.
- **CLI `arg:N` positions on HTTP write actions.** Inputs with `position: "arg:N"` on a POST/PUT/PATCH/DELETE action never reach the JSON body — the API receives an empty payload and rejects with "field required" errors. Remove the position (defaults to body) or use `"payload:X"` / `"url:X"` explicitly.
