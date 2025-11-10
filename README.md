# Nextcloud Calendar MCP Server

An MCP (Model Context Protocol) server that enables Claude Desktop to interact with your Nextcloud calendar via CalDAV.

## Features

- **list_calendars**: List all available calendars
- **get_events**: Get events from a calendar with optional date filtering
- **create_event**: Create new calendar events
- **update_event**: Update existing events
- **delete_event**: Delete calendar events

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Project

```bash
npm run build
```

### 3. Configure Nextcloud Credentials

Copy the example config and fill in your credentials:

```bash
cp config.example.json config.json
```

Edit `config.json` with your Nextcloud details:

```json
{
  "nextcloud": {
    "serverUrl": "https://your-nextcloud-instance.com",
    "username": "your-username",
    "password": "your-app-password",
    "calendarPath": "/remote.php/dav/calendars/your-username/"
  }
}
```

**Important**: Use an app-specific password instead of your main Nextcloud password. You can generate one in your Nextcloud settings under Security.

### 4. Configure Claude Desktop

Add this MCP server to your Claude Desktop configuration file:

**On macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**On Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

**On Linux**: `~/.config/Claude/claude_desktop_config.json`

Add the following to your config:

```json
{
  "mcpServers": {
    "nextcloud-calendar": {
      "command": "node",
      "args": ["/home/USER/SOMEFOLDER/calendarhelper/dist/index.js"]
    }
  }
}
```

Make sure to update the path to match your actual installation directory.

### 5. Restart Claude Desktop

After adding the configuration, restart Claude Desktop completely for the changes to take effect.

## Usage

Once configured, you can interact with your Nextcloud calendar through Claude Desktop using natural language:

- "List my calendars"
- "Show me my events for next week"
- "Create a meeting tomorrow at 2pm for 1 hour called 'Team Sync'"
- "Update the event 'Team Sync' to start at 3pm instead"
- "Delete the event 'Old Meeting'"

## Development

### Watch Mode

For development with auto-compilation:

```bash
npm run dev
```

### Testing the Server

You can test the server manually by running:

```bash
node dist/index.js
```

The server communicates over stdio using the MCP protocol.

## Security Notes

- The `config.json` file is excluded from git to protect your credentials
- Always use app-specific passwords, never your main Nextcloud password
- This tool is designed for personal use with hardcoded credentials
- Keep your `config.json` file secure and never share it

## Date Format

All dates should be provided in ISO 8601 format: `YYYY-MM-DDTHH:mm:ss`

Examples:
- `2025-11-15T14:00:00` (3rd November 2025, 2:00 PM)
- `2025-12-25T09:30:00` (25th December 2025, 9:30 AM)

## Troubleshooting

### Server not showing in Claude Desktop

1. Check that the path in `claude_desktop_config.json` is correct
2. Ensure the project is built (`npm run build`)
3. Restart Claude Desktop completely
4. Check Claude Desktop logs for errors

### Authentication errors

1. Verify your Nextcloud URL is correct (include `https://`)
2. Confirm you're using an app-specific password
3. Check that your username is correct
4. Test your credentials by logging into Nextcloud web interface

### Events not showing

1. Verify the calendar URL using `list_calendars` first
2. Check the date range format (ISO 8601)
3. Ensure you have events in the specified date range

## License

MIT
