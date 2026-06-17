# Storefront UX Audit

## Problemas encontrados

- La cabecera publica priorizaba la marca Barmi con "Barmi Store", "STORE publico" y badges tecnicos como "Storefront publico" y "Carrito separado del ecosystem".
- La home de tienda explicaba conceptos internos: "Store storefront", "Flujo publico Barmi", "ecosystem", "store", "discovery" y carrito separado.
- La navegacion publica mezclaba secciones de catalogo con acciones operativas como checkout y ordenes, sin adaptarse al tipo de tienda.
- Los breadcrumbs usaban "Store" como etiqueta visible en catalogo, detalle, checkout y ordenes.
- Empty states de catalogo apagado o sin productos sonaban a configuracion interna o a error.
- La pantalla de checkout publico todavia exponia "Navegacion cruzada", "ecosystem" y separacion tecnica de carritos.

## Cambios aplicados

- La cabecera publica ahora muestra el nombre de la tienda, una descripcion publica cuando corresponde y badges orientados al visitante.
- Se elimino el branding dominante de Barmi del layout publico visible.
- La navegacion publica ahora se arma con capabilities existentes:
  - tiendas con `PRODUCTS`: Inicio, Productos, Contacto.
  - tiendas sin `PRODUCTS`: Inicio, Sobre nosotros, Contacto cuando esas secciones existen.
- Se reemplazo copy tecnico por lenguaje de visitante: compra en curso, finalizar compra, ver otras tiendas, informacion y contacto.
- Los empty states publicos se reescribieron para que parezcan estados normales de una tienda en preparacion.
- Los breadcrumbs visibles ahora usan el nombre de tienda o etiquetas humanas como Tienda, Productos, Informacion y Finalizar compra.
- Se mantuvieron intactos backend, APIs, checkout logic, pagos, analytics, readiness, SEO, JSON-LD y sitemap.

## Problemas pendientes

- Las pantallas publicas de ordenes aun conservan algunos terminos historicos como "orden" por compatibilidad con el dominio actual.
- La cabecera puede mostrar una descripcion generica si la tienda no tiene perfil publico o la capability `ABOUT` esta desactivada.
- La UI sigue usando componentes visuales compartidos con ecosystem internamente; no se cambio su API ni nomenclatura tecnica en codigo.

## Recomendaciones futuras

- Definir un modelo explicito de tipo de tienda para distinguir ecommerce, servicios y portfolio sin inferencias desde capabilities.
- Agregar una seccion de footer discreta "Creado con Barmi" si se decide mostrar la plataforma como apoyo, no como marca protagonista.
- Revisar copy de pedidos/ordenes publicas con usuarios no tecnicos para decidir una terminologia unica.
- Evaluar branding configurable por tienda en un PR separado: logo, colores y portada, manteniendo defaults seguros.
