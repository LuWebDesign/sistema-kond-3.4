# Shipping Carriers Specification

## Purpose

Defines provider-neutral shipping capability for the Next.js app, with Correo Argentino MiCorreo/PAQ.AR as the first carrier and later carriers supported without carrier-specific public naming.

## Requirements

### Requirement: Provider-neutral carrier operations

The system MUST quote, normalize, persist, and expose shipping data using provider-neutral concepts while supporting Correo Argentino first.

#### Scenario: Quote normalized carrier rates

- GIVEN a destination postal code and package data are available
- WHEN shipping rates are requested
- THEN the system MUST request rates from origin postal code `1842`
- AND return normalized options for home delivery and/or branch pickup.

#### Scenario: Missing or unavailable quote

- GIVEN the carrier cannot return a usable quote
- WHEN checkout requests shipping rates
- THEN the system MUST return an unavailable quote state
- AND MUST NOT block checkout continuation.

### Requirement: Package shipping data

Product create and edit flows MUST capture package data in a separate shipping section: weight in kilograms and length, width/depth, and height in centimeters. Customer-facing `medidas` MUST remain separate.

#### Scenario: Admin maintains package data

- GIVEN an admin creates or edits a product
- WHEN the shipping data section is saved
- THEN package weight MUST be stored as kilograms
- AND package dimensions MUST be stored as separate centimeter values.

#### Scenario: Carrier boundary validation

- GIVEN package data is used for a Correo Argentino request
- WHEN carrier payload values are prepared
- THEN kilograms MUST be converted to grams
- AND weight outside 1g-25000g or any side over 150cm MUST be treated as invalid for quoting.

### Requirement: Shipment import after purchase

After payment approval, the system MUST attempt to import/generate shipment data in MiCorreo and persist the selected shipping snapshot, import result, and admin follow-up status. Label payment, label printing, label attachment, and physical dispatch remain manual admin operations in MiCorreo.

#### Scenario: Import home delivery shipment

- GIVEN a paid or confirmed order selected home delivery
- WHEN shipment import runs
- THEN the system MUST send recipient and shipping data
- AND persist the carrier import result with the order
- AND MUST NOT imply that the label has been paid, printed, or physically dispatched.

#### Scenario: Import branch pickup shipment

- GIVEN a paid or confirmed order selected branch pickup
- WHEN shipment import runs
- THEN the system MUST include the selected agency
- AND persist the agency snapshot with the order
- AND MUST NOT imply that the label has been paid, printed, or physically dispatched.

#### Scenario: Admin completes label workflow manually

- GIVEN shipment data was imported in MiCorreo
- WHEN admin prepares the package
- THEN the admin MUST complete label payment/generation, printing, attachment, and dispatch manually in MiCorreo or the corresponding carrier workflow.

#### Scenario: Import failure needs follow-up

- GIVEN the order is created but carrier import fails
- WHEN admin views the order
- THEN the order MUST retain checkout data
- AND expose a follow-up state for manual resolution.

### Requirement: Server-only carrier secrets

Carrier credentials and tokens MUST remain server-only and MUST NOT be exposed to client bundles, public environment variables, or persisted customer-visible data.

#### Scenario: Client requests shipping data

- GIVEN a customer requests rates or agencies
- WHEN the response is returned
- THEN it MUST NOT include carrier credentials, Basic Auth values, bearer tokens, or unsafe raw payloads.
