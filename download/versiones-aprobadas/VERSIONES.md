# VERSIONES APROBADAS — RutaGo

## Control de versiones aprobadas por el cliente

---

### v3.0 — Arqueo Offline + Tarifas Oficiales
- **Fecha**: 2026-08-12
- **Commit**: `2d638f6`
- **Ubicacion**: `rutago-v3.0-arqueo-offline-20260812/`
- **Features**:
  - Venta offline de boletos (IndexedDB)
  - Tarifas oficiales NORMAL/MEDIA completas (5 rutas)
  - Flujo secuencial: Vender → Arqueo → Siguiente Frecuencia
  - Arqueo de caja: efectivo contado vs sistema (cuadrada/sobrante/faltante)
  - Persistencia de estados de frecuencia en IndexedDB
  - Sincronización al llegar a destino (con internet)
  - UI una mano para celular
  - Botón Arqueo visible al volver de vender
  - Turno completado al arqueo de última frecuencia
  - Bloqueo secuencial: no se salta frecuencias
