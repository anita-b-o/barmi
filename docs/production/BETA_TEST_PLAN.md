# BETA TEST PLAN

## Objetivo

Validar con usuarios internos si Barmi se entiende y se puede usar de punta a punta en discovery, tienda, checkout simulado y administración básica.

Esta prueba no busca validar pagos reales ni carga pública. Busca encontrar fricción visible, copy confuso, pantallas rotas, problemas mobile y bloqueos antes de invitar más usuarios.

## Acceso

Staging local HTTPS validado:

- Ecosystem: `https://staging.127.0.0.1.sslip.io:8443/ecosystem`
- Store demo: `https://demo-store.staging.127.0.0.1.sslip.io:8443/public/demo-store`
- Admin: `https://admin.staging.127.0.0.1.sslip.io:8443/admin`

Usuario demo admin, sólo para testers autorizados:

- Email: `admin@example.com`
- Password: pedirla al equipo antes de la prueba

## Antes De Empezar

- Usar Chrome, Safari o Firefox actualizado.
- Probar al menos una pasada en mobile o viewport chico si es posible.
- No usar datos personales reales.
- No hacer pruebas destructivas sobre configuración si no fueron acordadas.
- Si aparece certificado self-signed en staging local, aceptar sólo para esta URL de prueba.

## Checklist Comprador

- Abrir home del ecosystem.
- Buscar productos o tiendas desde el catálogo.
- Probar una búsqueda sin resultados y revisar si se entiende cómo salir.
- Abrir el mapa.
- Entrar a una tienda desde el mapa.
- Entrar a una tienda desde catálogo/discovery.
- Agregar un producto disponible al carrito.
- Revisar carrito y checkout de tienda.
- Aplicar cupón válido: `CAFE10`.
- Aplicar cupón inválido, por ejemplo `NOEXISTE`.
- Completar email de prueba y código postal.
- Intentar crear la orden.
- Revisar pantalla de orden creada.
- Abrir detalle de orden si queda disponible.
- Enviar feedback beta desde la pantalla donde haya fricción.

## Checklist Admin

- Abrir admin.
- Hacer login.
- Revisar dashboard/backoffice.
- Revisar métricas beta.
- Revisar órdenes.
- Revisar shipping zones.
- Revisar productos.
- Cambiar entre dominio Store y Ecosystem sin quedar perdido.
- Hacer logout.

## Qué Feedback Enviar

Enviar feedback cuando:

- no se entienda qué hacer después
- el texto prometa algo que no pasa
- una pantalla quede vacía sin salida clara
- haya un botón tapado, cortado o difícil de tocar
- un loader parezca eterno
- un error muestre texto técnico
- una acción parezca haber creado una orden duplicada
- mobile se sienta roto o incómodo

Formato recomendado:

```text
Qué estaba intentando hacer:
Qué pasó:
Qué esperaba que pase:
Pantalla o URL:
Dispositivo/navegador:
¿Fue bloqueo o molestia?:
Captura adjunta:
```

## Qué No Probar Todavía

- Pagos reales con Mercado Pago.
- Webhooks externos reales.
- Carga masiva o stress test.
- Producción pública.
- Datos personales o tarjetas reales.
- Cambios administrativos destructivos sin coordinar.

## Limitaciones Conocidas

- Mercado Pago real no está habilitado ni validado en este entorno.
- El webhook externo real todavía no está validado.
- Puede haber una ventana corta de recovery si se reinicia la API.
- La beta es interna; no es producción pública.
- La búsqueda es simple; se busca detectar si los empty states ayudan, no validar ranking avanzado.
- El entorno usa certificado local/self-signed para staging HTTPS local.

## Reporte De Bugs

Prioridad alta:

- bloqueo de login
- checkout no permite crear orden con datos válidos
- orden creada no se puede revisar
- mobile con CTA principal inaccesible
- error técnico visible para usuario final
- pantallas con overflow horizontal o contenido cortado

Prioridad media:

- copy confuso
- empty state poco útil
- filtro o búsqueda difícil de entender
- loader molesto pero recuperable
- navegación que obliga a volver atrás varias veces

Prioridad baja:

- detalle visual menor
- preferencia de texto
- mejora deseable no bloqueante

## Cierre De La Prueba

Al terminar, registrar:

- testers que participaron
- dispositivos/navegadores usados
- flujos completados
- bloqueos encontrados
- feedback repetido
- decisión: seguir beta interna, corregir antes de seguir, o pausar invitaciones
