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
- `GET /reviews/products/:productId` — list approved reviews + summary

### Admin
- `GET /admin/reviews` — list all reviews (status/productId filters)
- `PUT /admin/reviews/:id/approve` — approve
- `PUT /admin/reviews/:id/reject` — reject
- `DELETE /admin/reviews/:id/delete` — delete

## Options

| Key | Type | Description |
|-----|------|-------------|
| `autoApprove` | `"true" \| "false"` | Skip moderation queue |

## Tests

28 tests in `tests/service-impl.test.ts` covering all controller methods.
