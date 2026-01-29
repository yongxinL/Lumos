# Technology Stack

**Project:** Lumos - AI Work Assistant
**Version:** 2.0
**Date:** 2026-01-29
**Last Updated:** 2026-01-29

> **Note:** All versions verified via Context7 MCP (January 2026). Use these exact versions for compatibility.

---

## Core Stack

### Desktop Framework

| Component | Technology | Version | npm Package | Justification | Competitive Edge |
|-----------|------------|---------|-------------|---------------|------------------|
| Framework | **Electron** | 33.x | `electron@^33.0.0` | Cross-platform desktop, Node.js 22 runtime, native API access | Native OS integration vs web-only competitors (Linear, Notion) |
| Build Tool | **electron-builder** | 25.x | `electron-builder@^25.0.0` | macOS signing, notarization, auto-update | Auto-update capability vs manual installs |
| Bundler | **Vite** | 6.x | `vite@^6.0.0` | Fast HMR, ESM native, Rollup-based production | Faster dev cycles than webpack-based solutions |

### Frontend

| Component | Technology | Version | npm Package | Justification | Competitive Edge |
|-----------|------------|---------|-------------|---------------|------------------|
| UI Framework | **React** | 18.x | `react@^18.3.0` | Component model, concurrent features, large ecosystem | Industry standard with huge talent pool vs Vue/Svelte |
| State Management | **Zustand** | 5.x | `zustand@^5.0.0` | Simple, TypeScript-first, no boilerplate | Simpler than Redux, faster than Context API |
| Styling | **Tailwind CSS** | 4.x | `tailwindcss@^4.0.0` | Utility-first, design system consistency | Faster styling than CSS-in-JS, consistent design |
| Components | **shadcn/ui** | 2.x | `shadcn@^2.3.0` (CLI) | Accessible, customizable, React 18 compatible | Copy-paste components vs locked-in libraries |
| Routing | **React Router** | 7.x | `react-router-dom@^7.0.0` | Standard React routing | De facto standard, mature ecosystem |

### Backend (Main Process)

| Component | Technology | Version | npm Package | Justification | Competitive Edge |
|-----------|------------|---------|-------------|---------------|------------------|
| Language | **TypeScript** | 5.x | `typescript@^5.6.0` | Type safety, IDE support, refactoring confidence | Fewer runtime bugs than JavaScript |
| Database | **better-sqlite3** | 11.x | `better-sqlite3@^11.6.0` | Synchronous API, WAL mode, fast | Embedded DB, no server setup vs PostgreSQL |
| DB Types | **@types/better-sqlite3** | 7.x | `@types/better-sqlite3@^7.6.0` | TypeScript definitions | Type-safe queries |
| Validation | **AJV** | 8.x | `ajv@^8.17.0` | JSON Schema validation, fast | Fastest JSON Schema validator |
| YAML Parsing | **yaml** | 2.x | `yaml@^2.6.0` | YAML parsing for skills/policies | Human-readable config vs JSON |
| Encryption | **Node crypto** | Built-in | N/A | AES-256-GCM support | Native, no dependencies |

### AI & ML

| Component | Technology | Version | npm Package | Justification | Competitive Edge |
|-----------|------------|---------|-------------|---------------|------------------|
| Local LLM | **Ollama** | Latest | N/A (external) | JSON mode, easy setup, active development | **Privacy-first vs cloud-only (Copilot, Cursor)** |
| Default Model | **qwen3-vl-4b** | Latest | N/A | Good performance/size ratio, JSON reliable | Small model, works on consumer hardware |
| STT | **FluidAudio** | Latest | N/A (Swift) | macOS native, high quality | Native macOS vs cloud STT (Whisper API) |

### Integration

| Component | Technology | Version | npm Package | Justification | Competitive Edge |
|-----------|------------|---------|-------------|---------------|------------------|
| MCP Client | **MCP TypeScript SDK** | 1.x | `@modelcontextprotocol/sdk@^1.0.0` | Official SDK, TypeScript | **Standardized tool protocol vs custom APIs** |
| MCP Dependency | **Zod** | 3.x | `zod@^3.25.0` | Schema validation for MCP | Type-safe runtime validation |
| HTTP Client | **fetch** | Built-in | N/A | Native (Node 22+) | No dependencies, standard API |
| WebSocket | **ws** | 8.x | `ws@^8.18.0` | Streaming responses | Real-time updates vs polling |

---

## Development Tools

### Build & Test

| Tool | Version | npm Package | Purpose |
|------|---------|-------------|---------|
| Node.js | 22.x LTS | N/A | Runtime |
| pnpm | 9.x | N/A (global) | Package manager |
| Vitest | 3.x | `vitest@^3.0.0` | Unit testing |
| Playwright | 1.51.x | `@playwright/test@^1.51.0` | E2E testing |
| ESLint | 9.x | `eslint@^9.0.0` | Linting (flat config) |
| Prettier | 3.x | `prettier@^3.4.0` | Formatting |
| Husky | 9.x | `husky@^9.0.0` | Git hooks |
| lint-staged | 15.x | `lint-staged@^15.0.0` | Pre-commit linting |

