# Transactional Email Templates

These fixtures document the current STORE transactional emails. They are intentionally plain text and operational, not marketing templates.

## buyer_order_created

Metric template: `order_created_buyer`

Subject:

```text
[Notify Store] Orden creada 11111111-1111-1111-1111-111111111111
```

Body:

```text
Tu orden fue creada correctamente.

Orden: 11111111-1111-1111-1111-111111111111
Estado: pendiente de pago
Total: 1200 ARS
Seguimiento: https://notify-store.example.com/store/orders/11111111-1111-1111-1111-111111111111

Te vamos a avisar cuando haya cambios relevantes en el pago o la entrega.
```

Variables: `store.name`, `store.slug`, `order.id`, `order.totalAmount`, `order.currency`, `app.notifications.storePublicScheme`, `app.tenant.baseDomain`.

## buyer_payment_confirmed

Metric template: `order_paid_buyer`

Subject:

```text
[Notify Store] Pago confirmado para tu orden 11111111-1111-1111-1111-111111111111
```

Body:

```text
Confirmamos el pago de tu orden.

Orden: 11111111-1111-1111-1111-111111111111
Estado: pagada
Total confirmado: 1200 ARS
Seguimiento: https://notify-store.example.com/store/orders/11111111-1111-1111-1111-111111111111

El siguiente paso es la preparación del pedido.
```

Variables: `store.name`, `store.slug`, `order.id`, `order.totalAmount`, `order.currency`, `app.notifications.storePublicScheme`, `app.tenant.baseDomain`.

## admin_new_paid_order

Metric template: `order_paid_admin`

Subject:

```text
[Notify Store] Nueva orden pagada
```

Body:

```text
Recibiste una nueva orden pagada.

Orden: 11111111-1111-1111-1111-111111111111
Total: 1200 ARS
Estado: pagada

Revisá el panel admin de la tienda para preparar el pedido.
```

Variables: `store.name`, `order.id`, `order.totalAmount`, `order.currency`.

## buyer_order_cancelled

Metric template: `order_cancelled_buyer`

Subject:

```text
[Notify Store] Orden cancelada 11111111-1111-1111-1111-111111111111
```

Body:

```text
Tu orden fue cancelada.

Orden: 11111111-1111-1111-1111-111111111111
Estado: cancelada
Seguimiento: https://notify-store.example.com/store/orders/11111111-1111-1111-1111-111111111111

Si necesitás revisar el resumen final, podés abrir el detalle público.
```

Variables: `store.name`, `store.slug`, `order.id`, `app.notifications.storePublicScheme`, `app.tenant.baseDomain`.

## buyer_fulfillment_started

Metric template: `fulfillment_update_buyer`

Subject:

```text
[Notify Store] Empezamos a preparar tu pedido 11111111-1111-1111-1111-111111111111
```

Body:

```text
Tu pedido ya entró en preparación.

Orden: 11111111-1111-1111-1111-111111111111
Estado de entrega: iniciada
Seguimiento: https://notify-store.example.com/store/orders/11111111-1111-1111-1111-111111111111

Te vamos a avisar cuando la entrega quede completada.
```

Variables: `store.name`, `store.slug`, `order.id`, `app.notifications.storePublicScheme`, `app.tenant.baseDomain`.

## buyer_fulfillment_delivered

Metric template: `fulfillment_update_buyer`

Subject:

```text
[Notify Store] Entrega completada para tu orden 11111111-1111-1111-1111-111111111111
```

Body:

```text
La entrega de tu pedido figura como completada.

Orden: 11111111-1111-1111-1111-111111111111
Estado de entrega: entregada
Seguimiento: https://notify-store.example.com/store/orders/11111111-1111-1111-1111-111111111111

Gracias por tu compra.
```

Variables: `store.name`, `store.slug`, `order.id`, `app.notifications.storePublicScheme`, `app.tenant.baseDomain`.

## Operational Notes

- Recipients are normalized with `trim + lowercase` before delivery and idempotency.
- Delivery records use `event_id + template + normalized_recipient`.
- Metrics use low-cardinality template labels; they never include recipient, order, store or event IDs.
- Delivery is at-least-once. A process crash after SMTP accepts the message but before the delivery record is committed can lead to a duplicate on retry.
