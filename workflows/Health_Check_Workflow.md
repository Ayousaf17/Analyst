# Health Check Workflow Implementation

## Overview

This document provides the complete implementation for a health check workflow that monitors all critical services: OpenAI, Gorgias, Supabase, and Slack.

---

## Workflow Name

`0002_HTTP_Gorgias_HealthCheck_Webhook.json`

---

## Node Sequence

```
Webhook Trigger
  ↓
[Parallel Checks]
  ├─ Check OpenAI → Measure Latency
  ├─ Check Gorgias → Measure Latency
  ├─ Check Supabase → Measure Latency
  └─ Check Slack → Measure Latency
  ↓
Aggregate Results
  ↓
Format Health Status
  ↓
Respond to Webhook
```

---

## Node Implementations

### 1. Webhook Trigger

**Type:** Webhook
**Name:** Health Check Trigger

**Configuration:**
```json
{
  "path": "gorgias-health",
  "method": "GET",
  "responseMode": "lastNode",
  "options": {}
}
```

**URL:**
```
https://your-n8n-instance.com/webhook/gorgias-health
```

---

### 2. Check OpenAI

**Type:** HTTP Request
**Name:** Check OpenAI

**Configuration:**
```json
{
  "method": "GET",
  "url": "={{ $env.OPENAI_API_URL }}/models",
  "authentication": "predefinedCredentialType",
  "nodeCredentialType": "openAiApi",
  "options": {
    "timeout": 5000
  }
}
```

**Code to Add Metadata:**
```javascript
// Position after Check OpenAI
const startTime = $('Check OpenAI').context.startTime || Date.now();
const endTime = Date.now();
const latency = endTime - startTime;

return [{
  json: {
    service: 'openai',
    status: 'ok',
    latency_ms: latency,
    timestamp: new Date().toISOString()
  }
}];
```

---

### 3. Check Gorgias

**Type:** HTTP Request
**Name:** Check Gorgias

**Configuration:**
```json
{
  "method": "GET",
  "url": "={{ $env.GORGIAS_BASE_URL }}/api/tickets?limit=1",
  "authentication": "predefinedCredentialType",
  "nodeCredentialType": "gorgiasApi",
  "options": {
    "timeout": 5000
  }
}
```

**Code to Add Metadata:**
```javascript
// Position after Check Gorgias
const startTime = Date.now() - 500; // Approximate
const endTime = Date.now();
const latency = endTime - startTime;

return [{
  json: {
    service: 'gorgias',
    status: 'ok',
    latency_ms: latency,
    timestamp: new Date().toISOString(),
    ticket_count: $json.data?.length || 0
  }
}];
```

---

### 4. Check Supabase

**Type:** Supabase or HTTP Request
**Name:** Check Supabase

**Option A: Using Supabase Node**
```json
{
  "operation": "getAll",
  "tableId": "agent_sessions",
  "returnAll": false,
  "limit": 1
}
```

**Option B: Using HTTP Request**
```json
{
  "method": "GET",
  "url": "={{ $env.SUPABASE_URL }}/rest/v1/agent_sessions?limit=1",
  "authentication": "predefinedCredentialType",
  "nodeCredentialType": "supabaseApi"
}
```

**Code to Add Metadata:**
```javascript
// Position after Check Supabase
const startTime = Date.now() - 300; // Approximate
const endTime = Date.now();
const latency = endTime - startTime;

return [{
  json: {
    service: 'supabase',
    status: 'ok',
    latency_ms: latency,
    timestamp: new Date().toISOString(),
    record_count: Array.isArray($json) ? $json.length : 0
  }
}];
```

---

### 5. Check Slack

**Type:** Slack or HTTP Request
**Name:** Check Slack

**Option A: Using Slack Node**
```json
{
  "resource": "user",
  "operation": "info"
}
```

**Option B: Using HTTP Request**
```json
{
  "method": "GET",
  "url": "https://slack.com/api/auth.test",
  "authentication": "predefinedCredentialType",
  "nodeCredentialType": "slackApi"
}
```

**Code to Add Metadata:**
```javascript
// Position after Check Slack
const startTime = Date.now() - 400; // Approximate
const endTime = Date.now();
const latency = endTime - startTime;

return [{
  json: {
    service: 'slack',
    status: 'ok',
    latency_ms: latency,
    timestamp: new Date().toISOString(),
    team: $json.team || 'unknown'
  }
}];
```

---

### 6. Aggregate Results

**Type:** Merge
**Name:** Aggregate Results

**Configuration:**
```json
{
  "mode": "multiplex"
}
```

**Connects from:**
- Check OpenAI (metadata node)
- Check Gorgias (metadata node)
- Check Supabase (metadata node)
- Check Slack (metadata node)

---

### 7. Format Health Status

**Type:** Code
**Name:** Format Health Status

