<p align="center">
  <a href="https://86d.app">
    <img src="https://86d.app/logo" height="96" alt="86d" />
  </a>
</p>

<p align="center">
  Dynamic Commerce
</p>

<p align="center">
  <a href="https://x.com/86d_app"><strong>X</strong></a> ·
  <a href="https://www.linkedin.com/company/86d"><strong>LinkedIn</strong></a>
</p>
<br/>

> [!WARNING]
> This project is under active development and is not ready for production use. Please proceed with caution. Use at your own risk.

# Reviews Module

Product reviews and ratings for the 86d commerce platform. Manages a moderation queue so store owners can approve or reject reviews before they appear publicly.

![version](https://img.shields.io/badge/version-0.0.1-blue) ![license](https://img.shields.io/badge/license-MIT-green)

## Installation

```sh
npm install @86d-app/reviews
```

## Usage

```ts
import reviews from "@86d-app/reviews";
import { createModuleClient } from "@86d-app/core";

const client = createModuleClient([
  reviews({
    autoApprove: "false",  // default: requires moderation
  }),
]);
```

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `autoApprove` | `"true" \| "false"` | `"false"` | Auto-approve reviews without moderation |

## Review Lifecycle

```
createReview()         → pending
updateReviewStatus()   → approved  (publicly visible)
updateReviewStatus()   → rejected  (hidden from store)
```

When `autoApprove: "true"`, new reviews skip the pending state and go directly to `approved`.

## Store Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/reviews` | Submit a review (status: pending) |
| `GET` | `/reviews/products/:productId` | List approved reviews + rating summary |

**Response for `GET /reviews/products/:productId`:**
```json
{
  "reviews": [...],
  "summary": {
    "average": 4.3,
    "count": 12,
    "distribution": { "1": 0, "2": 1, "3": 2, "4": 4, "5": 5 }
  }
}
```

## Admin Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/reviews` | List all reviews (filter: `status`, `productId`) |
| `PUT` | `/admin/reviews/:id/approve` | Approve a review |
| `PUT` | `/admin/reviews/:id/reject` | Reject a review |
| `DELETE` | `/admin/reviews/:id/delete` | Delete a review permanently |

## Controller API

```ts
controller.createReview(params: {
  productId: string;
  authorName: string;
  authorEmail: string;
  rating: number;          // 1–5
  title?: string;
  body: string;
  customerId?: string;
  isVerifiedPurchase?: boolean;
}): Promise<Review>

controller.getReview(id: string): Promise<Review | null>

// Returns only approved reviews by default (set approvedOnly: false for all)
controller.listReviewsByProduct(productId: string, params?: {
  approvedOnly?: boolean;
  take?: number;
  skip?: number;
}): Promise<Review[]>

controller.listReviews(params?: {
  productId?: string;
  status?: ReviewStatus;
  take?: number;
  skip?: number;
}): Promise<Review[]>

controller.updateReviewStatus(id: string, status: ReviewStatus): Promise<Review | null>

controller.deleteReview(id: string): Promise<boolean>

// Calculates stats from approved reviews only
controller.getProductRatingSummary(productId: string): Promise<RatingSummary>
```

## Rating Summary

`getProductRatingSummary` only counts **approved** reviews. The `count` is the number of approved reviews, `average` is rounded to 1 decimal place, and `distribution` maps each star rating (1–5) to its count.

```ts
interface RatingSummary {
  average: number;                   // e.g. 4.3
  count: number;                     // number of approved reviews
  distribution: Record<string, number>; // { "1": 0, "2": 1, "3": 2, "4": 4, "5": 5 }
}
```

## Example: Moderation Flow

```ts
// Customer submits a review
const review = await controller.createReview({
  productId: "prod_abc",
  authorName: "Jane Doe",
  authorEmail: "jane@example.com",
  rating: 5,
  title: "Excellent product!",
  body: "Exactly what I needed. Fast shipping too.",
  isVerifiedPurchase: true,
});
// review.status === "pending"

// Admin approves it
await controller.updateReviewStatus(review.id, "approved");

// Fetch public ratings for a product page
const summary = await controller.getProductRatingSummary("prod_abc");
// { average: 5.0, count: 1, distribution: { "5": 1, "4": 0, ... } }

// Fetch approved reviews for display
const reviews = await controller.listReviewsByProduct("prod_abc");
```

## Types

```ts
type ReviewStatus = "pending" | "approved" | "rejected";

interface Review {
  id: string;
  productId: string;
  customerId?: string;
  authorName: string;
  authorEmail: string;
  rating: number;          // 1–5
  title?: string;
  body: string;
  status: ReviewStatus;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface RatingSummary {
  average: number;
  count: number;
  distribution: Record<string, number>;
}
```
