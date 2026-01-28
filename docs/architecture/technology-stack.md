# Technology Stack

**Project:** Lumos - AI Work Assistant
**Version:** 1.0
**Date:** 2026-01-28

---

## Core Stack

### Desktop Framework

| Component | Technology | Version | Justification |
|-----------|------------|---------|---------------|
| Framework | **Electron** | 28.x | Cross-platform desktop, Node.js runtime, native API access |
| Build Tool | **electron-builder** | 24.x | macOS signing, notarization, auto-update |
| Bundler | **Vite** | 5.x | Fast HMR, ESM native, Rollup-based production |

### Frontend

| Component | Technology | Version | Justification |
|-----------|------------|---------|---------------|
| UI Framework | **React** | 18.x | Component model, concurrent features, large ecosystem |
| State Management | **Zustand** | 4.x | Simple, TypeScript-first, no boilerplate |
| Styling | **Tailwind CSS** | 3.x | Utility-first, design system consistency |
| Components | **shadcn/ui** | Latest | Accessible, customizable, React 18 compatible |

### Backend (Main Process)

| Component | Technology | Version | Justification |
|-----------|------------|---------|---------------|
| Language | **TypeScript** | 5.x | Type safety, IDE support, refactoring confidence |
| Database | **better-sqlite3** | 9.x | Synchronous API, WAL mode, fast |
| Validation | **AJV** | 8.x | JSON Schema validation, fast |
| Encryption | **Node crypto** | Built-in | AES-256-GCM support |

### AI & ML

| Component | Technology | Version | Justification |
|-----------|------------|---------|---------------|
| Local LLM | **Ollama** | Latest | JSON mode, easy setup, active development |
| Default Model | **qwen3-vl-4b** | Latest | Good performance/size ratio, JSON reliable |
| STT | **FluidAudio** | Latest | macOS native, high quality |

### Integration

| Component | Technology | Version | Justification |
|-----------|------------|---------|---------------|
| MCP Client | **@anthropic/mcp-client** | 1.x | Official SDK, TypeScript |
| HTTP Client | **node-fetch** | 3.x | Built-in (Node 18+) |
| WebSocket | **ws** | 8.x | Streaming responses |

---

## Development Tools

### Build & Test

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20.x LTS | Runtime |
| pnpm | 8.x | Package manager |
| Vitest | 1.x | Unit testing |
| Playwright | 1.x | E2E testing |
| ESLint | 8.x | Linting |
| Prettier | 3.x | Formatting |

### CI/CD

| Tool | Purpose |
|------|---------|
| GitHub Actions | CI/CD pipeline |
| electron-builder | macOS builds |
| Apple Developer ID | Code signing |
| Apple Notary | Gatekeeper approval |

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

| Electron | Node.js | Chromium | React | TypeScript |
|----------|---------|----------|-------|------------|
| 28.x | 20.x | 120.x | 18.x | 5.x |

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
- Electron desktop app
- Ollama local LLM
- SQLite storage
- MCP Calendar + Filesystem

### Phase 2 (Planned)

- ServiceNow MCP server (custom development)
- Enterprise SSO integration
- Advanced meeting analysis
- Possible cross-platform (Windows)

---

**Document Version:** 1.0
**Last Updated:** 2026-01-28
