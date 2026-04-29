# ADR-006 -- Baseline v1 del sistema Barmi

Status: Accepted
Date: 2026-03-16

## Context

- Los journeys principales de STORE y ECOSYSTEM ya estan implementados dentro del alcance actual del backend.
- El backoffice STORE ya es operativo para ordenes, fulfillments, members, products, shipping zones y analytics MVP.
- El backoffice ECOSYSTEM ya incluye ordenes, fulfillments, products, shipping zones y analytics MVP.
- El frontend fue consolidado para reducir deuda estructural y dejar flujos publicos y administrativos coherentes.
- El frontend tambien recibio hardening tecnico focalizado para estabilizar runtime/test sin cambiar negocio.
- Payments initiation, webhooks y tracking post-payment funcionan dentro del alcance actual del sistema.

Seguir agregando features frontend sin nuevo soporte backend agregaria complejidad innecesaria y haria menos clara la frontera real de la version actual.

Por eso se decide cerrar esta etapa como una baseline v1 estable del sistema.

## Decision

El proyecto Barmi alcanza una baseline estable (v1) y las iteraciones futuras deben considerarse extensiones sobre esta base, no parte del cierre de la etapa actual.

## Scope included in v1

### STORE publico

- catalogo
- shipping quote
- checkout
- initiation de pago
- tracking post-payment
- consulta de ordenes

### STORE admin

- dashboard operativo
- analytics MVP
- listado de ordenes
- detalle de ordenes
- handoff order -> fulfillment
- gestion de fulfillments
- gestion de members
- gestion de products
- gestion de shipping zones

### ECOSYSTEM publico

- catalogo ecosystem
- shipping quote
- checkout
- initiation de pago
- tracking de ordenes

### ECOSYSTEM admin

- orders admin
- ecosystem fulfillment end-to-end MVP
- analytics MVP
- products admin
- shipping zones admin

### Infraestructura transversal

- auth
- guards
- routing
- contracts/adapters frontend
- payments initiation
- webhooks
- documentacion principal del proyecto

## Out of scope for v1

Las siguientes capacidades no forman parte de la baseline actual:

- BI/reporting avanzado
- exportaciones
- inventario / stock profundo
- catalogo avanzado con variantes o media compleja
- expansiones publicas no soportadas por backend

## Consequences

- baseline estable del sistema
- arquitectura preservada
- claridad para futuras iteraciones

- algunas extensiones quedan pendientes
- la expansion futura depende de nuevo soporte backend

## Next logical evolution

El siguiente bloque natural despues de esta baseline es profundizar capacidades hoy declaradas como fuera de alcance: reporting avanzado, inventario/catalogo extendido o mejoras operativas sobre la base ya cerrada.
