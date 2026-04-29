# ADR-007 -- Modelo operativo comun para STORE y ECOSYSTEM

Status: Accepted
Date: 2026-03-19

## Context

- Barmi ya tiene dos dominios operativos activos: STORE y ECOSYSTEM.
- Ambos dominios comparten ordenes, pagos, fulfillments y analytics/reporting administrativos.
- STORE hoy tiene una capa operativa mas rica:
  - conflicto operativo de stock post-pago
  - cancelacion manual admin
  - timeline operativo admin
  - reporting operativo con drill-down
- ECOSYSTEM hoy tiene una capa operativa mas simple:
  - ordenes, pagos y fulfillments funcionales
  - reporting operativo MVP
  - sin conflicto operativo equivalente a STORE
  - sin cancelacion administrativa con timestamp/evento dedicado
- Si se siguen agregando features sin una base conceptual explicita, aumenta el riesgo de divergencia en naming, semantica temporal y contratos.

El objetivo de esta ADR es fijar un modelo operativo base comun, explicitar extensiones por dominio y dejar guidelines de naming/contrato para evoluciones futuras sin refactor masivo inmediato.

## Problem

Hoy hay consistencia parcial, pero tambien divergencias reales:

- ambos dominios usan `PENDING_PAYMENT | PAID | CANCELLED` en ordenes, pero STORE agrega indicadores operativos derivados que ECOSYSTEM no expone.
- ambos dominios usan `PaymentIntent` y `Payment`, pero no todos los reportes usan el mismo naming para la misma idea temporal:
  - STORE report usa `ordersPaid`
  - ECOSYSTEM report usa `paymentsConfirmed`
- ambos dominios usan `FulfillmentStatus`, pero el tratamiento administrativo no esta documentado como un lifecycle comun.
- STORE usa outbox para eventos operativos de orden y fulfillment; ECOSYSTEM usa outbox para pago/fulfillment, pero no para conflicto operativo ni cancelacion manual.
- algunos conceptos son estado de dominio y otros son indicadores operativos derivados. Esa frontera no estaba formalizada.

## Decision

Se define un modelo operativo comun por capas:

1. **Core comun**
   - order lifecycle
   - payment lifecycle
   - fulfillment lifecycle
   - temporal semantics
   - reporting blocks

2. **Extensiones por dominio**
   - STORE agrega conflicto operativo post-pago y cancelacion manual operativa
   - ECOSYSTEM no agrega esas extensiones hasta que exista soporte de dominio explicito

3. **Guideline de naming**
   - se documenta un naming recomendado para futuros endpoints/DTOs/reportes
   - no se cambian contratos actuales en esta fase

4. **Guideline de contratos futuros**
   - se define una forma objetivo para `OperationalReport`, `OrderSummary` y `FulfillmentSummary`
   - se mantiene compatibilidad total con el baseline actual

## Modelo operativo base

### 1. Order lifecycle

#### Significado

La orden es la unidad comercial principal. Representa el compromiso de compra antes y despues del pago.

#### Status comunes

- `PENDING_PAYMENT`
  - la orden fue creada y todavia no quedo operativamente cerrada como pagada
- `PAID`
  - la orden supero el punto de confirmacion operativa definido por el dominio
- `CANCELLED`
  - la orden fue cancelada y deja de ser operable como compra activa

#### Fuente de verdad temporal

- `order.createdAt`
  - fuente de verdad para "ordenes creadas"
- no existe hoy un `paidAt` persistido en la orden
- no existe hoy un `cancelledAt` persistido en la orden

#### Consecuencia

Las metricas temporales de orden no deben inferirse desde `status` actual si existe una fuente temporal mas precisa en pagos o eventos.

### 2. Payment lifecycle

#### Significado

El pago representa la confirmacion economica externa o interna asociada a una orden.

#### Entidades comunes

- `PaymentIntent`
  - intento de checkout/iniciacion de pago
  - timestamp fuente: `payment_intents.created_at`
- `Payment`
  - registro de pago procesado
  - timestamp fuente para confirmacion: `payments.confirmed_at`

#### Fuente de verdad temporal

- `paymentIntent.createdAt`
  - fuente de verdad para "pago iniciado" o "checkout abierto"
- `payment.confirmedAt`
  - fuente de verdad para "pago confirmado"
  - tambien fuente recomendada para venta confirmada del periodo

#### Regla conceptual

La confirmacion economica del periodo debe medirse por `payments.confirmedAt`, no por cambio de `order.status`.

### 3. Fulfillment lifecycle

#### Significado

El fulfillment representa la ejecucion operativa posterior a una orden pagada.

#### Status comunes

- `PENDING`
- `DISPATCHED`
- `DELIVERED`
- `CANCELLED`

#### Fuente de verdad temporal

- `fulfillment.createdAt`
  - fuente de verdad para "fulfillments creados"
- no existe hoy timestamp dedicado por cambio de estado en la entidad fulfillment
- si se necesita historico temporal de estados, debe apoyarse en eventos o un modelo futuro explicito

