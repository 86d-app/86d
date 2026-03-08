# Referrals Module — Store Components

Components exported for use in store MDX templates.

## ReferralApply

Provides a form for customers to enter and submit a referral code. Handles validation, displays success or error states, and automatically uppercases the code before submission.

### Props

None. The component manages its own state and fetches data via the module client.

### Usage in MDX

```mdx
<ReferralApply />
```

Best used on a checkout page or dedicated referral redemption page where customers can apply a friend's referral code.

## ReferralDashboard

Displays the customer's referral statistics including their referral code, total referrals, completed referrals, and pending referrals. Fetches stats automatically from the module client.

### Props

None. The component manages its own state and fetches data via the module client.

### Usage in MDX

```mdx
<ReferralDashboard />
```

Best used on a customer account page to show referral program performance at a glance.

## ReferralShare

Shows the customer's referral code with copy-to-clipboard buttons for both the code and a shareable referral URL. Fetches the customer's referral code and usage count from the module client.

### Props

None. The component manages its own state and fetches data via the module client.

### Usage in MDX

```mdx
<ReferralShare />
```

Best used on a referral program page or account dashboard where customers can grab their referral link to share with friends.
