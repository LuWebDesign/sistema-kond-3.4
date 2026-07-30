# Zipnova Shipping Provider Specification

## Purpose

Define the shopper and admin behavior for Zipnova-backed shipping quotes, curated checkout choices, resilient fallback checkout, and admin-confirmed shipment creation.

## Requirements

### Requirement: Curated Zipnova shipping choices

The system MUST request Zipnova shipping quotes server-side and expose only curated normalized checkout options. The first version MUST support at least one home-delivery option and one pickup-point/sucursal option when Zipnova returns eligible services. The system MUST NOT expose raw Zipnova carrier/service lists directly to shoppers.

#### Scenario: Home delivery option shown

- GIVEN Zipnova returns eligible home-delivery quote data
- WHEN the shopper reaches shipping selection
- THEN the system shows a normalized home-delivery option with price, label, and provider metadata retained for the order
- AND raw provider-only options are not shown as separate choices

#### Scenario: Pickup option shown

- GIVEN Zipnova returns eligible pickup-point or sucursal quote data
- WHEN the shopper reaches shipping selection
- THEN the system shows a normalized pickup option with pickup location details sufficient for the shopper to choose it

### Requirement: Quote failure fallback

The system MUST allow checkout to continue as `envío a coordinar` when Zipnova quoting is unavailable, fails, or returns no usable curated option. This fallback MUST be persisted as the order shipping choice.

#### Scenario: Zipnova unavailable

- GIVEN Zipnova quote retrieval fails or times out
- WHEN the shopper continues checkout
- THEN the system offers `envío a coordinar` instead of blocking purchase
- AND the created order records shipping as coordination pending

#### Scenario: No usable quote

- GIVEN Zipnova returns no eligible home-delivery or pickup option
- WHEN shipping options are prepared
- THEN the system allows only the coordinate-shipping fallback for provider shipping

### Requirement: Shipping charge and metadata persistence

The system MUST include the selected paid shipping amount exactly once in the MercadoPago checkout total. The order MUST persist normalized shipping data and safe Zipnova quote metadata needed for later shipment creation, including logistic type, service type code, carrier id, and pickup-point data when applicable.

#### Scenario: Paid shipping charged once

- GIVEN a shopper selects a paid Zipnova shipping option
- WHEN the MercadoPago preference is created
- THEN the preference total includes product subtotal plus that shipping amount once

#### Scenario: Safe metadata retained

- GIVEN a shopper places an order with a Zipnova pickup option
- WHEN the order is persisted
- THEN the order stores normalized shipping fields and safe Zipnova metadata required for admin shipment generation

### Requirement: Admin-confirmed shipment creation

The system MUST NOT create real Zipnova shipments from the MercadoPago webhook. Shipment creation MUST remain pending until an admin reviews the order and explicitly confirms or generates the shipment from the admin order flow.

#### Scenario: Webhook updates payment only

- GIVEN MercadoPago sends an approved-payment webhook for an order with Zipnova shipping
- WHEN the webhook is processed
- THEN payment status is updated as appropriate
- AND no real Zipnova shipment is created automatically

#### Scenario: Admin generates shipment

- GIVEN an order has payment accepted and complete shipping metadata
- WHEN an admin confirms shipment generation
- THEN the system creates the Zipnova shipment and records the resulting shipment status/reference on the order
