---
name: analytics-cards
description: >
  Reusable analytics cards component for admin pages (dashboard, products, cotizaciones).
  Trigger: Use when rendering metric/analytics cards across admin pages.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use
- Standardize size and appearance of metric cards across admin UI.
- Use for dashboard top metrics, products metrics, and cotizaciones metrics.

## Critical Patterns
- Provide a compact mode for small horizontal cards (used in /admin/products and admin metrics).
- Provide a non-compact mode for taller cards with subtitle and trend (used elsewhere).
- Support `leftAccent` mode to render a colored left border (cotizaciones use-case).
- Do not access window or DOM during module load (component is client-safe).

## Props
- title: string — label shown above the value.
- value: string | number — main metric value (format before passing if needed).
- icon: string | node — emoji or icon node.
- color: string — hex color used for accent/background.
- isAmount: boolean — slightly smaller font for currency.
- subtitle: string — optional secondary text.
- trend: { icon, text, color } — optional trend object.
- compact: boolean — render compact horizontal card (default for metrics).
- leftAccent: boolean — render colored left border.

## Example
```jsx
import AnalyticsCard from 'components/AnalyticsCard'

<AnalyticsCard
  title="Total Productos"
  value={123}
  icon="📦"
  color="#3b82f6"
  compact
/>
```

## Files
- next-app/components/AnalyticsCard.js — implementation

## Notes
- Keep the component style light and inline to avoid CSS cascade issues.
- If you change spacing or typography, update all usages to verify responsive behavior.
