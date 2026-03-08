# Tickets Module

Customer support ticket system with threaded messages, categories, priority levels, and status tracking.

## File structure

```
modules/tickets/src/
  index.ts              Factory: tickets(options?) → Module
  schema.ts             Data models: ticketCategory, ticket, ticketMessage
  service.ts            Type definitions + controller interface
  service-impl.ts       Controller implementation (createTicketControllers)
  store/endpoints/      Customer-facing endpoints
    index.ts            Endpoint map
    submit-ticket.ts    POST /tickets/submit
    get-ticket.ts       GET /tickets/:id
    customer-reply.ts   POST /tickets/:id/reply
    customer-tickets.ts GET /tickets/mine
    list-categories.ts  GET /tickets/categories
  admin/endpoints/      Admin-only endpoints
    index.ts            Endpoint map
    list-tickets.ts     GET /admin/tickets
    get-ticket.ts       GET /admin/tickets/:id
    update-ticket.ts    PUT /admin/tickets/:id/update
    close-ticket.ts     POST /admin/tickets/:id/close
    reopen-ticket.ts    POST /admin/tickets/:id/reopen
    admin-reply.ts      POST /admin/tickets/:id/reply
    list-messages.ts    GET /admin/tickets/:id/messages
    create-category.ts  POST /admin/tickets/categories/create
    list-categories.ts  GET /admin/tickets/categories
    update-category.ts  PUT /admin/tickets/categories/:id
    delete-category.ts  DELETE /admin/tickets/categories/:id/delete
    stats.ts            GET /admin/tickets/stats
  __tests__/
    service-impl.test.ts  45 tests covering all controller methods
```

## Data models

### ticketCategory
Categories for organizing tickets (e.g., "Billing", "Shipping").

| Field | Type | Notes |
|-------|------|-------|
| id | string | UUID |
| name | string | required |
| slug | string | unique |
| description | string | optional |
| position | number | sort order |
| isActive | boolean | visibility toggle |

### ticket
Support ticket with status tracking and customer info.

| Field | Type | Notes |
|-------|------|-------|
| id | string | UUID |
| number | number | sequential, starts at 1001, unique |
| categoryId | string | optional, ref → ticketCategory |
| subject | string | required |
| description | string | required |
| status | string | open, pending, in-progress, resolved, closed |
| priority | string | low, normal, high, urgent |
| customerEmail | string | required |
| customerName | string | required |
| customerId | string | optional |
| orderId | string | optional, link to order |
| assigneeId | string | optional admin user |
| assigneeName | string | optional |
| tags | json | string[] |
| closedAt | date | set when closed/resolved |

### ticketMessage
Threaded messages within a ticket.

| Field | Type | Notes |
|-------|------|-------|
| id | string | UUID |
| ticketId | string | ref → ticket (cascade delete) |
| body | string | message content |
| authorType | string | customer, admin, system |
| authorId | string | optional |
| authorName | string | required |
| authorEmail | string | optional |
| isInternal | boolean | admin-only notes, hidden from customer |

## Options

```ts
interface TicketsOptions {
  allowCustomerReopen?: boolean;  // default: false
  autoCloseDays?: number;         // default: 7 (0 = disabled)
}
```

## Key behaviors

- **Ticket numbering**: Sequential starting at 1001, auto-incremented
- **Status transitions**: Customer reply on non-open ticket → `pending`. Admin reply on open ticket → `in-progress`. Close/resolve sets `closedAt`.
- **Internal notes**: Messages with `isInternal: true` are hidden from store endpoints
- **Customer access**: Store endpoints verify `customerEmail` matches ticket owner
- **Controller key**: `ctx.context.controllers.tickets as TicketController`

## Events emitted

`ticket.created`, `ticket.updated`, `ticket.closed`, `ticket.reopened`, `ticket.message.added`

## Gotchas

- `onDelete: "set null"` (with space) not `"set-null"` in schema references
- Cast data to `Record<string, any>` for `data.upsert()` calls
- Store `GET /tickets/:id` requires `?email=` query for customer verification