#### Regla conceptual

El reporte operativo debe separar:

- metricas de periodo por `fulfillment.createdAt`
- snapshot actual por `fulfillment.status`

No deben mezclarse ambos significados dentro de la misma metrica.

### 4. Operational events

#### Significado

Los eventos outbox son la capa de hechos operativos durables para detectar situaciones que no siempre estan representadas como estado persistido primario.

#### Eventos comunes hoy

- `STORE_ORDER_PAID`
- `ECOSYSTEM_ORDER_PAID`
- `STORE_FULFILLMENT_CREATED`
- `ECOSYSTEM_FULFILLMENT_CREATED`
- `ECOSYSTEM_FULFILLMENT_STATUS_CHANGED`
- `STORE_ORDER_PAYMENT_MISMATCH`
- `ECOSYSTEM_ORDER_PAYMENT_MISMATCH`

#### Eventos/indicadores especificos de STORE

- `STORE_ORDER_STOCK_CONFLICT`
- `STORE_ORDER_MANUALLY_CANCELLED`

#### Regla conceptual

- los eventos outbox deben usarse para hechos operativos que no tienen timestamp dedicado en la entidad principal
- no se debe inventar una metrica/evento simetrico en el otro dominio si hoy no existe soporte real

### 5. Temporal semantics

#### Regla base

Toda capa de reporting operativo debe separar explicitamente:

- **period metrics**
  - metricas medidas dentro de una ventana temporal
- **current snapshot**
  - conteos o estado actual al momento de consulta

#### Convencion temporal actual

- timezone de reporting: `America/Argentina/Buenos_Aires`
- rangos cortos soportados:
  - `today`
  - `7d`
  - `30d`

#### Fuente de verdad recomendada por metrica

- `ordersCreated` -> `order.createdAt`
- `paymentsConfirmed` -> `payment.confirmedAt`
- `confirmedSalesTotalAmount` -> `payment.confirmedAt`
- `fulfillmentsCreated` -> `fulfillment.createdAt`
- `manualCancellations` -> evento de cancelacion manual
- `operationalConflicts` -> evento operativo dedicado
- `fulfillmentsByStatus` -> status actual

## Core comun vs extensiones por dominio

### Core comun

- orden con lifecycle `PENDING_PAYMENT -> PAID | CANCELLED`
- `PaymentIntent` como inicio de pago
- `Payment.confirmedAt` como confirmacion economica
- fulfillment con lifecycle comun
- reporting dividido entre periodo y snapshot
- uso de outbox para hechos operativos relevantes

### Extension STORE

STORE agrega una capa operativa administrativa adicional:

- conflicto operativo de stock post-pago
- cancelacion manual admin
- timeline operativo enriquecido
- drill-down desde reporting

Estas capacidades son extensiones validas del modelo base, no un cambio del core comun.

### Extension ECOSYSTEM

ECOSYSTEM mantiene un modelo mas simple:

- no existe conflicto operativo equivalente a stock post-pago
- no existe hoy `cancelledAt` ni evento administrativo de cancelacion manual
- reporting operativo se limita a orden creada, pago confirmado, fulfillment creado y snapshot

Esto es una diferencia real de dominio/soporte actual, no una deuda conceptual por si misma.

## Diferencias explicitas entre STORE y ECOSYSTEM

### Orders

Similitudes:

- mismo set de status
- mismo uso de `createdAt`
- misma asociacion 1 orden -> 0..1 pago confirmado -> 0..1 fulfillment operativo

Diferencias:

- STORE resuelve stock al confirmar pago; ECOSYSTEM no
- STORE puede quedar en `PENDING_PAYMENT` aun con pago confirmado si hubo conflicto operativo
- ECOSYSTEM marca `PAID` al confirmar pago valido y no tiene conflicto post-pago equivalente

### Payments

Similitudes:

- ambos usan `PaymentIntent`
- ambos usan `Payment`
- ambos usan `PaymentScope`
- ambos publican evento `*_ORDER_PAID`

Diferencias:

- STORE tiene branch adicional de conflicto post-pago
- ECOSYSTEM no crea esa capa intermedia

### Fulfillments

Similitudes:

- mismo status enum
- creacion asociada a orden `PAID`
- eventos outbox de creacion

Diferencias:

- STORE hoy usa fulfillment como parte de la resolucion post-pago y del retry operativo
- ECOSYSTEM expone mas claramente evento de cambio de estado (`ECOSYSTEM_FULFILLMENT_STATUS_CHANGED`)

### Reporting

Similitudes:

- summary agregado
- report operativo con rango corto
- mismo timezone operativo
- snapshot actual de fulfillments

Diferencias:

- STORE incluye metricas de conflicto operativo y cancelacion manual
- ECOSYSTEM no las incluye porque no tiene fuente de verdad equivalente
- naming actual diverge:
  - STORE `ordersPaid`
  - ECOSYSTEM `paymentsConfirmed`

## Naming guideline recomendado

### Regla general

El naming futuro debe describir el hecho temporal real, no inferencias ambiguas sobre estado.

