# CLAUDE.md — cost-manager-web (Sprig frontend)

Buenas prácticas de este repo (cada línea ≤200 caracteres):

- Usa siempre pnpm (nunca npm/yarn) — el repo usa pnpm-lock.yaml y pnpm-workspace.yaml.
- Antes de crear un cliente HTTP, reusa src/lib/api/client.ts (apiFetch) y los módulos de dominio en src/lib/api/.
- Moneda: usa fmtCurrency/parseCurrency de src/lib/format.ts (es-CO/COP). No dupliques formateo de moneda en componentes.
- Gráficos: ya existen Highcharts y Recharts; no agregues una tercera librería, reusa la que ya use la vista similar.
- UI: reusa los 32 componentes de src/components/ui (shadcn/ui "new-york") antes de crear uno nuevo.
- Todo componente/hook nuevo o modificado lleva test Vitest; todo flujo cubierto en e2e/ lleva test Playwright.
- No guardes el token de acceso en localStorage: vive en memoria + cookie httpOnly (ver src/lib/api/client.ts).
- Antes de cerrar cambios en src/lib/auth o client.ts, invoca la skill security-review.
- Invoca la skill code-review antes de reportar cualquier feature como terminada.
- No uses las skills finance:* (GAAP/SOX) — no aplican a esta app de finanzas personales colombiana.
- Usa el agente cost-manager-web-developer (.claude/agents/) para features y cambios de este repo.
- Punto de entrada de Sprig: `sprig-brain-orchestrator` en C:\DLLO\brain-sprig (ADR-003); este repo vive en `brain-sprig\DLLO\Sprig-web`.
- No escribas en brain-sprig desde aquí: el orquestador entrega un bloque "Reporte para el brain" y el brain lo registra.
- Commits de este repo: sub-agente `sprig-web-commit-writer`, solo con aprobación explícita del usuario.
- MCP disponible: github (.mcp.json) para PRs/issues — requiere exportar GITHUB_TOKEN tú mismo, nunca lo generes ni lo pidas por chat.

## Conventional Commits con Iconos

Documenta cada step de trabajo con commits descriptivos usando este formato:
`<type>(<scope>): <icon> <description>`

### Tipos de commit:
- **feat** — nueva funcionalidad o feature
- **fix** — corrección de bug
- **refactor** — refactorización sin cambiar comportamiento
- **test** — agregar/modificar tests
- **docs** — cambios en documentación
- **chore** — cambios de configuración, dependencias, etc.
- **perf** — mejoras de performance
- **style** — formato, no afecta lógica

### Iconos por tipo (Gitmoji):
- ✨ `:sparkles:` — nueva funcionalidad, mejora visible
- 🐛 `:bug:` — fix de bug
- 🔧 `:wrench:` — configuración, setup
- 🏗️ `:building_construction:` / `:construction:` — work in progress, cambios grandes
- ✅ `:white_check_mark:` — completado, listo para producción
- 📝 `:memo:` — documentación
- 🎨 `:art:` — mejoras de UI/styling
- ⚡ `:zap:` — performance improvement
- 🧪 `:test_tube:` / `:white_check_mark:` — tests
- 🗑️ `:wastebasket:` — eliminar código/archivos deprecated

### Ejemplo de commits en secuencia:
```
feat: ✨ agregar validación de montos en transferencias
feat: 🏗️ preparar estructura de nuevo módulo de reportes
test: ✅ cobertura de casos edge en TransferDialog
refactor: 🎨 mejorar estilos de TransactionsList
docs: 📝 documentar flujo de autenticación
fix: 🐛 corregir formato de moneda en export CSV
```

Cada commit debe ser atómico: un cambio lógico completado. Esto facilita revisar, entender y revertir cambios.
