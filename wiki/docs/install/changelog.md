# HomelabARR CE Changelog

Latest releases and what changed in each.


## [Unreleased]

### ⬆️ Dependencies & Framework
- **React 18 → 19**: upgraded `react`, `react-dom`, and their `@types` to 19.2.7. Resolves the recurring mismatched-major hazard where Dependabot tried to bump `react-dom` to 19 alone.
- **shadcn/ui modernization**: all `React.forwardRef` wrappers across the 16 `ui/` components converted to React 19 ref-as-prop. No behavioral change.
- **lucide-react 0.344 → 1.21** (React 19 peer support), **radix-ui** group to latest, **dockerode** 4 → 5, **better-sqlite3** 12.11.1, **nodemailer** 8 → 9, **@types/node** 26.

### ✅ Tests
- Added the project's first unit test (`server/email.test.js`) covering the email transporter and nodemailer 9.

---

## [v2.2.0] - April 14, 2026

### 🐛 Bug Fixes (Backported from Eight.ly fork)
- **Container delete/stop/restart**: Docker client was never passed to the CLI manager. All container operations now work correctly. ([#146](https://github.com/imogenlabs/homelabarr-ce/pull/146))
- **Docker socket permissions**: Apps that mount `docker.sock` (Portainer, etc.) now get `group_add` injected at deploy time so they can read/write the socket. ([#146](https://github.com/imogenlabs/homelabarr-ce/pull/146))
- **Read-only template volumes**: Temp deploy YAMLs now write to `server/data/` instead of next to the source YAML, so deploys don't fail with EACCES on read-only mounts. ([#146](https://github.com/imogenlabs/homelabarr-ce/pull/146))
- **Deploy progress stream**: SSE `connected` event now includes the server-assigned `clientId`, fixing "Client not found" 500s on subscribe. ([#146](https://github.com/imogenlabs/homelabarr-ce/pull/146))

### 🔒 Security
- **npm vulnerabilities patched**: vite, hono, @hono/node-server bumped to address 9 advisories (3 high, 6 moderate). ([#145](https://github.com/imogenlabs/homelabarr-ce/pull/145))
- **Workflow permissions**: Added explicit `permissions: contents: read` to all workflows missing it. Resolves CodeQL alert. ([#144](https://github.com/imogenlabs/homelabarr-ce/pull/144))

### 📚 Documentation
- **Wiki cleanup**: Removed Professional Edition section; replaced placeholder octopus with optimized v3b WebP at proper sizes. ([#147](https://github.com/imogenlabs/homelabarr-ce/pull/147))

---

## [v2.0.0] - September 2025

### 🗄️ ARCHIVED COMPONENTS
- **Mount Enhanced Legacy System**: Moved obsolete cloud storage mounting system to archives
  - **Location**: `MASTER_DOCUMENTATION/8_ARCHIVES/OBSOLETE_COMPONENTS/mount-enhanced-legacy/`
  - **Reason**: Technology shift from cloud storage to local NAS solutions
  - **Impact**: Zero impact on core system functionality
  - **Components Archived**:
    - Complete Node.js backend with multi-provider integration
    - Docker configuration and deployment files
    - Technical documentation and setup guides
    - API documentation and troubleshooting guides

### 📋 CONTEXT
- **Google Drive Unlimited Ended**: Original use case no longer viable
- **Community Shift**: Users moved to local NAS solutions (Synology, QNAP, Unraid, TrueNAS)
- **Simplified Architecture**: Focus on Docker + local storage integration
- **Code Preservation**: All functionality preserved in archive for future reference

### ✅ SYSTEM STATUS
- **Core Functionality**: Unaffected
- **Docker Management**: Fully operational
- **Application Deployment**: All 100+ applications available
- **Traefik + Authelia**: Fully functional
- **React Frontend**: Enhanced and optimized
- **CLI Bridge**: Seamless shell script integration

---

## Previous Versions
*Historical changelog entries would be added here as the system evolves*