### Recomendacion para metricas

Preferir:

- `ordersCreated`
- `paymentsInitiated`
- `paymentsConfirmed`
- `confirmedSalesTotalAmount`
- `fulfillmentsCreated`
- `fulfillmentsByStatus`
- `manualCancellationEvents`
- `operationalConflictEvents`

Evitar como naming base futuro:

- `ordersPaid`
  - es ambiguo: puede significar status actual `PAID` o pago confirmado en el periodo
- `stockConflicts`
  - sirve como UI label en STORE, pero como nombre de contrato es mas claro `operationalConflictEvents` con `conflictType`

### Recomendacion para DTOs/reporting

Preferir una estructura comun:

- `periodMetrics.paymentsConfirmed`
- `periodMetrics.fulfillmentsCreated`
- `periodMetrics.confirmedSalesTotalAmount`

Y luego extensiones por dominio:

- `periodMetrics.store.manualCancellationEvents`
- `periodMetrics.store.operationalConflictEvents`

### Regla para labels UI

Se puede seguir usando lenguaje orientado al operador:

- "Pagos confirmados"
- "Conflictos operativos"
- "Cancelaciones manuales"

Pero el naming de contrato interno deberia ser mas semantico y menos dependiente del wording de pantalla.

## Propuesta de contratos futuros (sin implementar ahora)

### 1. OperationalReport

```ts
type OperationalReport = {
  scope: 'STORE' | 'ECOSYSTEM'
  actorId: string
  actorSlug: string
  rangeKey: 'today' | '7d' | '30d'
  rangeLabel: string
  from: string
  to: string
  timezone: string
  periodMetrics: CommonPeriodMetrics
  currentSnapshot: CommonCurrentSnapshot
  domainExtensions?: StoreOperationalExtensions | EcosystemOperationalExtensions
}

type CommonPeriodMetrics = {
  ordersCreated: number
  paymentsConfirmed: number
  fulfillmentsCreated: number
  confirmedSalesTotalAmount: number
  confirmedSalesCurrency: string | null
}

type CommonCurrentSnapshot = {
  fulfillmentsByStatus: Record<'PENDING' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED', number>
}

type StoreOperationalExtensions = {
  manualCancellationEvents: number
  operationalConflictEvents: Array<{
    type: 'STOCK_CONFLICT'
    count: number
  }>
}

type EcosystemOperationalExtensions = {}
```

### 2. OrderSummary

```ts
type OrderSummary = {
  orderId: string
  scope: 'STORE' | 'ECOSYSTEM'
  status: 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED'
  createdAt: string
  totalAmount: number
  currency: string
  paymentConfirmed: boolean
  hasFulfillment: boolean
  operationalFlags?: {
    manuallyCancelled?: boolean
    hasOperationalConflict?: boolean
  }
}
```

### 3. FulfillmentSummary

```ts
type FulfillmentSummary = {
  fulfillmentId: string
  scope: 'STORE' | 'ECOSYSTEM'
  orderId: string
  ownerId: string
  status: 'PENDING' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED'
  method: string
  createdAt: string
}
```

### Regla de evolucion

Si estos contratos se implementan en el futuro:

- deben convivir primero con los actuales
- no deben romper endpoints existentes
- la convergencia debe hacerse por adaptadores o nuevas versiones de contrato

## Consequences

### Positivas

- baja el riesgo de divergencia conceptual entre dominios
- queda clara la frontera entre core comun y extensiones STORE
- reporting futuro puede crecer sin mezclar status actual con hechos temporales
- naming futuro tiene una guia clara

### Negativas

- queda coexistencia temporal de naming actual y naming recomendado
- algunos huecos de dominio quedan explicitados en vez de ocultos
- futuras alineaciones requeriran migracion progresiva, no cambio unico

## What does not change now

- no se cambian endpoints actuales
- no se cambian DTOs actuales
- no se renombran campos existentes
- no se agrega `cancelledAt` a ordenes
- no se agrega `paidAt` a ordenes
- no se agrega sistema nuevo de eventos
- no se fuerza paridad artificial entre STORE y ECOSYSTEM

## Optional roadmap

### Paso 1

- usar naming recomendado en nuevos endpoints/reportes antes de tocar los viejos

### Paso 2

- si ECOSYSTEM necesita cancelaciones temporales, agregar `cancelledAt` o evento dedicado en vez de inferir desde status actual

### Paso 3

- si STORE/ECOSYSTEM convergen mas en reporting, introducir un `OperationalReport` comun versionado en adapters/frontend

### Paso 4

- si el producto necesita historico operacional mas profundo, separar formalmente:
  - domain status
  - event history
  - reporting facts

## Summary

STORE y ECOSYSTEM comparten un core operativo comun: orden, pago, fulfillment, timestamps base y reporting por periodo/snapshot. STORE agrega extensiones operativas reales que hoy no existen en ECOSYSTEM. La evolucion futura debe unificar semantica y naming del core comun, pero preservar extensiones por dominio donde haya diferencias reales.
