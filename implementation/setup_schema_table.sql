-- ============================================================================
-- SUPABASE SCHEMA SETUP
-- ============================================================================
-- Purpose: Create api_schemas table and insert initial Gorgias schema
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- ═══════════════════════════════════════
-- STEP 1: Create api_schemas table
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS api_schemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  version TEXT NOT NULL,
  schema_data JSONB NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  -- Ensure only one active version per service
  UNIQUE(service_name, version)
);

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_api_schemas_service_version
  ON api_schemas(service_name, version)
  WHERE is_active = true;

-- Add index for searching by service
CREATE INDEX IF NOT EXISTS idx_api_schemas_service
  ON api_schemas(service_name);

-- ═══════════════════════════════════════
-- STEP 2: Create updated_at trigger
-- ═══════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_api_schemas_updated_at
  BEFORE UPDATE ON api_schemas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════
-- STEP 3: Insert Gorgias API schema
-- ═══════════════════════════════════════

INSERT INTO api_schemas (service_name, version, description, schema_data)
VALUES (
  'gorgias',
  'v1',
  'Gorgias Support Ticket Management API',
  '{
    "service": "gorgias",
    "version": "v1",
    "base_url": "https://ironsidecomputers.gorgias.com",
    "auth": {
      "type": "basic",
      "credential_id": "00RVVUesFbtpYkL5"
    },
    "endpoints": [
      {
        "id": "list_tickets",
        "path": "/api/tickets",
        "method": "GET",
        "description": "List tickets with optional filters",
        "parameters": {
          "query": [
            {
              "name": "status",
              "type": "string",
              "enum": ["open", "closed", "pending", "all"],
              "required": false,
              "description": "Filter tickets by status"
            },
            {
              "name": "priority",
              "type": "string",
              "enum": ["low", "normal", "high", "urgent"],
              "required": false,
              "description": "Filter tickets by priority"
            },
            {
              "name": "limit",
              "type": "number",
              "default": 50,
              "required": false,
              "description": "Maximum number of tickets to return"
            }
          ]
        },
        "response": {
          "type": "list",
          "path": "data"
        }
      },
      {
        "id": "get_ticket",
        "path": "/api/tickets/{ticket_id}",
        "method": "GET",
        "description": "Get details of a specific ticket by ID",
        "parameters": {
          "path": [
            {
              "name": "ticket_id",
              "type": "string",
              "required": true,
              "description": "Ticket ID to retrieve"
            }
          ]
        },
        "response": {
          "type": "object"
        }
      },
      {
        "id": "create_ticket",
        "path": "/api/tickets",
        "method": "POST",
        "description": "Create a new support ticket",
        "parameters": {
          "body": {
            "subject": {
              "type": "string",
              "required": true,
              "description": "Ticket subject"
            },
            "message": {
              "type": "string",
              "required": true,
              "description": "Ticket message"
            },
            "customer_email": {
              "type": "string",
              "required": true,
              "description": "Customer email address"
            },
            "priority": {
              "type": "string",
              "enum": ["low", "normal", "high", "urgent"],
              "default": "normal",
              "required": false
            }
          }
        },
        "response": {
          "type": "object"
        }
      },
      {
        "id": "assign_ticket",
        "path": "/api/tickets/{ticket_id}",
        "method": "PUT",
        "description": "Assign a ticket to an agent",
        "parameters": {
          "path": [
            {
              "name": "ticket_id",
              "type": "string",
              "required": true
            }
          ],
          "body": {
            "assignee_email": {
              "type": "string",
              "required": true,
              "description": "Email of agent to assign to"
            }
          }
        },
        "response": {
          "type": "object"
        }
      },
      {
        "id": "close_ticket",
        "path": "/api/tickets/{ticket_id}",
        "method": "PUT",
        "description": "Close a ticket",
        "parameters": {
          "path": [
            {
              "name": "ticket_id",
              "type": "string",
              "required": true
            }
          ],
          "body": {
            "status": {
              "type": "string",
              "default": "closed",
              "required": false
            }
          }
        },
        "response": {
          "type": "object"
        }
      },
      {
        "id": "search_tickets",
        "path": "/api/tickets/search",
        "method": "POST",
        "description": "Search for tickets using text query",
        "parameters": {
          "body": {
            "search": {
              "type": "string",
              "required": true,
              "description": "Search query text"
            },
            "filters": {
              "type": "string",
              "required": false,
              "default": ""
            }
          }
        },
        "response": {
          "type": "list",
          "path": "data"
        }
      },
      {
        "id": "analyze_insights",
        "path": "/api/tickets",
        "method": "GET",
        "description": "Analyze tickets to identify patterns and insights",
        "parameters": {
          "query": [
            {
              "name": "limit",
              "type": "number",
              "default": 100,
              "required": false
            }
          ]
        },
        "response": {
          "type": "list",
          "path": "data"
        },
        "post_process": "analytics_pipeline"
      }
    ],
    "post_processors": {
      "analytics_pipeline": {
        "description": "Send through AI analytics",
        "route_to": "Ticket Analytics Agent"
      }
    }
  }'::jsonb
)
ON CONFLICT (service_name, version)
DO UPDATE SET
  schema_data = EXCLUDED.schema_data,
  updated_at = NOW();

-- ═══════════════════════════════════════
-- STEP 4: Verify setup
-- ═══════════════════════════════════════

-- Check if table was created
SELECT
  'Table created: ' || EXISTS(
    SELECT FROM information_schema.tables
    WHERE table_name = 'api_schemas'
  ) as status;

-- Count schemas
SELECT
  service_name,
  version,
  jsonb_array_length(schema_data->'endpoints') as endpoint_count,
  created_at
FROM api_schemas;

-- ═══════════════════════════════════════
-- STEP 5: Test query (same as workflow uses)
-- ═══════════════════════════════════════

SELECT schema_data
FROM api_schemas
WHERE service_name = 'gorgias'
  AND version = 'v1'
  AND is_active = true;

-- ═══════════════════════════════════════
-- OPTIONAL: Row-Level Security (RLS)
-- ═══════════════════════════════════════

-- Enable RLS
ALTER TABLE api_schemas ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read schemas
CREATE POLICY "Allow read access for authenticated users"
  ON api_schemas
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role to manage schemas
CREATE POLICY "Allow full access for service role"
  ON api_schemas
  FOR ALL
  TO service_role
  USING (true);

-- ═══════════════════════════════════════
-- SUCCESS MESSAGE
-- ═══════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '✅ Setup complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Update your n8n workflow to use Dynamic Function Loader';
  RAISE NOTICE '2. Replace HTTP nodes with Universal HTTP Executor';
  RAISE NOTICE '3. Test with a simple Slack message';
  RAISE NOTICE '';
  RAISE NOTICE 'To add new endpoints, just INSERT into api_schemas table!';
END $$;
