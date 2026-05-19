# Backup And Recovery

## Objetivo

Procedimiento mínimo y repetible para:

- generar backup real de PostgreSQL
- restaurarlo sobre una base limpia
- validar recuperación operativa básica

No cubre HA ni disaster recovery enterprise. Está pensado para Barmi en modo startup-stage.

## Scripts

- backup: `scripts/backup-postgres.sh`
- restore: `scripts/restore-postgres.sh`

Defaults:

- compose: `docker-compose.staging.yml`
- service: `postgres`
- output de backups: `backups/postgres/`

Variables requeridas:

- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`

Variables útiles:

- `COMPOSE_FILE`
- `POSTGRES_SERVICE`
- `BACKUP_DIR`
- `TARGET_DB_NAME`
- `APP_VERSION`
- `APP_COMMIT_SHA`

## Frecuencia sugerida

- staging técnico: antes de cambios de datos manuales relevantes y antes de validar restores
- beta pública controlada: al menos 1 backup diario
- siempre generar backup adicional antes de deploys que incluyan migraciones o cambios de datos sensibles

## Retention básica

- conservar los últimos 7 backups diarios
- conservar el último backup previo a cada release candidata
- no commitear dumps al repo

## Backup

Ejemplo:

```bash
bash ./scripts/backup-postgres.sh
```

Salida esperada:

- dump `.dump` versionado
- archivo `.meta` con timestamp, DB, version, commit y checksum

## Restore

Ejemplo:

```bash
TARGET_DB_NAME=barmi_restore_20260517 \
bash ./scripts/restore-postgres.sh /abs/path/to/backup.dump
```

El script:

- copia el dump al contenedor PostgreSQL
- mata conexiones activas a la DB target
- recrea la DB desde `template0`
- ejecuta `pg_restore`

## Restore flow recomendado

1. Levantar staging o el stack operativo equivalente.
2. Tomar backup actual.
3. Restaurar sobre una DB limpia `*_restore`.
4. Validar tablas, constraints y datos demo/esperados.
5. Arrancar la app apuntando a esa DB restaurada.
6. Correr smoke post-deploy o smoke staging.

## Recovery checklist

1. Confirmar cuál fue el último backup sano y su checksum.
2. Identificar release/backend/frontend que debe acompañar ese backup.
3. Restaurar sobre DB limpia.
4. Arrancar backend apuntando a la DB restaurada.
5. Validar `readiness`.
6. Correr `scripts/smoke-post-deploy.sh`.
7. Recién después reabrir tráfico normal.

## Tiempos esperados

Para el dataset actual de staging/demo:

- backup: menos de 1 minuto
- restore: menos de 2 minutos
- app startup + smoke básico: 1 a 3 minutos

En producción controlada estos tiempos suben con el volumen real; medirlos de nuevo cuando haya datos de usuarios.
