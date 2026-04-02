# cyb3rgh05t Integration Documentation

## Overview
Integration of valuable tools from cyb3rgh05t's repositories into HomelabARR, enhancing monitoring, Discord integration, and dashboard capabilities.

## New Integrations

### 1. Plex-Tautulli Dashboard
**Source**: https://github.com/cyb3rgh05t/plex-tautulli-dashboard  
**Location**: `apps/addons/plex-tautulli-dashboard/`  
**Purpose**: Advanced monitoring dashboard combining Plex and Tautulli data

**Features**:
- 13 customizable themes
- Real-time playback monitoring
- Library statistics
- Recently added content
- Playback history
- User activity tracking

**Configuration**:
```yaml
- PLEX_URL=http://plex:32400
- PLEX_TOKEN=${PLEX_TOKEN}
- TAUTULLI_URL=http://tautulli:8181
- TAUTULLI_API_KEY=${TAUTULLI_API_KEY}
```

**Access**: https://dashboard.${DOMAIN}

### 2. Discord Plex Bot
**Source**: https://github.com/cyb3rgh05t/discord-bot  
**Location**: `apps/addons/discord-plex-bot/`  
**Purpose**: Discord bot for Plex notifications and control

**Features**:
- Now playing notifications
- Library statistics
- New content alerts
- Playback control via Discord
- Request system integration (optional)

**Required Environment Variables**:
```bash
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_GUILD_ID=your_server_id
DISCORD_CHANNEL_ID=notification_channel_id
PLEX_TOKEN=your_plex_token
```

### 3. Tauticord (Alternative Discord Bot)
**Source**: https://github.com/nwithan8/tauticord  
**Location**: `apps/addons/tauticord/`  
**Purpose**: Specialized Tautulli-Discord integration with advanced features

**Features**:
- Voice channel statistics
- Bandwidth monitoring
- Transcode tracking
- Library refresh stats
- Performance monitoring
- Embedded rich messages
- Activity status updates

**Unique Capabilities**:
- Real-time voice channel stats
- Bandwidth breakdown (local/remote)
- Plex server status monitoring
- Customizable embed colors

## Storage Monitoring Research

### Docker Mod: Storage Check
**Source**: https://github.com/cyb3rgh05t/docker-mod-storagecheck  
**Status**: Under Investigation

**Potential Integration**:
- Could be integrated as a Docker mod for media containers
- Would provide disk space monitoring
- Alert on low storage conditions
- Useful for preventing download failures

**Next Steps**:
1. Analyze mod functionality
2. Test compatibility with LinuxServer containers
3. Create integration documentation if viable

## Theme.Park Enhancements
**Source**: https://github.com/cyb3rgh05t/theme.park  
**Note**: HomelabARR already includes theme.park, but cyb3rgh05t may have custom themes

**Review Status**: Pending
- Check for unique theme additions
- Evaluate custom CSS modifications
- Consider incorporating beneficial changes

## Installation Instructions

### Setting Up Discord Bots

1. **Create Discord Application**:
   - Go to https://discord.com/developers/applications
   - Create new application
   - Navigate to Bot section
   - Create bot and copy token

2. **Get Server and Channel IDs**:
   - Enable Developer Mode in Discord
   - Right-click server → Copy ID (DISCORD_GUILD_ID)
   - Right-click channel → Copy ID (DISCORD_CHANNEL_ID)

3. **Add to .env file**:
```bash
# Discord Configuration
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_GUILD_ID=your_server_id
DISCORD_CHANNEL_ID=your_channel_id
DISCORD_ADMIN_IDS=admin_user_id1,admin_user_id2
DISCORD_PREFIX=!

# Tautulli Configuration
TAUTULLI_API_KEY=your_tautulli_api_key
```

### Deployment Order

1. Ensure Plex and Tautulli are running
2. Deploy Plex-Tautulli Dashboard:
   ```bash
   docker-compose -f apps/addons/plex-tautulli-dashboard/docker-compose.yml up -d
   ```

3. Choose ONE Discord bot:
   - For general use: `discord-plex-bot`
   - For advanced stats: `tauticord`

4. Deploy chosen bot:
   ```bash
   docker-compose -f apps/addons/[chosen-bot]/docker-compose.yml up -d
   ```

## Benefits to HomelabARR Users

1. **Enhanced Monitoring**: Beautiful dashboard with 13 themes
2. **Discord Integration**: Real-time notifications and control
3. **Community Features**: Share stats with Discord community
4. **Flexibility**: Choose between general or specialized Discord bots
5. **Professional Appearance**: Modern UI for Plex statistics

## Comparison: Discord Bots

| Feature | discord-plex-bot | tauticord |
|---------|-----------------|-----------|
| Basic Notifications | ✅ | ✅ |
| Voice Channel Stats | ❌ | ✅ |
| Bandwidth Monitoring | ❌ | ✅ |
| Playback Control | ✅ | ❌ |
| Request Integration | ✅ | ❌ |
| Rich Embeds | ✅ | ✅ |
| Performance Metrics | ❌ | ✅ |
| Setup Complexity | Simple | Moderate |

## Future Enhancements

1. **Unified Dashboard**: Integrate all monitoring into single interface
2. **Alert System**: Centralized alerting across all monitoring tools
3. **Custom Themes**: Port cyb3rgh05t's unique themes to all apps
4. **Storage Automation**: Auto-cleanup based on storage monitoring

## Credits

- **cyb3rgh05t**: Original creator of dashboard and Discord bot
- **nwithan8**: Creator of Tauticord
- **HomelabARR Team**: Integration and documentation

## Support

For issues with these integrations:
1. Check container logs: `docker logs [container-name]`
2. Verify environment variables
3. Ensure dependencies (Plex/Tautulli) are running
4. Join HomelabARR Discord for community support

---

*Last Updated: January 2025*  
*Integration Version: 1.0.0*