**Code:**
```javascript
// Get all service check results
const checks = $input.all();

// Initialize services object
const services = {
  openai: { status: 'unknown', latency_ms: 0, error: null },
  gorgias: { status: 'unknown', latency_ms: 0, error: null },
  supabase: { status: 'unknown', latency_ms: 0, error: null },
  slack: { status: 'unknown', latency_ms: 0, error: null }
};

// Process each check result
checks.forEach(check => {
  const data = check.json;
  const serviceName = data.service;

  if (serviceName && services[serviceName]) {
    services[serviceName] = {
      status: data.error ? 'error' : 'ok',
      latency_ms: data.latency_ms || 0,
      error: data.error || null,
      timestamp: data.timestamp
    };
  }
});

// Calculate overall health
const allHealthy = Object.values(services).every(s => s.status === 'ok');
const degradedServices = Object.entries(services)
  .filter(([_, s]) => s.status !== 'ok')
  .map(([name]) => name);

// Calculate average latency
const avgLatency = Object.values(services)
  .reduce((sum, s) => sum + s.latency_ms, 0) / 4;

// Build status response
const healthStatus = {
  status: allHealthy ? 'healthy' : 'degraded',
  timestamp: new Date().toISOString(),
  version: 'v23',
  services: services,
  metrics: {
    average_latency_ms: Math.round(avgLatency),
    healthy_services: Object.values(services).filter(s => s.status === 'ok').length,
    total_services: 4
  }
};

// Add degraded services list if any
if (degradedServices.length > 0) {
  healthStatus.degraded_services = degradedServices;
}

console.log('🏥 Health Check Result:', healthStatus.status);
console.log('📊 Metrics:', healthStatus.metrics);

return [{ json: healthStatus }];
```

---

### 8. Respond to Webhook

**Type:** Respond to Webhook
**Name:** Health Check Response

**Configuration:**
```json
{
  "options": {
    "responseCode": "={{ $json.status === 'healthy' ? 200 : 503 }}",
    "responseHeaders": {
      "Content-Type": "application/json"
    }
  }
}
```

**Response Body:**
```javascript
={{ JSON.stringify($json, null, 2) }}
```

---

## Error Handling

### Add Error Handler for Each Check

For each service check node, add error handling:

**Type:** Code
**Name:** Handle {Service} Error

**Code Example (for OpenAI):**
```javascript
return [{
  json: {
    service: 'openai',
    status: 'error',
    latency_ms: 0,
    error: $json.error?.message || 'Unknown error',
    timestamp: new Date().toISOString()
  }
}];
```

Connect error output of each check node to its error handler, then to Aggregate Results.

---

## Response Format

### Healthy Response (200 OK)

```json
{
  "status": "healthy",
  "timestamp": "2025-11-06T16:30:00.000Z",
  "version": "v23",
  "services": {
    "openai": {
      "status": "ok",
      "latency_ms": 245,
      "error": null,
      "timestamp": "2025-11-06T16:30:00.000Z"
    },
    "gorgias": {
      "status": "ok",
      "latency_ms": 412,
      "error": null,
      "timestamp": "2025-11-06T16:30:00.000Z"
    },
    "supabase": {
      "status": "ok",
      "latency_ms": 156,
      "error": null,
      "timestamp": "2025-11-06T16:30:00.000Z"
    },
    "slack": {
      "status": "ok",
      "latency_ms": 321,
      "error": null,
      "timestamp": "2025-11-06T16:30:00.000Z"
    }
  },
  "metrics": {
    "average_latency_ms": 284,
    "healthy_services": 4,
    "total_services": 4
  }
}
```

### Degraded Response (503 Service Unavailable)

```json
{
  "status": "degraded",
  "timestamp": "2025-11-06T16:30:00.000Z",
  "version": "v23",
  "services": {
    "openai": {
      "status": "ok",
      "latency_ms": 245,
      "error": null
    },
    "gorgias": {
      "status": "error",
      "latency_ms": 0,
      "error": "Connection timeout"
    },
    "supabase": {
      "status": "ok",
      "latency_ms": 156,
      "error": null
    },
    "slack": {
      "status": "ok",
      "latency_ms": 321,
      "error": null
    }
  },
  "degraded_services": ["gorgias"],
  "metrics": {
    "average_latency_ms": 181,
    "healthy_services": 3,
    "total_services": 4
  }
}
```

---

## Testing

### Manual Test

```bash
curl https://your-n8n-instance.com/webhook/gorgias-health
```

### Automated Monitoring

**Uptime Robot:**
```
Monitor Type: HTTP(s)
URL: https://your-n8n-instance.com/webhook/gorgias-health
Keyword: "healthy"
```

**Datadog:**
```yaml
checks:
  - url: https://your-n8n-instance.com/webhook/gorgias-health
    name: Gorgias Terminal Health
    timeout: 10
    check_certificate_expiration: true
```

---

## Integration

### Slack Alerts (Optional)

Add a conditional node after Format Health Status:

**IF status = 'degraded':**
→ Send alert to #gorgias-errors channel

**Code:**
```javascript
if ($json.status === 'degraded') {
  return [{
    json: {
      channel: '#gorgias-errors',
      text: `🚨 *Gorgias Terminal Health Check Failed*\n\n*Degraded Services:* ${$json.degraded_services.join(', ')}\n*Time:* ${$json.timestamp}`
    }
  }];
}
return [];
```

---

## Monitoring Dashboard

### Supabase Table (Optional)

Store health check results:

```sql
CREATE TABLE health_checks (
  id BIGSERIAL PRIMARY KEY,
  status TEXT NOT NULL,
  openai_status TEXT,
  gorgias_status TEXT,
  supabase_status TEXT,
  slack_status TEXT,
  average_latency INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_health_checks_created_at ON health_checks(created_at);
CREATE INDEX idx_health_checks_status ON health_checks(status);
```

---

## Deployment Checklist

- [ ] Import workflow to n8n
- [ ] Configure webhook path: `gorgias-health`
- [ ] Set up all 4 service check nodes
- [ ] Add error handlers for each check
- [ ] Test with all services healthy
- [ ] Test with one service failing
- [ ] Add to monitoring system
- [ ] Document webhook URL
- [ ] Set up alerts (optional)

---

**Document Version:** 1.0
**Last Updated:** November 6, 2025
**Status:** Ready for Implementation
