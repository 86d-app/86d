# Abandoned Carts Module — Store Components

Components exported for use in store MDX templates.

## CartRecovery

Recovers an abandoned cart by its recovery token, displaying the saved cart items or an expiration notice if the token is no longer valid.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `token` | `string` | Yes | Recovery token used to look up the abandoned cart |

### Usage in MDX

```mdx
<CartRecovery token="abc123" />
```

Use this component on a dedicated cart recovery landing page linked from recovery emails.
