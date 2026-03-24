# Component API Reference

Auto-generated from module source files. Run `bun scripts/generate-component-docs.ts` to regenerate.

Generated: 2026-03-16  
Modules with components: 59

---

## Quick start

Add components to your MDX templates by importing them from the module system.
Modules must be listed in `templates/brisa/config.json` to be available.

```mdx
{/* templates/brisa/index.mdx */}
<FeaturedProducts limit={4} title="Featured" />
<CollectionGrid title="Shop by collection" featured />
<NewsletterInline source="homepage" />
```

---

## Modules

- [`@86d-app/abandoned-carts`](#86d-appabandoned-carts) — 1 store component
- [`@86d-app/announcements`](#86d-appannouncements) — 1 store component
- [`@86d-app/auctions`](#86d-appauctions) — 2 store components
- [`@86d-app/backorders`](#86d-appbackorders) — 2 store components
- [`@86d-app/blog`](#86d-appblog) — 2 store components
- [`@86d-app/brands`](#86d-appbrands) — 2 store components
- [`@86d-app/bulk-pricing`](#86d-appbulk-pricing) — 1 store component
- [`@86d-app/bundles`](#86d-appbundles) — 2 store components
- [`@86d-app/cart`](#86d-appcart) — 4 store components
- [`@86d-app/checkout`](#86d-appcheckout) — 6 store components
- [`@86d-app/collections`](#86d-appcollections) — 2 store components
- [`@86d-app/comparisons`](#86d-appcomparisons) — 2 store components
- [`@86d-app/customers`](#86d-appcustomers) — 3 store components
- [`@86d-app/delivery-slots`](#86d-appdelivery-slots) — 1 store component
- [`@86d-app/digital-downloads`](#86d-appdigital-downloads) — 3 store components
- [`@86d-app/discounts`](#86d-appdiscounts) — 4 store components
- [`@86d-app/faq`](#86d-appfaq) — 2 store components
- [`@86d-app/flash-sales`](#86d-appflash-sales) — 5 store components
- [`@86d-app/fulfillment`](#86d-appfulfillment) — 3 store components
- [`@86d-app/giftcards`](#86d-appgiftcards) — 2 store components
- [`@86d-app/gift-registry`](#86d-appgift-registry) — 2 store components
- [`@86d-app/gift-wrapping`](#86d-appgift-wrapping) — 1 store component
- [`@86d-app/inventory`](#86d-appinventory) — 3 store components
- [`@86d-app/invoices`](#86d-appinvoices) — 2 store components
- [`@86d-app/loyalty`](#86d-apployalty) — 4 store components
- [`@86d-app/media`](#86d-appmedia) — 3 store components
- [`@86d-app/memberships`](#86d-appmemberships) — 3 store components
- [`@86d-app/multi-currency`](#86d-appmulti-currency) — 2 store components
- [`@86d-app/navigation`](#86d-appnavigation) — 3 store components
- [`@86d-app/newsletter`](#86d-appnewsletter) — 3 store components
- [`@86d-app/notifications`](#86d-appnotifications) — 3 store components
- [`@86d-app/order-notes`](#86d-apporder-notes) — 1 store component
- [`@86d-app/orders`](#86d-apporders) — 4 store components
- [`@86d-app/pages`](#86d-apppages) — 2 store components
- [`@86d-app/preorders`](#86d-apppreorders) — 2 store components
- [`@86d-app/product-labels`](#86d-appproduct-labels) — 1 store component
- [`@86d-app/product-qa`](#86d-appproduct-qa) — 4 store components
- [`@86d-app/products`](#86d-appproducts) — 1 store component
- [`@86d-app/quotes`](#86d-appquotes) — 3 store components
- [`@86d-app/recently-viewed`](#86d-apprecently-viewed) — 2 store components
- [`@86d-app/recommendations`](#86d-apprecommendations) — 2 store components
- [`@86d-app/referrals`](#86d-appreferrals) — 3 store components
- [`@86d-app/returns`](#86d-appreturns) — 2 store components
- [`@86d-app/reviews`](#86d-appreviews) — 7 store components
- [`@86d-app/saved-addresses`](#86d-appsaved-addresses) — 1 store component
- [`@86d-app/search`](#86d-appsearch) — 3 store components
- [`@86d-app/seo`](#86d-appseo) — 2 store components
- [`@86d-app/shipping`](#86d-appshipping) — 3 store components
- [`@86d-app/social-proof`](#86d-appsocial-proof) — 3 store components
- [`@86d-app/social-sharing`](#86d-appsocial-sharing) — 1 store component
- [`@86d-app/store-credits`](#86d-appstore-credits) — 3 store components
- [`@86d-app/store-locator`](#86d-appstore-locator) — 2 store components
- [`@86d-app/store-pickup`](#86d-appstore-pickup) — 1 store component
- [`@86d-app/subscriptions`](#86d-appsubscriptions) — 4 store components
- [`@86d-app/tax`](#86d-apptax) — 2 store components
- [`@86d-app/tickets`](#86d-apptickets) — 3 store components
- [`@86d-app/waitlist`](#86d-appwaitlist) — 3 store components
- [`@86d-app/warranties`](#86d-appwarranties) — 2 store components
- [`@86d-app/wishlist`](#86d-appwishlist) — 3 store components

---

## `@86d-app/abandoned-carts`

Tracks abandoned shopping carts and manages multi-channel recovery campaigns (email, SMS, push).

### Store components

Use in MDX template files:

#### `CartRecovery`

```mdx
<CartRecovery />
```


---

## `@86d-app/announcements`

Site-wide announcement bars, promotional banners, and popup notices with scheduling, audience targeting, and engagement analytics.

### Store components

Use in MDX template files:

#### `AnnouncementBar`

```mdx
<AnnouncementBar />
```


---

## `@86d-app/auctions`

Time-limited product auctions with bidding, reserve prices, and buy-it-now.

### Store components

Use in MDX template files:

#### `AuctionListing`

```mdx
<AuctionListing />
```

#### `AuctionPage`

```mdx
<AuctionPage />
```


---

## `@86d-app/backorders`

Manages backorder requests when customers purchase out-of-stock products. Tracks the full lifecycle from request to delivery, with configurable per-product policies.

### Store components

Use in MDX template files:

#### `BackorderButton`

```mdx
<BackorderButton />
```

#### `MyBackorders`

```mdx
<MyBackorders />
```


---

## `@86d-app/blog`

Content management for blog posts with drafts, scheduled publishing, featured posts, view tracking, and markdown rendering for store pages.

### Store components

Use in MDX template files:

#### `BlogList`

```mdx
<BlogList />
```

#### `BlogPostDetail`

```mdx
<BlogPostDetail />
```


---

## `@86d-app/brands`

Product brand management. Organize products by manufacturer or brand with brand pages, featured brands, and SEO metadata.

### Store components

Use in MDX template files:

#### `BrandList`

```mdx
<BrandList />
```

#### `FeaturedBrands`

```mdx
<FeaturedBrands />
```


---

## `@86d-app/bulk-pricing`

Quantity-based tiered pricing module. Define rules that give customers lower per-unit prices when they buy in larger quantities.

### Store components

Use in MDX template files:

#### `BulkPricingTiers`

```mdx
<BulkPricingTiers productId="..." basePriceInCents={0} />
```

**Props**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `productId` | `string` | Yes | Product ID to show tiers for |
| `basePriceInCents` | `number` | Yes | Base price in cents |
| `title` | `string \| undefined` | No | Section title |
| `quantity` | `number \| undefined` | No | Currently selected quantity (highlights the active tier) |


---

## `@86d-app/bundles`

Groups products into discounted bundles with fixed-price or percentage-off pricing and date-based availability.

### Store components

Use in MDX template files:

#### `BundleDetail`

```mdx
<BundleDetail />
```

#### `BundleList`

```mdx
<BundleList />
```


---

## `@86d-app/cart`

Shopping cart for guest and registered customers. Supports adding, updating, removing items and cart expiration.

### Store components

Use in MDX template files:

#### `Cart`

```mdx
<Cart />
```

#### `CartButton`

```mdx
<CartButton />
```

#### `CartDrawerInner`

```mdx
<CartDrawerInner />
```

#### `CartFloatingPill`

```mdx
<CartFloatingPill />
```


---

## `@86d-app/checkout`

Checkout session management: cart-to-order conversion flow. Handles session creation, address collection, discount application, and order completion. Customer-facing only — no admin endpoints.

### Store components

Use in MDX template files:

#### `CheckoutForm`

```mdx
<CheckoutForm />
```

#### `CheckoutInformation`

```mdx
<CheckoutInformation />
```

#### `CheckoutPayment`

```mdx
<CheckoutPayment />
```

#### `CheckoutReview`

```mdx
<CheckoutReview />
```

#### `CheckoutShipping`

```mdx
<CheckoutShipping />
```

#### `CheckoutSummary`

```mdx
<CheckoutSummary />
```


---

## `@86d-app/collections`

Curated product collections for merchandising. Supports manual (hand-picked) and automatic (rule-based) groupings with featured collection highlighting, SEO fields, and drag-and-drop product ordering.

### Store components

Use in MDX template files:

#### `CollectionList`

```mdx
<CollectionList />
```

#### `FeaturedCollections`

```mdx
<FeaturedCollections />
```


---

## `@86d-app/comparisons`

Product comparison for side-by-side feature/price/attribute comparison. Supports guest and registered customers with configurable product limits.

### Store components

Use in MDX template files:

#### `ComparisonBar`

```mdx
<ComparisonBar />
```

#### `ComparisonTable`

```mdx
<ComparisonTable />
```


---

## `@86d-app/customers`

Customer profile and address management. Supports authenticated customers viewing/editing their profile and addresses, plus admin access to all customers.

### Store components

Use in MDX template files:

#### `AccountProfile`

```mdx
<AccountProfile />
```

#### `AddressBook`

```mdx
<AddressBook />
```

#### `LoyaltyCard`

```mdx
<LoyaltyCard />
```


---

## `@86d-app/delivery-slots`

Scheduled delivery time windows by day of week with capacity limits, surcharges, and blackout dates.

### Store components

Use in MDX template files:

#### `SlotPicker`

```mdx
<SlotPicker />
```


---

## `@86d-app/digital-downloads`

File delivery via secure, expiring download tokens. Associates downloadable files with products and generates single-use or limited-use tokens for order fulfillment. Supports batch token creation for orders with multiple digital products.

### Store components

Use in MDX template files:

#### `DownloadButton`

```mdx
<DownloadButton />
```

#### `DownloadRow`

```mdx
<DownloadRow />
```

#### `MyDownloads`

```mdx
<MyDownloads />
```


---

## `@86d-app/discounts`

Discount and promo code management. Supports percentage, fixed-amount, and free-shipping discount types with optional applies-to filters (all, products, categories). Standalone — no dependencies on other modules.

### Store components

Use in MDX template files:

#### `AutoAppliedSavings`

```mdx
<AutoAppliedSavings />
```

#### `CartDiscounts`

```mdx
<CartDiscounts />
```

#### `DiscountBanner`

```mdx
<DiscountBanner />
```

#### `DiscountCodeInput`

```mdx
<DiscountCodeInput />
```


---

## `@86d-app/faq`

Self-service knowledge base with categorized questions, full-text search, and helpfulness voting.

### Store components

Use in MDX template files:

#### `FaqAccordion`

```mdx
<FaqAccordion />
```

#### `FaqSearch`

```mdx
<FaqSearch />
```


---

## `@86d-app/flash-sales`

Time-limited promotional events with per-product sale pricing, stock limits, and countdown support. Creates urgency-driven shopping experiences.

### Store components

Use in MDX template files:

#### `Countdown`

```mdx
<Countdown endsAt="string" />
```

**Props**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `endsAt` | `string \| Date` | Yes |  |
| `label` | `string` | No |  |
| `onExpire` | `() => void` | No |  |

#### `FlashDealBadge`

```mdx
<FlashDealBadge productId="..." />
```

**Props**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `productId` | `string` | Yes |  |

#### `FlashSaleDetail`

```mdx
<FlashSaleDetail />
```

#### `FlashSaleListing`

```mdx
<FlashSaleListing />
```

#### `FlashSaleProductCard`

```mdx
<FlashSaleProductCard />
```


---

## `@86d-app/fulfillment`

Shipment lifecycle management with a 5-state machine. Handles creation, status transitions, tracking, cancellation, and optional auto-ship on tracking.

### Store components

Use in MDX template files:

#### `FulfillmentSummary`

```mdx
<FulfillmentSummary orderId="..." />
```

**Props**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `orderId` | `string` | Yes | Order ID to look up fulfillments for. |

#### `FulfillmentTracker`

```mdx
<FulfillmentTracker status={...} createdAt="string" />
```

**Props**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `status` | `FulfillmentStatus` | Yes | Current fulfillment status. |
| `createdAt` | `string \| Date` | Yes | When the fulfillment was created. |
| `shippedAt` | `string \| Date \| null` | No | When it was shipped, if applicable. |
| `deliveredAt` | `string \| Date \| null` | No | When it was delivered, if applicable. |

#### `TrackingInfo`

```mdx
<TrackingInfo status={...} />
```

**Props**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `status` | `FulfillmentStatus` | Yes | Current fulfillment status. |
| `carrier` | `string \| null` | No | Carrier name (e.g. UPS, FedEx). |
| `trackingNumber` | `string \| null` | No | Tracking number. |
| `trackingUrl` | `string \| null` | No | Full tracking URL. |


---

## `@86d-app/giftcards`

Digital gift cards with purchasing, gifting, redemption, balance management, top-ups, and analytics.

### Store components

Use in MDX template files:

#### `GiftCardBalance`

```mdx
<GiftCardBalance />
```

#### `GiftCardRedeem`

```mdx
<GiftCardRedeem />
```


---

## `@86d-app/gift-registry`

Customer-created gift registries (wedding, baby, birthday, etc.) that visitors can purchase from.

### Store components

Use in MDX template files:

#### `RegistryBrowse`

```mdx
<RegistryBrowse />
```

#### `RegistryPage`

```mdx
<RegistryPage />
```


---

## `@86d-app/gift-wrapping`

Add-on gift wrapping options for order items with custom messages and recipient names.

### Store components

Use in MDX template files:

#### `WrapOptionBrowse`

```mdx
<WrapOptionBrowse />
```


---

## `@86d-app/inventory`

Stock tracking for products across variants and locations. Supports reservations, deductions, low-stock alerts, back-in-stock subscriptions, and backorder control.

### Store components

Use in MDX template files:

#### `BackInStockForm`

```mdx
<BackInStockForm />
```

#### `StockAvailability`

```mdx
<StockAvailability />
```

#### `StockStatus`

```mdx
<StockStatus />
```


---

## `@86d-app/invoices`

Invoice lifecycle management with payment terms, partial payments, credit notes, and configurable numbering.

### Store components

Use in MDX template files:

#### `InvoiceHistory`

```mdx
<InvoiceHistory />
```

#### `InvoiceTracker`

```mdx
<InvoiceTracker />
```


---

## `@86d-app/loyalty`

Points-based loyalty program with tiered rewards, earning rules, and order-event integration.

### Store components

Use in MDX template files:

#### `LoyaltyPage`

```mdx
<LoyaltyPage />
```

#### `PointsBalance`

```mdx
<PointsBalance />
```

#### `PointsHistory`

```mdx
<PointsHistory />
```

#### `TierProgress`

```mdx
<TierProgress />
```


---

## `@86d-app/media`

Digital asset management with folder organization, tagging, bulk operations, and store-facing display components.

### Store components

Use in MDX template files:

#### `ImageDisplay`

```mdx
<ImageDisplay id="..." />
```

**Props**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | Yes | Asset ID to display |
| `className` | `string` | No | Optional CSS class for the container |
| `showCaption` | `boolean` | No | Show caption below the image |

#### `MediaGallery`

```mdx
<MediaGallery />
```

**Props**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `folder` | `string` | No | Filter by folder ID |
| `type` | `string` | No | Filter by MIME type prefix (e.g. "image", "video") |
| `tag` | `string` | No | Filter by tag |
| `pageSize` | `number` | No | Number of items per page |

#### `VideoPlayer`

```mdx
<VideoPlayer id="..." />
```

**Props**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | Yes | Asset ID of the video |
| `autoPlay` | `boolean` | No | Auto-play (muted) when visible |
| `loop` | `boolean` | No | Loop playback |
| `className` | `string` | No | Optional CSS class for the container |


---

## `@86d-app/memberships`

Paid membership plans with exclusive benefits, gated products, and member pricing. Customers subscribe to plans that grant access to restricted products and perks like discounts and free shipping.

### Store components

Use in MDX template files:

#### `MyMembership`

```mdx
<MyMembership />
```

#### `PlanDetail`

```mdx
<PlanDetail />
```

#### `PlanListing`

```mdx
<PlanListing />
```


---

## `@86d-app/multi-currency`

Manages multiple currencies, exchange rates, price conversions, and per-product price overrides for international commerce.

### Store components

Use in MDX template files:

#### `CurrencySelector`

```mdx
<CurrencySelector />
```

**Props**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `value` | `string \| undefined` | No | Currently selected currency code (ISO 4217) |
| `onChange` | `((code: string) => void) \| undefined` | No | Called when user selects a different currency |
| `compact` | `boolean \| undefined` | No | Show compact mode (code only, no name) |

#### `PriceDisplay`

```mdx
<PriceDisplay basePriceInCents={0} />
```

**Props**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `productId` | `string \| undefined` | No | Product ID for price override lookup |
| `basePriceInCents` | `number` | Yes | Base price in cents (smallest unit of base currency) |
| `currencyCode` | `string \| undefined` | No | Target currency code (ISO 4217) |
| `compareAtPriceInCents` | `number \| undefined` | No | Compare-at price in cents (for sale display) |
| `className` | `string \| undefined` | No | Additional CSS class for the container |


---

## `@86d-app/navigation`

Manages store navigation menus (header, footer, sidebar, mobile) with nested menu items supporting links, categories, collections, pages, and products.

### Store components

Use in MDX template files:

#### `NavFooter`

```mdx
<NavFooter />
```

#### `NavMenu`

```mdx
<NavMenu />
```

#### `NavMobileMenu`

```mdx
<NavMobileMenu />
```


---

## `@86d-app/newsletter`

Manages an email subscriber list. Does NOT send emails — that is left to external integrations. Simply manages the subscriber database.

### Store components

Use in MDX template files:

#### `NewsletterForm`

```mdx
<NewsletterForm />
```

**Props**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `showName` | `boolean \| undefined` | No |  |
| `source` | `string \| undefined` | No |  |
| `title` | `string \| undefined` | No |  |
| `description` | `string \| undefined` | No |  |
| `compact` | `boolean \| undefined` | No |  |

#### `NewsletterInline`

```mdx
<NewsletterInline />
```

#### `NewsletterUnsubscribe`

```mdx
<NewsletterUnsubscribe />
```


---

## `@86d-app/notifications`

In-app and email notification system with templates, batch send, priority levels, event emission, and per-customer preferences.

### Store components

Use in MDX template files:

#### `NotificationBell`

```mdx
<NotificationBell />
```

**Props**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `href` | `string \| undefined` | No |  |

#### `NotificationInbox`

```mdx
<NotificationInbox />
```

**Props**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `title` | `string \| undefined` | No |  |
| `emptyMessage` | `string \| undefined` | No |  |

#### `NotificationPreferences`

```mdx
<NotificationPreferences />
```


---

## `@86d-app/order-notes`

Notes and comments on orders from customers, admins, and system events. Supports internal (admin-only) notes, pinning, and per-author access control.

### Store components

Use in MDX template files:

#### `OrderNotes`

```mdx
<OrderNotes />
```


---

## `@86d-app/orders`

Order lifecycle management: CRUD, status transitions, fulfillments, returns, invoices, notes, bulk operations, guest tracking, and reordering.

### Store components

Use in MDX template files:

#### `OrderDetail`

```mdx
<OrderDetail />
```

#### `OrderHistory`

```mdx
<OrderHistory />
```

#### `OrderReturns`

```mdx
<OrderReturns />
```

#### `OrderTracker`

```mdx
<OrderTracker />
```


---

## `@86d-app/pages`

CMS-style static pages with draft/published/archived workflow, hierarchical structure, and optional navigation visibility.

### Store components

Use in MDX template files:

#### `PageDetail`

```mdx
<PageDetail />
```

#### `PageListing`

```mdx
<PageListing />
```


---

## `@86d-app/preorders`

Manages preorder campaigns for upcoming or limited-edition products. Supports full payment and deposit-based preorders with quantity limits, estimated ship dates, and customer notifications.

### Store components

Use in MDX template files:

#### `MyPreorders`

```mdx
<MyPreorders />
```

#### `PreorderButton`

```mdx
<PreorderButton />
```


---

## `@86d-app/product-labels`

Visual labels and badges for products — "New", "Sale", "Best Seller", "Limited Edition", etc. Supports scheduled labels, conditional assignment rules, and bulk operations.

### Store components

Use in MDX template files:

#### `ProductBadges`

```mdx
<ProductBadges />
```


---

## `@86d-app/product-qa`

Product-specific questions and answers for customer-facing product pages. Distinct from reviews (ratings), FAQ (store-wide), and tickets (private support).

### Store components

Use in MDX template files:

#### `AnswerList`

```mdx
<AnswerList />
```

#### `ProductQuestions`

```mdx
<ProductQuestions />
```

#### `QuestionCard`

```mdx
<QuestionCard />
```

#### `QuestionForm`

```mdx
<QuestionForm />
```


---

## `@86d-app/products`

Product catalog with variants, hierarchical categories, and collections. Full CRUD for admin, read-only browsing and search for storefront. Includes CSV import, bulk operations, and inventory management.

### Store components

Use in MDX template files:

#### `ProductCard`

```mdx
<ProductCard product={...} />
```

**Props**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `product` | `Product` | Yes |  |
| `showAddToCart` | `boolean` | No |  |


---

## `@86d-app/quotes`

B2B request-for-quote (RFQ) module. Customers create quotes with line items, submit for review, and negotiate pricing with admin before converting to orders.

### Store components

Use in MDX template files:

#### `MyQuotes`

```mdx
<MyQuotes />
```

#### `QuoteDetail`

```mdx
<QuoteDetail />
```

#### `QuoteRequest`

```mdx
<QuoteRequest />
```


---

## `@86d-app/recently-viewed`

Tracks products customers have viewed and surfaces them for rediscovery. Supports both authenticated (customerId) and anonymous (sessionId) users. Deduplicates repeat views within a 5-minute window.

### Store components

Use in MDX template files:

#### `RecentlyViewedCompact`

```mdx
<RecentlyViewedCompact />
```

#### `RecentlyViewedGrid`

```mdx
<RecentlyViewedGrid />
```


---

## `@86d-app/recommendations`

Product recommendation engine with four strategies: manual (admin-curated), bought_together (co-occurrence), trending (interaction velocity), and personalized (category affinity + co-occurrence fallback).

### Store components

Use in MDX template files:

#### `ProductRecommendations`

```mdx
<ProductRecommendations productId="..." />
```

**Props**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `productId` | `string` | Yes | The product ID to get recommendations for |
| `title` | `string \| undefined` | No | Section title |
| `strategy` | `"manual" \| "bought_together" \| undefined` | No | Recommendation strategy to use |
| `limit` | `number \| undefined` | No | Max number of recommendations |

#### `TrendingProducts`

```mdx
<TrendingProducts />
```

**Props**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `title` | `string \| undefined` | No | Section title |
| `limit` | `number \| undefined` | No | Max number of products |


---

## `@86d-app/referrals`

Customer referral program with unique codes, referral tracking, and configurable reward rules for both referrer and referee.

### Store components

Use in MDX template files:

#### `ReferralApply`

```mdx
<ReferralApply />
```

#### `ReferralDashboard`

```mdx
<ReferralDashboard />
```

#### `ReferralShare`

```mdx
<ReferralShare />
```


---

## `@86d-app/returns`

Manages customer return requests with a multi-step approval workflow (requested -> approved -> received -> completed) and line-item tracking.

### Store components

Use in MDX template files:

#### `ReturnForm`

```mdx
<ReturnForm />
```

#### `ReturnStatus`

```mdx
<ReturnStatus />
```


---

## `@86d-app/reviews`

Product reviews, ratings, reporting, and helpfulness voting. Reviews start as `pending` and require admin approval before being publicly visible (unless `autoApprove` is set).

### Store components

Use in MDX template files:

#### `DistributionBars`

```mdx
<DistributionBars />
```

#### `ProductReviews`

```mdx
<ProductReviews />
```

#### `ReviewCard`

```mdx
<ReviewCard />
```

#### `ReviewForm`

```mdx
<ReviewForm />
```

#### `ReviewsSummary`

```mdx
<ReviewsSummary />
```

#### `StarDisplay`

```mdx
<StarDisplay />
```

#### `StarPicker`

```mdx
<StarPicker />
```


---

## `@86d-app/saved-addresses`

Customer address book management. Stores shipping and billing addresses with default selection per customer.

### Store components

Use in MDX template files:

#### `AddressBook`

```mdx
<AddressBook />
```


---

## `@86d-app/search`

In-memory full-text search with fuzzy matching, faceted filtering, click tracking, and query analytics.

### Store components

Use in MDX template files:

#### `SearchBar`

```mdx
<SearchBar />
```

**Props**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `placeholder` | `string \| undefined` | No |  |
| `onSearch` | `((query: string) => void) \| undefined` | No |  |

#### `SearchPage`

```mdx
<SearchPage />
```

#### `SearchResults`

```mdx
<SearchResults query="..." />
```

**Props**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `query` | `string` | Yes |  |
| `entityType` | `string \| undefined` | No |  |
| `sessionId` | `string \| undefined` | No |  |
| `limit` | `number \| undefined` | No |  |


---

## `@86d-app/seo`

Manages per-page meta tags (title, description, Open Graph, Twitter Card, JSON-LD), URL redirects, and sitemap generation.

### Store components

Use in MDX template files:

#### `SeoHead`

```mdx
<SeoHead path="..." />
```

**Props**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | Yes | Page path to fetch meta tags for |
| `fallbackTitle` | `string` | No | Fallback title if none configured |
| `fallbackDescription` | `string` | No | Fallback description if none configured |

#### `SitemapPage`

```mdx
<SitemapPage />
```


---

## `@86d-app/shipping`

Shipping zone/rate management, shipping methods with delivery estimates, carrier definitions with tracking URLs, and shipment lifecycle tracking. Standalone — no dependencies on other modules.

### Store components

Use in MDX template files:

#### `ShippingEstimator`

```mdx
<ShippingEstimator />
```

#### `ShippingOptions`

```mdx
<ShippingOptions country="..." orderAmount={0} />
```

**Props**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `country` | `string` | Yes | ISO 3166-1 alpha-2 country code. |
| `orderAmount` | `number` | Yes | Cart total in cents. |
| `weight` | `number` | No | Total weight in grams (optional). |
| `onSelect` | `(rate: CalculatedRate) => void` | No | Called when a rate is selected. |
| `selectedRateId` | `string` | No | Pre-selected rate ID. |

#### `ShippingRateSummary`

```mdx
<ShippingRateSummary rateName="..." price={0} />
```

**Props**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `rateName` | `string` | Yes | Name of the selected shipping rate. |
| `zoneName` | `string` | No | Name of the shipping zone. |
| `price` | `number` | Yes | Price in cents. |


---

## `@86d-app/social-proof`

Social proof and trust signals for products — purchase counts, viewer counts, trending indicators, recent activity feeds, and configurable trust badges. Drives conversions by showing aggregate activity data to store visitors.

### Store components

Use in MDX template files:

#### `ProductActivity`

```mdx
<ProductActivity />
```

#### `RecentPurchases`

```mdx
<RecentPurchases />
```

#### `TrustBadges`

```mdx
<TrustBadges />
```


---

## `@86d-app/social-sharing`

Track and generate share links for products, collections, pages, and blog posts across social networks.

### Store components

Use in MDX template files:

#### `ShareButtons`

```mdx
<ShareButtons targetType="..." targetId="..." url="..." />
```

**Props**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `targetType` | `string` | Yes |  |
| `targetId` | `string` | Yes |  |
| `url` | `string` | Yes |  |
| `message` | `string` | No |  |


---

## `@86d-app/store-credits`

Customer credit accounts for returns, referrals, and manual adjustments — debitable at checkout.

### Store components

Use in MDX template files:

#### `StoreCreditApply`

```mdx
<StoreCreditApply />
```

#### `StoreCreditBalance`

```mdx
<StoreCreditBalance />
```

#### `StoreCreditTransactions`

```mdx
<StoreCreditTransactions />
```


---

## `@86d-app/store-locator`

Physical store location management with proximity search, hours tracking, and click-and-collect support. Omnichannel bridge for brands with brick-and-mortar presence.

### Store components

Use in MDX template files:

#### `LocationDetail`

```mdx
<LocationDetail />
```

#### `LocationList`

```mdx
<LocationList />
```


---

## `@86d-app/store-pickup`

BOPIS (Buy Online, Pick Up In Store) module. Manages pickup locations, time windows, and order pickup lifecycle.

### Store components

Use in MDX template files:

#### `LocationPicker`

```mdx
<LocationPicker />
```


---

## `@86d-app/subscriptions`

Subscription plan and subscriber management. Handles recurring billing cycles, trial periods, and subscription lifecycle — status tracking only. Payment processing is delegated to P3 payment modules.

### Store components

Use in MDX template files:

#### `MySubscriptions`

```mdx
<MySubscriptions />
```

#### `PlanCard`

```mdx
<PlanCard />
```

#### `SubscriptionCard`

```mdx
<SubscriptionCard />
```

#### `SubscriptionPlans`

```mdx
<SubscriptionPlans />
```


---

## `@86d-app/tax`

Jurisdiction-based tax calculation engine with nexus management, transaction audit logging, compliance reporting, tax-inclusive pricing, categories, exemptions, compound rates, and rate stacking.

### Store components

Use in MDX template files:

#### `TaxBreakdown`

```mdx
<TaxBreakdown />
```

#### `TaxEstimate`

```mdx
<TaxEstimate />
```


---

## `@86d-app/tickets`

Customer support ticket system with threaded messages, categories, priority levels, and status tracking.

### Store components

Use in MDX template files:

#### `MyTickets`

```mdx
<MyTickets />
```

#### `TicketDetail`

```mdx
<TicketDetail />
```

#### `TicketForm`

```mdx
<TicketForm />
```


---

## `@86d-app/waitlist`

Product waitlist that lets customers subscribe to out-of-stock notifications and tracks demand per product.

### Store components

Use in MDX template files:

#### `BellIcon`

```mdx
<BellIcon />
```

#### `WaitlistButton`

```mdx
<WaitlistButton />
```

#### `WaitlistPage`

```mdx
<WaitlistPage />
```


---

## `@86d-app/warranties`

Product warranty plans, registrations, and claims management.

### Store components

Use in MDX template files:

#### `ClaimForm`

```mdx
<ClaimForm />
```

#### `WarrantyStatus`

```mdx
<WarrantyStatus />
```


---

## `@86d-app/wishlist`

Customer wishlists for saving and tracking favorite products across sessions. Supports sharing via token-based public links.

### Store components

Use in MDX template files:

#### `HeartIcon`

```mdx
<HeartIcon />
```

#### `WishlistButton`

```mdx
<WishlistButton />
```

#### `WishlistPage`

```mdx
<WishlistPage />
```


---
