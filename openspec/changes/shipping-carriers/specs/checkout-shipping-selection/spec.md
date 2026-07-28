# Checkout Shipping Selection Specification

## Purpose

Defines customer-facing checkout behavior for choosing delivery type, branch pickup, quoted shipping, quote fallback, and free-shipping presentation.

## Requirements

### Requirement: Delivery choice and destination

For shipping orders, checkout MUST let customers choose `domicilio` or `sucursal` and provide enough destination data to quote and persist the chosen shipping method.

#### Scenario: Customer selects home delivery

- GIVEN the cart is in shipping checkout
- WHEN the customer chooses `domicilio` and enters destination data
- THEN checkout MUST request home-delivery rates
- AND persist the selected delivery type with the order.

#### Scenario: Customer selects branch pickup

- GIVEN the cart is in shipping checkout
- WHEN the customer chooses `sucursal`
- THEN checkout MUST allow branch selection
- AND persist the selected branch snapshot with the order.

### Requirement: Quote fallback

Checkout MUST continue when carrier quotes are unavailable and display `A cotizar` instead of a numeric shipping price.

#### Scenario: Quote unavailable during checkout

- GIVEN a shipping order cannot obtain a carrier quote
- WHEN the customer reviews checkout totals
- THEN the shipping price MUST be shown as `A cotizar`
- AND the customer MUST be able to continue checkout.

### Requirement: Free shipping presentation

When a free-shipping promotion applies, checkout MUST show `Envío gratis` and strike through the quoted shipping price when a quote exists.

#### Scenario: Free shipping with quote

- GIVEN a quote exists and a free-shipping promotion applies
- WHEN checkout displays shipping cost
- THEN it MUST show `Envío gratis`
- AND show the quoted price struck through.

#### Scenario: Free shipping without quote

- GIVEN no quote exists and a free-shipping promotion applies
- WHEN checkout displays shipping cost
- THEN it MUST show `Envío gratis`
- AND MUST NOT require a quote to continue.

### Requirement: Single shipping charge

Paid shipping MUST be added exactly once across checkout display, persisted order total, and MercadoPago payment preference.

#### Scenario: Paid shipping selected

- GIVEN the customer selected a paid shipping quote
- WHEN the order and payment preference are created
- THEN the selected shipping cost MUST be included once in the displayed total
- AND included once in the persisted order total and MercadoPago amount.

#### Scenario: Fallback or free shipping selected

- GIVEN shipping is `A cotizar` or free
- WHEN the order and payment preference are created
- THEN no positive shipping amount MUST be added to MercadoPago
- AND the order MUST retain the shipping state for admin follow-up.
