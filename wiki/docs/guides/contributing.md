# Contributing to HomelabARR CE

We welcome contributions from the community! This guide will help you get started with contributing to HomelabARR CE.

## Ways to Contribute

### 1. 🐛 Bug Reports
- Report issues through [GitHub Issues](https://github.com/smashingtags/homelabarr-ce/issues)
- Use the bug report template
- Include system information and logs
- Test with minimal reproduction steps

### 2. 💡 Feature Requests
- Propose new features via GitHub Issues
- Discuss implementation approach
- Consider backward compatibility
- Provide use case examples

### 3. 📝 Documentation
- Improve existing documentation
- Add missing guides and tutorials
- Fix typos and formatting
- Translate documentation (future)

### 4. 📦 Container Applications
- Add new application containers
- Update existing application configs
- Test and validate deployments
- Maintain application documentation

### 5. 🔧 Core Development
- CLI improvements and modernization
- Installation script enhancements
- Infrastructure automation
- Performance optimizations

## Development Setup

### Prerequisites
```bash
# Required tools
sudo apt update
sudo apt install -y git docker.io docker-compose-plugin

# Optional: Development tools
sudo apt install -y python3 python3-pip nodejs npm
```

### Fork and Clone
```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/homelabarr-ce.git
cd homelabarr-ce

# Add upstream remote
git remote add upstream https://github.com/smashingtags/homelabarr-ce.git
```

### Repository Structure Overview

Understand the organized repository structure:

```bash
# User-facing components
ls apps/                    # Docker applications by category
ls wiki/docs/              # User documentation
ls scripts/                # User utility scripts

# Maintenance and development (organized August 2025)
ls .claude/scripts/         # Active maintenance tools
ls .claude/development-scripts/  # Development utilities
ls .claude/analysis/        # Project analysis reports

# Check project status and guidelines
cat .claude/README.md                    # Directory overview
cat .claude/MODERNIZATION_CHECKLIST.md  # Current project status
```

### Development Environment
```bash
# Set up Local Mode for testing
./install-local.sh

# Or set up development environment
cp .env.example .env.dev
# Edit .env.dev with your settings

# Use maintenance tools for bulk operations
.claude/scripts/clean-yaml-files.sh     # YAML standardization
.claude/scripts/fix-discord-links.sh    # Link updates
```

## Container Development

### Adding New Applications

1. **Create Application YAML**
```bash
# Choose appropriate category
cd apps/[category]/

# Create application file
cp template.yml new-app.yml
```

2. **YAML Structure**
```yaml
version: "3.8"

services:
  new-app:
    image: ${NEWAPPIMAGE}
    container_name: new-app
    hostname: new-app
    restart: ${RESTARTAPP}
    security_opt:
      - ${SECURITYOPS}:${SECURITYOPSSET}
    environment:
      - PUID=${ID}
      - PGID=${ID}
      - TZ=${TZ}
      - UMASK=${UMASK}
    volumes:
      - new-app-data:/config
    networks:
      - ${DOCKERNETWORK}
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.new-app.rule=Host(`new-app.${DOMAIN}`)"
      - "traefik.http.services.new-app.loadbalancer.server.port=8080"
      - "flame.type=application"
      - "flame.name=New App"
      - "flame.url=https://new-app.${DOMAIN}"
      - "flame.icon=icon-name"

volumes:
  new-app-data:
    driver: local
    driver_opts:
      mountpoint: ${APPFOLDER}/new-app

networks:
  proxy:
    external: true
```

3. **Environment Variables**
Add to appropriate `.env` template:
```bash
NEWAPPIMAGE=image/name:latest
```

4. **Documentation**
Create `wiki/docs/apps/[category]/new-app.md`:
```markdown
# New App

## Description
Brief description of the application.

## Configuration
Setup instructions and important notes.

## Access
- **URL**: https://new-app.yourdomain.com
- **Default Credentials**: admin/admin

## Troubleshooting
Common issues and solutions.
```

### Testing Containers

```bash
# Validate YAML syntax
docker compose -f apps/category/new-app.yml --env-file .env.test config

# Test deployment
docker compose -f apps/category/new-app.yml --env-file .env.test up -d

# Verify functionality
docker ps --filter "name=new-app"
docker logs new-app

# Clean up
docker compose -f apps/category/new-app.yml --env-file .env.test down
```

## Documentation Development

### MkDocs Setup
```bash
# Install dependencies
cd wiki
pip3 install -r requirements.txt

# Serve locally
mkdocs serve
# Open http://localhost:8000
```

### Documentation Standards

#### File Structure
```
wiki/docs/
├── apps/           # Application documentation
├── guides/         # User guides
├── install/        # Installation guides
├── commands/       # CLI commands
└── releases/       # Release notes
```

#### Writing Guidelines
- Use clear, concise language
- Include code examples
- Add screenshots for UI steps
- Follow Markdown best practices
- Test all instructions

#### Markdown Style
```markdown
# Page Title

## Section Header

### Subsection

**Bold text** for emphasis
*Italic text* for variables
`code` for commands

```bash
# Code blocks with syntax highlighting
sudo ./install.sh
```

!!! note "Information Box"
    Use admonitions for important notes.

!!! warning "Warning"
    Critical information that users must know.
```

## Code Quality Standards

### Shell Scripts
```bash
#!/bin/bash
set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Use functions
function setup_environment() {
    local env_file="$1"
    # Function implementation
}

# Error handling
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed" >&2
    exit 1
fi
```

### YAML Files
- Use 2-space indentation
- Quote string values consistently
- Use environment variables for customization
- Include helpful comments

### Commit Standards
```bash
# Conventional Commits format
feat: add new application support
fix: resolve container startup issue
docs: update installation guide
refactor: simplify installer script
test: add container validation tests
```

## Testing Guidelines

### Manual Testing
1. **Fresh Installation Test**
   - Test on clean Ubuntu 22.04 system
   - Verify both Local and Full modes
   - Document any issues encountered

2. **Application Testing**
   - Deploy individual applications
   - Verify web interface accessibility
   - Test basic functionality
   - Check log output for errors

3. **Upgrade Testing**
   - Test updates from previous versions
   - Verify data persistence
   - Confirm configuration migration

### Automated Testing
```bash
# YAML validation (use organized tools)
.claude/scripts/clean-yaml-files.sh --validate-only

# Manual YAML check if needed
find apps/ -name "*.yml" -exec docker compose -f {} config \;

# Script validation
shellcheck scripts/*.sh
shellcheck .claude/scripts/*.sh

# Documentation build test
cd wiki && mkdocs build --strict
```

### Using Maintenance Tools

The repository includes organized maintenance tools in `.claude/scripts/`:

```bash
# YAML standardization and cleanup
.claude/scripts/clean-yaml-files.sh

# Discord link updates across codebase
.claude/scripts/fix-discord-links.sh

# Repository URL updates
.claude/scripts/update-repository-urls.sh

# Create configuration backup before changes
cp -r apps/ .claude/backups/apps_$(date +%Y%m%d)/
```

## Submission Process

### Pull Request Workflow

1. **Create Feature Branch**
```bash
git checkout -b feature/new-application
# or
git checkout -b fix/installation-issue
# or
git checkout -b docs/update-guide
```

2. **Make Changes**
- Follow coding standards
- Update documentation
- Test thoroughly
- Commit with descriptive messages

3. **Update Local Branch**
```bash
git fetch upstream
git rebase upstream/master
```

4. **Submit Pull Request**
- Use descriptive title
- Fill out PR template completely
- Include testing evidence
- Reference related issues

### PR Requirements
- [ ] Code follows project standards
- [ ] Documentation updated if needed
- [ ] Testing completed
- [ ] No breaking changes (or clearly documented)
- [ ] Commit messages follow convention
- [ ] Used appropriate maintenance tools from `.claude/scripts/`
- [ ] Updated `.claude/MODERNIZATION_CHECKLIST.md` if applicable
- [ ] Created backups in `.claude/backups/` for significant changes

## Community Guidelines

### Communication
- Be respectful and constructive
- Use inclusive language
- Help newcomers learn
- Share knowledge freely

### Code of Conduct
We follow the [Contributor Covenant Code of Conduct](../CONTRIBUTING.md).

### Getting Help
- **Discord**: [HomelabARR Community](https://discord.gg/Pc7mXX786x)
- **GitHub Discussions**: Project Q&A
- **GitHub Issues**: Bug reports and feature requests

## Recognition

Contributors are recognized in:
- Repository README
- Release notes
- Community Discord
- Annual contributor highlights

### Maintainer Path
Active contributors may be invited to join the maintainer team with:
- Commit access
- Review responsibilities
- Community leadership opportunities

## Development Roadmap

### Current Sprint Focus
1. **CLI Modernization** (Go/Bubble Tea)
2. **GitHub Organization Migration**
3. **Documentation Consolidation**
4. **Container Infrastructure Maturity**

### Future Priorities
- Kubernetes support
- API development
- Enhanced monitoring
- Multi-architecture support

## Resources

### Documentation
- [Architecture Overview](architecture.md)
- [Deployment Guide](deployment-guide.md)
- [Local Mode Guide](../install/local-mode.md)

### External Tools
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [MkDocs Documentation](https://www.mkdocs.org/)

## Other Ways to Support

Beyond code contributions, you can support HomelabARR CE development:

**☕ [Support on Ko-fi](https://ko-fi.com/homelabarr)** - Help fund development time, infrastructure costs, and project maintenance!

Your support helps us:
- 🔧 Dedicate more time to development and maintenance
- 📚 Improve documentation and guides
- 🚀 Cover hosting and infrastructure costs
- 🐛 Prioritize bug fixes and feature requests

---

**Thank you for contributing to HomelabARR CE!**

*Together we're building the best self-hosted media server solution.*

---
