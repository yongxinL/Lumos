# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Lumos** is an AI-powered assistant for ServiceNow that automates repetitive tasks, delivers instant insights, and streamlines workflows to help teams work faster, smarter, and more efficiently.

**Current Status:** Early phase - project structure established, implementation pending.

## Project Structure

This project uses the **CodeMaestro v1.1** framework, which orchestrates development through a 5-phase lifecycle:

1. **Requirements** - Specification and competitive analysis
2. **Planning** - Technical blueprint and task decomposition
3. **Implementation** - Production code development
4. **Verification** - Quality gates and testing
5. **Release** - Deployment and lessons learned

### Directory Structure

```
.
├── .CodeMaestro/           # Framework files (prompts, agents, configs)
│   ├── prompts/           # Phase prompts and templates
│   ├── agents/            # Specialized agent definitions
│   ├── config/            # Constraints, thresholds, workflows
│   ├── orchestrator/      # Phase controller and handoff protocol
│   └── docs/              # Framework documentation
│
├── docs/                   # Project documentation
│   ├── specifications/    # Requirements and acceptance criteria
│   ├── architecture/      # System design and blueprints
│   ├── implementation/    # Decision logs and context packages
│   ├── verification/      # Test plans and evidence packages
│   ├── release/           # Release notes and retrospectives
│   ├── knowledge-base/    # Organizational learning
│   ├── team/              # Team structure and contacts
│   └── portfolio/         # Project showcase
│
├── cleanup.sh             # Removes framework files for release
├── CLAUDE.md              # This file
└── README.md              # User-facing project description
```

## CodeMaestro Framework Integration

This project follows CodeMaestro's documentation-driven architecture. Key framework files:

### Essential References

- **[.CodeMaestro/config/CONFIG-QUICK-REFERENCE.md](.CodeMaestro/config/CONFIG-QUICK-REFERENCE.md)** - Start here for framework configuration index
- **[.CodeMaestro/prompts/00-core.md](.CodeMaestro/prompts/00-core.md)** - Core system configuration, roles, constraints
- **[.CodeMaestro/docs/INTERACTIONS-CORE.md](.CodeMaestro/docs/INTERACTIONS-CORE.md)** - Essential workflow interactions (Phases 1-5)
- **[.CodeMaestro/config/constraints-reference.md](.CodeMaestro/config/constraints-reference.md)** - Design constraints (A1-E33)
- **[.CodeMaestro/config/git-commands.md](.CodeMaestro/config/git-commands.md)** - Git workflow templates

### Phase Prompts

Located in [.CodeMaestro/prompts/](.CodeMaestro/prompts/):

- `01-requirements.md` - Requirements gathering phase
- `02-planning.md` - Architecture and planning phase
- `03-implementation.md` - Development phase
- `04-verification.md` - Testing and quality gates
- `05-release.md` - Release coordination

### Specialized Agents

Located in [.CodeMaestro/agents/](.CodeMaestro/agents/):

- `product-manager.md` - Requirements and competitive analysis
- `architect.md` - System design and technical decisions
- `developer.md` - Production code development
- `code-reviewer.md` - Code quality and security review
- `qa-lead.md` - Evidence collection and GO/NO-GO decisions
- `release-manager.md` - Release coordination and retrospectives

## Development Workflow

### Natural Language Commands

CodeMaestro uses natural language for interactions:

| Intent                | Example                                 |
| --------------------- | --------------------------------------- |
| Search knowledge base | "Search the knowledge base for [topic]" |
| Generate commit       | "Generate a commit for my changes"      |
| Generate tests        | "Generate test stubs for AC-1.2"        |
| Show status           | "What's my current progress?"           |
| Next task             | "What should I work on next?"           |
| Verify changes        | "Verify my changes"                     |
| Invoke agent          | "Review this code" (code-reviewer)      |

### Git Workflow

Branch strategy (git-flow variant):

- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - Milestone features
- `task/*` - Individual improvements
- `release/*` - Release preparation
- `hotfix/*` - Emergency fixes

Version tagging:

- `v0.1.x-spec` - Specification versions
- `v0.2.x-plan` - Planning versions
- `v0.3.x-impl` - Implementation versions
- `v0.4.x-verify` - Verification versions
- `v1.0.0+` - Production releases

### Quality Gates

Non-negotiable thresholds enforced at phase boundaries:

- Test Coverage: ≥70%
- Security Issues: 0 critical/high
- Acceptance Criteria Pass Rate: 100%

See [.CodeMaestro/config/quality-gates.md](.CodeMaestro/config/quality-gates.md) for details.

## Key Principles

1. **Anti-Hallucination First** - Copy verified examples, connect to existing solutions, reuse proven patterns
2. **Progressive Disclosure** - Load templates and configurations on-demand for token efficiency
3. **Documentation Driven** - If it's not documented, it doesn't exist
4. **Evidence-Based** - All decisions backed by constraints (A1-E33)
5. **Quality First** - Meet quality gates before considering feature-complete

## Lumos-Specific Guidelines

### ServiceNow Integration

When implementing Lumos features:

- Follow ServiceNow REST API best practices
- Implement proper authentication and authorization
- Handle ServiceNow rate limits appropriately
- Cache responses where appropriate
- Provide clear error messages for ServiceNow-specific errors

### AI Assistant Features

Core capabilities to implement:

- Task automation workflows
- Natural language query processing
- Insight generation from ServiceNow data
- Workflow streamlining suggestions
- Integration with ServiceNow modules

### Security Requirements

Given ServiceNow integration:

- Never log sensitive ServiceNow data (credentials, tokens, user data)
- Implement proper OAuth2 flows for ServiceNow authentication
- Validate all inputs to prevent injection attacks
- Follow principle of least privilege for ServiceNow API access
- Encrypt sensitive configuration data at rest

## Current Phase

The project is currently in the setup phase. To begin development:

1. Start Phase 1 (Requirements) by reading [.CodeMaestro/prompts/01-requirements.md](.CodeMaestro/prompts/01-requirements.md)
2. Follow the phase workflow to gather requirements and create specifications
3. Use the natural language interface to interact with the framework
4. Progress through phases sequentially, meeting quality gates at each boundary

## Framework Removal

Before final release, run `./cleanup.sh` to remove CodeMaestro framework files (`.CodeMaestro/`, `cleanup.sh`, and optionally this `CLAUDE.md`), leaving only the Lumos implementation and necessary documentation.

## Version

**Project:** Lumos
**Framework:** CodeMaestro v1.1.0 (Phoenix)
**Last Updated:** 2026-01-28
