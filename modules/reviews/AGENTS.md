# reviews module

Handles product reviews and ratings. Reviews start as `pending` and require admin approval before being publicly visible.

## Schema

- `review` — stores a single product review with rating (1–5), author info, body, moderation status, and helpfulness count.

## Service

`ReviewController` exposes:

- `createReview` — submit a new review (always `pending`)
- `getReview` — fetch a review by id
- `listReviewsByProduct` — get reviews for a product (optionally only approved)
- `listReviews` — admin listing with filters (status, productId, pagination)
- `updateReviewStatus` — approve or reject a review
- `deleteReview` — hard delete
- `getProductRatingSummary` — average rating + distribution (approved reviews only)

## Endpoints

### Store
- `POST /reviews` — submit a review
- `GET /reviews/me` — list authenticated user's reviews
- `GET /reviews/products/:productId` — list approved reviews + summary
- `POST /reviews/:id/helpful` — mark review as helpful

### Admin
- `GET /admin/reviews` — list all reviews (status/productId filters)
- `GET /admin/reviews/analytics` — review analytics
- `GET /admin/reviews/requests` — list review requests
- `GET /admin/reviews/request-stats` — review request stats
- `POST /admin/reviews/send-request` — send review request email
- `GET /admin/reviews/:id` — get a single review
- `PUT /admin/reviews/:id/approve` — approve
- `PUT /admin/reviews/:id/reject` — reject
- `POST /admin/reviews/:id/respond` — add merchant response
- `DELETE /admin/reviews/:id/delete` — delete

## Options

| Key | Type | Description |
|-----|------|-------------|
| `autoApprove` | `"true" \| "false"` | Skip moderation queue |

## Security

- `POST /reviews` does NOT accept `customerId` or `isVerifiedPurchase` from the client
- `customerId` is derived from `ctx.context.session.user.id` (undefined for guest reviews)
- `isVerifiedPurchase` is always set to `false` — only admin can mark reviews as verified

## Tests

- `service-impl.test.ts` — controller unit tests
- `endpoint-security.test.ts` — 45 security regression tests covering identity derivation, ownership isolation, nonexistent resource guards, moderation integrity, helpful count safety, review request deduplication, analytics accuracy, pagination, and rating summary edge cases
