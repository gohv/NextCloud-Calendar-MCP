#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { loadConfig } from './config.js';
import {
  listCalendars,
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} from './caldav-client.js';

// Load configuration at startup
loadConfig();

const server = new Server(
  {
    name: 'nextcloud-calendar-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_calendars',
        description:
          'List all available calendars in your Nextcloud account. Returns calendar names, URLs, and descriptions.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_events',
        description:
          'Get events from a specific calendar. Optionally filter by date range using ISO 8601 format (YYYY-MM-DDTHH:mm:ss).',
        inputSchema: {
          type: 'object',
          properties: {
            calendarUrl: {
              type: 'string',
              description: 'The URL of the calendar (from list_calendars)',
            },
            startDate: {
              type: 'string',
              description:
                'Optional: Start date in ISO 8601 format (e.g., 2025-01-01T00:00:00)',
            },
            endDate: {
              type: 'string',
              description:
                'Optional: End date in ISO 8601 format (e.g., 2025-12-31T23:59:59)',
            },
          },
          required: ['calendarUrl'],
        },
      },
      {
        name: 'create_event',
        description:
          'Create a new calendar event. All dates should be in ISO 8601 format (YYYY-MM-DDTHH:mm:ss).',
        inputSchema: {
          type: 'object',
          properties: {
            calendarUrl: {
              type: 'string',
              description: 'The URL of the calendar where the event will be created',
            },
            summary: {
              type: 'string',
              description: 'The title/summary of the event',
            },
            start: {
              type: 'string',
              description:
                'Start date and time in ISO 8601 format (e.g., 2025-11-15T14:00:00)',
            },
            end: {
              type: 'string',
              description:
                'End date and time in ISO 8601 format (e.g., 2025-11-15T15:00:00)',
            },
            description: {
              type: 'string',
              description: 'Optional: Detailed description of the event',
            },
            location: {
              type: 'string',
              description: 'Optional: Location of the event',
            },
          },
          required: ['calendarUrl', 'summary', 'start', 'end'],
        },
      },
      {
        name: 'update_event',
        description:
          'Update an existing calendar event. All dates should be in ISO 8601 format (YYYY-MM-DDTHH:mm:ss).',
        inputSchema: {
          type: 'object',
          properties: {
            eventUrl: {
              type: 'string',
              description: 'The URL of the event to update (from get_events)',
            },
            etag: {
              type: 'string',
              description: 'The etag of the event (from get_events) for conflict detection',
            },
            summary: {
              type: 'string',
              description: 'The title/summary of the event',
            },
            start: {
              type: 'string',
              description:
                'Start date and time in ISO 8601 format (e.g., 2025-11-15T14:00:00)',
            },
            end: {
              type: 'string',
              description:
                'End date and time in ISO 8601 format (e.g., 2025-11-15T15:00:00)',
            },
            description: {
              type: 'string',
              description: 'Optional: Detailed description of the event',
            },
            location: {
              type: 'string',
              description: 'Optional: Location of the event',
            },
            status: {
              type: 'string',
              description: 'Optional: Event status (CONFIRMED, TENTATIVE, CANCELLED)',
            },
          },
          required: ['eventUrl', 'etag', 'summary', 'start', 'end'],
        },
      },
      {
        name: 'delete_event',
        description: 'Delete a calendar event.',
        inputSchema: {
          type: 'object',
          properties: {
            eventUrl: {
              type: 'string',
              description: 'The URL of the event to delete (from get_events)',
            },
            etag: {
              type: 'string',
              description: 'The etag of the event (from get_events) for conflict detection',
            },
          },
          required: ['eventUrl', 'etag'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'list_calendars': {
        const calendars = await listCalendars();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(calendars, null, 2),
            },
          ],
        };
      }

      case 'get_events': {
        const { calendarUrl, startDate, endDate } = args as {
          calendarUrl: string;
          startDate?: string;
          endDate?: string;
        };

        const events = await getEvents(calendarUrl, startDate, endDate);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(events, null, 2),
            },
          ],
        };
      }

      case 'create_event': {
        const { calendarUrl, summary, start, end, description, location } = args as {
          calendarUrl: string;
          summary: string;
          start: string;
          end: string;
          description?: string;
          location?: string;
        };

        const eventUrl = await createEvent(calendarUrl, {
          summary,
          start,
          end,
          description,
          location,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Event created successfully. URL: ${eventUrl}`,
            },
          ],
        };
      }

      case 'update_event': {
        const { eventUrl, etag, summary, start, end, description, location, status } =
          args as {
            eventUrl: string;
            etag: string;
            summary: string;
            start: string;
            end: string;
            description?: string;
            location?: string;
            status?: string;
          };

        await updateEvent(eventUrl, etag, {
          summary,
          start,
          end,
          description,
          location,
          status,
        });

        return {
          content: [
            {
              type: 'text',
              text: 'Event updated successfully.',
            },
          ],
        };
      }

      case 'delete_event': {
        const { eventUrl, etag } = args as {
          eventUrl: string;
          etag: string;
        };

        await deleteEvent(eventUrl, etag);

        return {
          content: [
            {
              type: 'text',
              text: 'Event deleted successfully.',
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Nextcloud Calendar MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
