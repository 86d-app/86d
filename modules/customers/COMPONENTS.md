# Customers Module — Store Components

Components exported for use in store MDX templates.

## AccountProfile

Displays the authenticated customer's profile (name, email, phone) with inline editing support for updating personal information.

### Props

None. The component manages its own state and fetches data via the module client.

### Usage in MDX

```mdx
<AccountProfile />
```

Use this component on a customer account or profile settings page.

## AddressBook

Manages the authenticated customer's saved addresses with full CRUD support for creating, editing, and deleting billing and shipping addresses.

### Props

None. The component manages its own state and fetches data via the module client.

### Usage in MDX

```mdx
<AddressBook />
```

Use this component on a customer account page to let users manage their saved addresses.

## LoyaltyCard

Displays the authenticated customer's loyalty points balance, tier, and transaction history.

### Props

None. The component manages its own state and fetches data via the module client.

### Usage in MDX

```mdx
<LoyaltyCard />
```

Use this component on a customer account or rewards page to show loyalty program status and point history.
