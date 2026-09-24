# RutaGo - Contexto Maestro y Bitácora de Desarrollo v3.60.10

**Fecha:** Septiembre 2026  
**Versión Activa:** `v3.60.10-handover-audit`  
**Flota Piloto Oficial:** Unidad 01 (Disco 01, Hino AK, Placa TAA-5152)  
**Propietario Líder:** José Leonardo Jaya Jaramillo  
**Ruta Operativa:** Loja – Vilcabamba – Malacatos – Yangana – La Elvira  
**Repositorio GitHub:** `https://github.com/jljjdesarrollo-maker/rutago`  
**Deploy en Producción:** Vercel (CI/CD automático desde rama `main`)  

---

## 🧭 GUÍA DE TRASPASO RÁPIDO PARA NUEVA CUENTA / SESIÓN DE GOOGLE STUDIO
Si estás abriendo este proyecto desde una nueva cuenta de Google Studio o una nueva ventana:
1. **Acceso al repositorio:**
   ```bash
   git clone https://[TOKEN_PERSONAL_DE_ACCESO]@github.com/jljjdesarrollo-maker/rutago.git /app/applet
   ```
2. **Seguridad del Token:**
   - Nunca almacenar de forma permanente el PAT en archivos de configuración ni en `.git/config`.
   - Limpiar el remote con: `git remote set-url origin https://github.com/jljjdesarrollo-maker/rutago.git`.
3. **Estado Global del Proyecto:**
   - **PENDIENTE CRÍTICO #1 (Device Binding):** ✅ COMPLETADO v3.60.9 (Commit `3f6bc29`).
   - **PENDIENTE #2 (Escalabilidad 19 Buses):** ✅ FASES 1 a 13 COMPLETADAS.
   - **PENDIENTE #3 (Reasignación Boletos Huérfanos):** ✅ COMPLETADO v3.60.8 (Commit `71b1fb0`).
   - **PENDIENTE #4 (Módulo Institucional Gerencia de Cooperativa):** ⏳ En reserva para fase futura institucional.
   - **PENDIENTE #5 (Depuración y Anti-Bucles Interfaz Socio):** ✅ COMPLETADO v3.56.0.
   - **PENDIENTE #6 (Catálogo Maestro Hino AK):** ✅ COMPLETADO v3.58.5 / v3.59.4.
   - **PENDIENTE #7 (Estaciones de Taller y Combos de Parada):** ✅ FASES 1, 2, 3 y 4 COMPLETADAS al 100%.

---

## 🔍 AUDITORÍA DETALLADA: PENDIENTE #7 — FASE 4 (Asentamiento Automático en Libro de Gastos y Deudas del Socio)
### 📌 Estado Verificado: ✅ TOTALMENTE IMPLEMENTADO (Retirado de Pendientes)

1. **Historial de Commits:**
   - `2b68fe2 feat(mantenimiento): Fase 4 - Asentamiento contable automatico, cartera de deudas con talleres y gestion de abonos (v3.59.6)`
   - `d69e775 feat(mantenimiento): v3.59.6 - combo lubricadora rapida con pagador bifurcado y badge ruta chofer en deudas`
   - `42a5f7f feat(mantenimiento): v3.59.8 - fase B anulacion y eliminacion en cascada de mantenimientos y limpieza de pruebas`
   - `v3.60.3` a `v3.60.5`: Regularización retroactiva con odómetro histórico sin alterar tacómetro ni caja de ayudante.

2. **Verificación en Código Fuente:**
   - **Modalidad Socio Transfiere Todo (`TRANSFERENCIA_TOTAL`):** En `ChoferMantenimientoWidget.tsx` y `MantenimientoScreen.tsx`: `paidAmount = valorTotal, pendingBalance = 0, expenseStatus = 'PAGADO'`, sello verde.
   - **Modalidad Socio Transfiere una Parte (`TRANSFERENCIA_PARCIAL`):** `paidAmount = abonoNum, pendingBalance = saldoRestante, expenseStatus = 'PENDIENTE'`, sello ámbar en Cartera de Deudas.
   - **Modalidad Socio Saca Fiado (`CREDITO_FIADO`):** `paidAmount = 0, pendingBalance = valorTotal, expenseStatus = 'PENDIENTE'`, sello rojo en Cartera de Deudas.
   - **Gestión de Abonos en Cartera:** En `MantenimientoScreen.tsx` existe el widget reactivo de Cartera de Deudas con Talleres, desglose de pendientes, reporte en PDF, botón "Libro Gastos" y botón "Registrar Abono" que amortiza el saldo y sincroniza con `updateParadaPagoAbono`.
   - **Anulación en Cascada:** `deleteParadaPagoCascada` erradica paradas y su gasto contable derivado tanto localmente como en la nube.

---

## 🛠️ IMPLEMENTACIÓN EJECUTADA: Auto-Curación y Reconciliación Silenciosa (Self-Healing Odometers) v3.60.10
- **Commit Local:** `3e399c5 feat(mantenimiento): v3.60.10 - reconciliacion silenciosa (self-healing) de odometros historicos y aire acondicionado`
- **Problema Corregido:** Falsa alerta roja (Vencido > 800%) en el Mantenimiento Preventivo Anual de Aire Acondicionado y otros componentes debido a `ultimoKm: 0` desfasado respecto al odómetro acumulado del bus (~893.485 km).
- **Archivos Modificados:**
  * `src/lib/mantenimiento-catalogo.ts`: Exportación de la interfaz `MantenimientoBusItem`.
  * `src/lib/mantenimiento-estaciones.ts`: Adición de `MNT-AIRE-ACONDICIONADO` a la estación `ADMISION_AIRE` (110.000 km) y creación del motor `reconciliarMantenimientosConHistorial`.
  * `src/components/transport/SocioMantenimientoWidget.tsx`: Auto-curación de odómetros y conciliación reactiva con historial.
  * `src/components/transport/MantenimientoScreen.tsx`: Actualización de calibradores y auto-curación silenciosa.
  * `src/lib/mantenimiento-sync.ts`: Ejecución de reconciliación automática tras descarga bidireccional de gastos.

---

## 📋 TAREAS PENDIENTES EN EL ROADMAP
1. **Verificación en Ambiente Móvil Real:** Comprobar la respuesta visual de la alerta de bloqueo 403 al simular cambio de terminal con el switch activado (`deviceBlocked: true` en `LoginScreen.tsx`).
2. **Auditoría de Transacciones Offline en Ruta:** Asegurar que si el ayudante autenticado pierde cobertura en carretera, la sesión cacheada local mantenga la emisión normal de boletos y el arqueo se sincronice al recuperar señal.
3. **Módulo Institucional de Gerencia de Cooperativa & Informes de Interés Común (Pendiente #4):** Habilitación cuando la asamblea o directiva de la cooperativa inicie la adopción global de la plataforma.
