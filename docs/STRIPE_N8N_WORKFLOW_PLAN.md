# Stripe n8n Workflow Planning Document

> **Purpose**: Plan and document n8n workflows leveraging Stripe's native nodes for business automation.
> **Status**: Planning Phase
> **Created**: 2026-01-10

---

## Table of Contents
1. [Stripe Node Capabilities](#stripe-node-capabilities)
2. [Workflow Categories](#workflow-categories)
3. [Recommended Workflows](#recommended-workflows)
4. [Implementation Priority Matrix](#implementation-priority-matrix)
5. [Technical Considerations](#technical-considerations)

---

## Stripe Node Capabilities

### Stripe Trigger Node (Webhooks)

The Stripe Trigger node listens for real-time events from Stripe. Key event categories:

| Category | Events |
|----------|--------|
| **Payments** | `charge.succeeded`, `charge.failed`, `charge.refunded`, `charge.pending`, `charge.expired` |
| **Subscriptions** | `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.trial_will_end` |
| **Invoices** | `invoice.created`, `invoice.finalized`, `invoice.paid`, `invoice.payment_failed`, `invoice.payment_succeeded`, `invoice.upcoming`, `invoice.voided` |
| **Customers** | `customer.created`, `customer.updated`, `customer.deleted`, `customer.source.expiring` |
| **Payment Intents** | `payment_intent.created`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.requires_action` |
| **Checkout** | `checkout.session.completed` |
| **Disputes** | `charge.dispute.created`, `charge.dispute.closed`, `charge.dispute.funds_withdrawn`, `charge.dispute.funds_reinstated` |
| **Payouts** | `payout.created`, `payout.paid`, `payout.failed`, `payout.canceled` |
| **Products** | `product.created`, `product.updated`, `product.deleted` |
| **Prices/Plans** | `plan.created`, `plan.updated`, `plan.deleted` |
| **Coupons** | `coupon.created`, `coupon.deleted`, `coupon.updated` |

### Stripe Action Node (Operations)

Available resources and operations:

| Resource | Operations |
|----------|------------|
| **Balance** | Get current balance |
| **Charge** | Create, Get, Get All, Update |
| **Coupon** | Create, Delete, Get, Get All |
| **Customer** | Create, Delete, Get, Get All, Update |
| **Customer Card** | Add, Get, Remove |
| **Source** | Create, Delete, Get |
| **Token** | Create |

> **Note**: For operations not natively supported, use the HTTP Request node with Stripe credentials.

---

## Workflow Categories

### Category 1: Payment & Revenue Tracking
Workflows focused on monitoring and responding to payment events.

### Category 2: Customer Lifecycle Management
Automate customer onboarding, retention, and churn prevention.

### Category 3: Subscription Management
Handle subscription changes, renewals, and cancellations.

### Category 4: Financial Operations
Invoicing, refunds, payouts, and accounting integrations.

### Category 5: Alerts & Notifications
Real-time notifications for critical business events.

### Category 6: Analytics & Reporting
Data aggregation and business intelligence.

---

## Recommended Workflows

### Workflow 1: Payment Success Notification & CRM Update

**Trigger**: `charge.succeeded`

**Description**: When a payment succeeds, notify the team and update your CRM.

```
[Stripe Trigger: charge.succeeded]
    │
    ├──► [Slack] Send success notification to #sales channel
    │
    ├──► [CRM Node] Update customer record with payment info
    │
    └──► [Google Sheets] Log transaction for reporting
```

**Nodes Required**:
- Stripe Trigger
- Slack (or Email)
- CRM (Salesforce, HubSpot, etc.)
- Google Sheets (optional)

**Business Value**: Real-time visibility, accurate CRM data, audit trail.

---

### Workflow 2: Failed Payment Recovery Sequence

**Trigger**: `invoice.payment_failed`

**Description**: Automatically initiate recovery when payments fail.

```
[Stripe Trigger: invoice.payment_failed]
    │
    ├──► [Wait 1 hour]
    │       │
    │       └──► [Email] Send friendly payment reminder
    │
    ├──► [Wait 24 hours]
    │       │
    │       └──► [Email] Send payment method update request
    │
    ├──► [Wait 72 hours]
    │       │
    │       └──► [SMS/Email] Final warning before suspension
    │
    └──► [Slack] Alert team about at-risk customer
```

**Nodes Required**:
- Stripe Trigger
- Wait nodes
- Email (SendGrid, Mailgun, etc.)
- Slack
- Twilio (for SMS)

**Business Value**: Reduce involuntary churn, recover failed payments automatically.

---

### Workflow 3: New Customer Onboarding

**Trigger**: `customer.created`

**Description**: Welcome new customers and set them up for success.

```
[Stripe Trigger: customer.created]
    │
    ├──► [Email] Send welcome email with getting started guide
    │
    ├──► [CRM] Create/update customer profile
    │
    ├──► [Slack] Notify #new-customers channel
    │
    └──► [Database] Create customer record in your system
```

**Nodes Required**:
- Stripe Trigger
- Email node
- CRM node
- Slack
- Database (Postgres, MySQL, Supabase)

**Business Value**: Consistent onboarding experience, team awareness.

---

### Workflow 4: Subscription Lifecycle Management

**Trigger**: Multiple subscription events

**Description**: Handle all subscription state changes.

```
[Stripe Trigger: customer.subscription.*]
    │
    ├─► IF subscription.created
    │       └──► Provision access + Send welcome
    │
    ├─► IF subscription.updated
    │       └──► Sync plan changes + Update permissions
    │
    ├─► IF subscription.deleted
    │       └──► Revoke access + Trigger win-back campaign
    │
    └─► IF subscription.trial_will_end
            └──► Send trial ending reminder (3 days before)
```

**Nodes Required**:
- Stripe Trigger
- Switch/IF nodes
- Email
- Database
- Your app's API (HTTP Request)

**Business Value**: Automated access control, reduce churn.

---

### Workflow 5: Invoice Processing & Accounting

**Trigger**: `invoice.finalized`

**Description**: Sync invoices with accounting systems.

```
[Stripe Trigger: invoice.finalized]
    │
    ├──► [QuickBooks/Xero] Create invoice record
    │
    ├──► [Google Drive] Save PDF invoice to folder
    │
    ├──► [Email] Send invoice to customer
    │
    └──► [Airtable/Sheets] Update revenue tracking
```

**Nodes Required**:
- Stripe Trigger
- QuickBooks/Xero node
- Google Drive
- Email
- Airtable or Google Sheets

**Business Value**: Automated bookkeeping, organized records.

---

### Workflow 6: Dispute/Chargeback Alert System

**Trigger**: `charge.dispute.created`

**Description**: Immediately alert team when disputes occur.

```
[Stripe Trigger: charge.dispute.created]
    │
    ├──► [Slack] URGENT alert to #disputes channel
    │       └── Include: Amount, Customer, Reason
    │
    ├──► [Email] Notify finance team
    │
    ├──► [Notion/Linear] Create task to respond to dispute
    │
    └──► [CRM] Flag customer account
```

**Nodes Required**:
- Stripe Trigger
- Slack
- Email
- Project management tool
- CRM

**Business Value**: Quick response to disputes (critical for winning them).

---

### Workflow 7: Trial Conversion Optimization

**Trigger**: `customer.subscription.trial_will_end`

**Description**: Maximize trial-to-paid conversions.

```
[Stripe Trigger: trial_will_end]
    │
    ├──► [HTTP Request] Check customer usage from your app
    │
    ├──► IF high_usage
    │       └──► [Email] Send personalized conversion offer
    │
    ├──► IF low_usage
    │       └──► [Email] Send feature highlight + demo offer
    │
    └──► [Slack] Alert sales about trial ending
```

**Nodes Required**:
- Stripe Trigger
- HTTP Request (to your app)
- IF/Switch nodes
- Email
- Slack

**Business Value**: Higher trial conversions through personalization.

---

### Workflow 8: Payout Notification & Reconciliation

**Trigger**: `payout.paid`

**Description**: Track when funds hit your bank account.

```
[Stripe Trigger: payout.paid]
    │
    ├──► [Slack] Notify #finance: "Payout of $X.XX deposited"
    │
    ├──► [Google Sheets] Log payout for reconciliation
    │
    └──► [Email] Weekly summary to finance team
```

**Nodes Required**:
- Stripe Trigger
- Slack
- Google Sheets
- Email (for weekly digest)

**Business Value**: Cash flow visibility, easier reconciliation.

---

### Workflow 9: Customer Card Expiration Warning

**Trigger**: `customer.source.expiring`

**Description**: Proactively update cards before they expire.

```
[Stripe Trigger: customer.source.expiring]
    │
    ├──► [Email] "Your card is expiring soon - update now"
    │       └── Include: Billing portal link
    │
    ├──► [Wait 7 days]
    │       └──► [Email] Follow-up reminder
    │
    └──► [CRM] Flag for outreach if card not updated
```

**Nodes Required**:
- Stripe Trigger
- Email
- Wait node
- CRM

**Business Value**: Prevent failed payments, reduce involuntary churn.

---

### Workflow 10: Revenue Milestone Celebrations

**Trigger**: `charge.succeeded` (with aggregation)

**Description**: Celebrate revenue milestones with the team.

```
[Stripe Trigger: charge.succeeded]
    │
    └──► [Function] Check cumulative monthly revenue
            │
            └──► IF milestone_reached ($10k, $50k, $100k, etc.)
                    │
                    ├──► [Slack] Celebrate in #general
                    │
                    └──► [Confetti API] Trigger celebration
```

**Nodes Required**:
- Stripe Trigger
- Function/Code node
- Database (to track running totals)
- Slack

**Business Value**: Team motivation, culture building.

---

## Implementation Priority Matrix

| Priority | Workflow | Complexity | Business Impact |
|----------|----------|------------|-----------------|
| **P0 - Critical** | Failed Payment Recovery | Medium | High - Direct revenue recovery |
| **P0 - Critical** | Dispute Alert System | Low | High - Time-sensitive |
| **P1 - High** | Payment Success Notification | Low | Medium - Visibility |
| **P1 - High** | Subscription Lifecycle | Medium | High - Access control |
| **P1 - High** | Card Expiration Warning | Low | Medium - Churn prevention |
| **P2 - Medium** | New Customer Onboarding | Low | Medium - Experience |
| **P2 - Medium** | Invoice/Accounting Sync | Medium | Medium - Operations |
| **P2 - Medium** | Trial Conversion | Medium | High - Revenue growth |
| **P3 - Nice-to-have** | Payout Notification | Low | Low - Visibility |
| **P3 - Nice-to-have** | Revenue Milestones | Low | Low - Culture |

---

## Technical Considerations

### 1. Stripe API Version
- Set `API Version` in Stripe Trigger node to match your Stripe dashboard settings
- Consistent API version prevents payload structure issues

### 2. Webhook Security
- n8n automatically validates Stripe webhook signatures
- Ensure your Stripe webhook secret is correctly configured in credentials

### 3. Idempotency
- Stripe may retry webhooks if not acknowledged
- Implement deduplication logic for critical workflows
- Store processed event IDs in database to prevent duplicate processing

### 4. Error Handling
- Add error workflow for each critical workflow
- Log failures to observability platform (Supabase, Datadog, etc.)
- Set up Slack alerts for workflow failures

### 5. Testing
- Use Stripe CLI to trigger test webhooks: `stripe trigger payment_intent.succeeded`
- Test with Stripe test mode before going live

### 6. Rate Limits
- n8n workflows can be rate-limited by downstream services
- Add appropriate delays when sending bulk notifications

### 7. Data Privacy
- Don't log full card numbers (Stripe handles PCI compliance)
- Be mindful of PII in logs and notifications

---

## Next Steps

1. **Choose Priority Workflows**: Start with P0 (Failed Payment Recovery, Dispute Alerts)
2. **Set Up Stripe Credentials**: Configure Stripe API key and webhook secret in n8n
3. **Create Webhook Endpoints**: n8n generates unique URLs for each Stripe Trigger
4. **Test in Stripe Test Mode**: Use test API keys and simulate events
5. **Deploy to Production**: Switch to live keys and monitor

---

## Integration Opportunities

Consider connecting Stripe workflows with:

| Tool | Use Case |
|------|----------|
| **Slack** | Real-time team notifications |
| **Email (SendGrid/Mailgun)** | Customer communications |
| **HubSpot/Salesforce** | CRM updates |
| **QuickBooks/Xero** | Accounting sync |
| **Notion/Linear** | Task creation |
| **Supabase/Postgres** | Data storage and logging |
| **Google Sheets** | Reporting and analysis |
| **Twilio** | SMS notifications |
| **Segment** | Analytics tracking |

---

## References

- [n8n Stripe Trigger Documentation](https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.stripetrigger/)
- [n8n Stripe Action Documentation](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.stripe/)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe API Reference](https://stripe.com/docs/api)
