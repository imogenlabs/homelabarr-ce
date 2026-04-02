# HomelabARR CLI Preinstall

The preinstall process sets up the core infrastructure required for HomelabARR CLI operation.

## What Gets Installed

### System Updates & Dependencies
- System package updates and security patches
- Essential packages: `rsync`, `curl`, `wget`, `fail2ban`, etc.
- Network configuration optimizations
- Security hardening (IPv6 disabled, file limits raised)

### Docker & Container Runtime
- **Docker Engine** - Latest stable version from Docker's official repository
- **Docker Compose** - Container orchestration tool
- **Docker Daemon Configuration** - Optimized settings for media server workloads

### Local-Persist Volume Plugin (NEW - Containerized)
- **Container-based deployment** replacing the old binary installation
- **Persistent volume support** for data that survives container removal
- **Custom mountpoint support** for flexible storage configuration

#### Local-Persist Container Details:
```bash
Container Name: local-persist
Image: ghcr.io/smashingtags/homelabarr-cli/docker-local-persist:latest
Restart Policy: unless-stopped
Privileges: Required for volume plugin functionality
Source: Official HomelabARR CLI custom container with enhanced features
```

#### Volume Mounts:
- `/run/docker/plugins/` - Plugin socket communication
- `/var/lib/docker/plugin-data/` - Plugin metadata persistence
- `/mnt` - Main media storage mountpoint
- `/opt/appdata` - Application data directory
- `/var/run/docker.sock` - Docker daemon communication

### Network Infrastructure
- **Proxy Network** - Bridge network for Traefik routing
- **Default Volume Creation** - `unionfs` volume at `/mnt` mountpoint

### Security & Monitoring
- **Fail2Ban** - Intrusion prevention system
- **Log4j Protection** - Filters for Log4j vulnerability attempts
- **Authelia Integration** - Authentication middleware filters
- **IP Blocking** - Automatic blocking of known malicious IPs

### Ansible Configuration
- **Ansible Installation** - For application deployment automation
- **Local Inventory** - Configured for localhost deployment
- **Custom Configuration** - Optimized for HomelabARR CLI requirements

## Installation Process

### Supported Operating Systems
- **Ubuntu** (18.04, 20.04, 22.04, 24.04)
- **Debian** (10, 11, 12)
- **Raspberry Pi OS** (Debian-based)

### Requirements
- **Fresh OS Installation** - Clean server recommended
- **Root Access** - Installation requires sudo/root privileges
- **Internet Connection** - For downloading packages and containers
- **Minimum Resources**: 2 CPU cores, 4GB RAM, 20GB disk

### Running Preinstall

```bash
# Navigate to HomelabARR CLI directory
cd /path/to/homelabarr-cli

# Run preinstall (auto-detects OS)
sudo ./preinstall/install.sh
```

### What Happens During Installation

1. **System Preparation**
   - Package updates and essential software installation
   - Network and security optimizations
   - User and permission setup

2. **Docker Installation**
   - Official Docker repository setup
   - Docker Engine and Compose installation
   - Daemon configuration and service enablement

3. **Local-Persist Plugin Deployment**
   - Container deployment with proper privileges
   - Volume plugin socket creation
   - Default `unionfs` volume creation

4. **Security Hardening**
   - Fail2Ban configuration with custom filters
   - Firewall rules and IP blocking
   - Log rotation and monitoring setup

5. **Final Configuration**
   - Service enablement and startup
   - Permission verification
   - Installation validation

## Post-Installation

### Verification Commands
```bash
# Check Docker status
sudo systemctl status docker

# Verify local-persist container
docker ps | grep local-persist

# Check volume plugin
docker volume ls --filter driver=local-persist

# Test volume creation
docker volume create -d local-persist -o mountpoint=/tmp/test --name=test-volume
```

### Troubleshooting

#### Local-Persist Plugin Issues
```bash
# Check container logs
docker logs local-persist

# Restart plugin
docker restart local-persist

# Verify plugin socket
ls -la /run/docker/plugins/local-persist.sock

# Use management script
./scripts/manage-local-persist.sh status
```

#### Docker Issues
```bash
# Check Docker daemon
sudo systemctl status docker

# View Docker logs
sudo journalctl -u docker.service

# Restart Docker
sudo systemctl restart docker
```

#### Permission Issues
```bash
# Fix appdata permissions
sudo chown -R 1000:1000 /opt/appdata

# Fix mount permissions
sudo chown -R 1000:1000 /mnt
```

## Directory Structure After Installation

```
/opt/appdata/           # Application configuration data
  ├── compose/          # Temporary compose files
  ├── authelia/         # Authentication service config
  ├── traefik/          # Reverse proxy configuration
  └── <app-name>/       # Individual app data directories

/mnt/                   # Media storage (unionfs mountpoint)
  ├── downloads/        # Download client storage
  ├── unionfs/          # Merged filesystem view
  ├── torrent/          # Torrent data
  └── nzb/             # Usenet data

/var/lib/docker/plugin-data/  # Plugin metadata storage
/run/docker/plugins/          # Plugin socket files
```

## Migration Notes

### From Binary Local-Persist
If upgrading from the old binary installation:

1. **Stop binary service** (automatic during upgrade)
2. **Container deployment** replaces binary
3. **Existing volumes preserved** - no data migration needed
4. **Socket location unchanged** - full compatibility maintained

### Legacy Support
The detection logic supports multiple installation types:
- ✅ **Containerized** (new default)
- ✅ **Binary installation** (legacy support)
- ✅ **Docker plugin** (alternative method)

## Next Steps

After successful preinstall:

1. **Deploy Traefik** - `sudo ./traefik/install.sh`
2. **Install Applications** - `sudo ./apps/install.sh`
3. **Configure Services** - Follow application-specific setup guides

## Environment Variables

Key variables set during installation:

```bash
DOCKER_CONFIG=/etc/docker/daemon.json
APPFOLDER=/opt/appdata
UNIONFS_MOUNT=/mnt
PLUGIN_DATA=/var/lib/docker/plugin-data
```

## Security Considerations

### Container Privileges
The local-persist container runs with `--privileged` flag:
- **Required**: For volume plugin functionality
- **Scope**: Limited to volume operations
- **Isolation**: Container-based isolation maintained

### Network Access
- **Docker socket access**: Required for plugin communication
- **Host filesystem access**: Limited to specified mount points
- **Network isolation**: Runs on bridge network

### File System Permissions
- **User 1000:1000**: Standard HomelabARR CLI user
- **Restrictive permissions**: Only necessary access granted
- **SELinux/AppArmor**: Compatible with security frameworks

## Contributing

To modify the preinstall process:

1. **Test changes** in isolated environment
2. **Update documentation** for any new features
3. **Verify compatibility** across supported OS versions
4. **Include migration notes** for breaking changes

## Support

For preinstall issues:
- 📖 **Documentation**: Check troubleshooting section above
- 🛠️ **Scripts**: Use `./scripts/manage-local-persist.sh`
- 💬 **Community**: Discord support channel
- 🐛 **Bugs**: GitHub issues with installation logs