### TypeScript Tooling

| Tool | Version | npm Package | Purpose |
|------|---------|-------------|---------|
| typescript-eslint | 8.x | `typescript-eslint@^8.0.0` | TypeScript ESLint |
| @vitejs/plugin-react | 4.x | `@vitejs/plugin-react@^4.3.0` | React Vite plugin |
| @types/node | 22.x | `@types/node@^22.0.0` | Node.js types |
| @types/react | 18.x | `@types/react@^18.3.0` | React types |
| @types/react-dom | 18.x | `@types/react-dom@^18.3.0` | React DOM types |

### CI/CD

| Tool | Purpose |
|------|---------|
| GitHub Actions | CI/CD pipeline |
| electron-builder | macOS builds |
| Apple Developer ID | Code signing |
| Apple Notary | Gatekeeper approval |

---

## Complete package.json Dependencies

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^7.0.0",
    "zustand": "^5.0.0",
    "better-sqlite3": "^11.6.0",
    "ajv": "^8.17.0",
    "yaml": "^2.6.0",
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.25.0",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "electron": "^33.0.0",
    "electron-builder": "^25.0.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "vitest": "^3.0.0",
    "@playwright/test": "^1.51.0",
    "eslint": "^9.0.0",
    "typescript-eslint": "^8.0.0",
    "prettier": "^3.4.0",
    "husky": "^9.0.0",
    "lint-staged": "^15.0.0",
    "@types/node": "^22.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@types/better-sqlite3": "^7.6.0",
    "@types/ws": "^8.5.0"
  }
}
```

---

## Dependency Lock Files

**Required lock files:**
- `pnpm-lock.yaml` - Package versions
- `swift/Package.resolved` - Swift dependencies

**Generation commands:**
```bash
# Node.js dependencies
pnpm install --frozen-lockfile

# Swift dependencies (FluidAudio helper)
cd swift && swift package resolve
```

---

## Version Compatibility Matrix

| Electron | Node.js | Chromium | React | TypeScript | Vite |
|----------|---------|----------|-------|------------|------|
| 33.x | 22.x | 130.x | 18.x | 5.x | 6.x |

---

## Security Considerations

### Dependency Security

- **npm audit** - Run on every CI build
- **Snyk** - Vulnerability scanning (recommended)
- **Dependabot** - Automated security updates

### Electron Security

- `contextIsolation: true` - Isolate preload scripts
- `nodeIntegration: false` - No Node in renderer
- `sandbox: true` - Renderer sandboxing
- CSP headers - Content Security Policy
- `webSecurity: true` - Enable web security

---

## Performance Baselines

| Metric | Target | Measurement |
|--------|--------|-------------|
| Cold start | <3s | Time to interactive |
| SQLite query | <100ms | Indexed queries |
| Policy evaluation | <50ms | Constraint checking |
| Memory usage | <500MB | Steady state |
| Bundle size | <100MB | app.asar |

---

## Phase 1 vs Phase 2 Technologies

### Phase 1 (MVP)

- macOS only
- Electron 33.x desktop app
- Ollama local LLM
- SQLite storage
- MCP Calendar + Filesystem

### Phase 2 (Planned)

- ServiceNow MCP server (custom development)
- Enterprise SSO integration
- Advanced meeting analysis
- Possible cross-platform (Windows)

---

## Upgrade Notes

### From Previous Versions

| Change | Old | New | Migration Notes |
|--------|-----|-----|-----------------|
| Electron | 28.x | 33.x | Update preload scripts for new security APIs |
| Vite | 5.x | 6.x | Update vite.config.ts for new options |
| better-sqlite3 | 9.x | 11.x | Compatible, may need rebuild for Electron |
| Zustand | 4.x | 5.x | Minor API changes, check persist middleware |
| ESLint | 8.x | 9.x | Switch to flat config format |
| Vitest | 1.x | 3.x | Update vitest.config.ts for new options |

---

---

## Competitive Technology Advantages

### vs GitHub Copilot / Cursor
- **Local-first LLM:** Privacy-focused, offline capable, GDPR compliant
- **Governance layer:** Deterministic policy engine vs unconstrained AI
- **Audit trails:** Complete transparency vs black box

### vs Continue.dev
- **Governance pipeline:** Policy enforcement vs direct execution
- **Trust management:** Progressive delegation vs all-or-nothing
- **Desktop native:** Full OS integration vs VSCode extension

### vs Replit Agent
- **Local execution:** No data leaves device vs cloud-only
- **MCP ecosystem:** Standardized tools vs proprietary integrations
- **Electron-based:** Cross-platform potential vs web-only

---

**Document Version:** 2.1
**CodeMaestro:** v1.1.0
**Last Updated:** 2026-01-29
