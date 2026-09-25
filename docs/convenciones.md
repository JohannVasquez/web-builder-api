# Convenciones de Desarrollo

Este documento establece las reglas y convenciones para escribir código en `web-builder-api`. Siendo la mayoría del código escrito por IA, es vital que sigan estas normas para mantener la coherencia a largo plazo.

## 1. Nomenclatura de Archivos y Carpetas

- **Carpetas de módulos de negocio:** `PascalCase` (Ej: `Page`, `GlobalSettings`, `Contact`).
- **Clases y Contratos (Archivos que exportan clases o abstracciones):** `PascalCase`, igual que el nombre de la clase (Ej: `PageRepository.ts`, `UpdatePageUseCase.ts`).
- **Archivos de funciones sueltas, configuración o utilidades:** `camelCase` (Ej: `pageRouter.ts`, `container.ts`, `app.ts`).

**¿Por qué?** Permite saber a simple vista, al leer el nombre del archivo, si contiene un objeto que deba ser instanciado e inyectado, o si se trata de código procedimental/configuracional.

## 2. Comentarios en el Código

En el repositorio conviven dos estilos de comentarios (`/** */` y `//`), pero **la convención oficial es usar comentarios de una línea `//`**. Al momento de escribirse esto, hay 246 archivos usando `//` frente a 75 con `/**`. Si editas código existente, déjalo con su estilo, pero para código nuevo usa `//`.

- **Mantén los comentarios al mínimo indispensable.**
- **Explica el POR QUÉ, no el QUÉ.** El código ya dice qué hace. El comentario debe explicar por qué se tomó una decisión, el contexto de un parche inesperado o advertir de un efecto secundario no obvio.

**¿Por qué?** Los agentes y los humanos pueden leer el código fácilmente para saber qué hace. El verdadero valor de un comentario es dar el contexto externo de negocio que no se puede deducir sintácticamente. Los comentarios en bloque tipo JSDoc generan verbosidad que rara vez aporta valor sobre un código TypeScript fuertemente tipado.

## 3. Imports y Rutas

Utiliza siempre el alias `@/` configurado en `tsconfig.json` para las importaciones desde otros módulos, en lugar de rutas relativas largas (`../../../`).

```typescript
// Bien
import { EnvConfig } from '@/shared/config/EnvConfig';

// Mal
import { EnvConfig } from '../../../shared/config/EnvConfig';
```

**¿Por qué?** Previene que las rutas se rompan si decides mover el archivo a otra subcapa y hace que el import sea más limpio de leer y refactorizar. Ojo: La regla de ESLint sobre dependencias de arquitectura depende explícitamente de que este alias sea resoluble.

## 4. Tests y Validación

- **Pruebas unitarias:** Van junto al archivo que prueban, con la extensión `.spec.ts` (Ej: `GetPageBySlugUseCase.spec.ts`).
- **Validación estricta (Zod):** Todos los datos que cruzan la frontera desde fuera (ej. los cuerpos de peticiones HTTP en los controladores) se validan con esquemas de Zod antes de pasarlos a `application` o `domain`.

**¿Por qué?** Mantener el test cerca del código fuente hace imposible obviar que existe al modificarlo, asegurando que ambos se mantengan sincronizados. La validación perimetral asegura que nuestro dominio nunca tenga que desconfiar de los datos que procesa.

## 5. Mensajes de Commit

Los mensajes de commit deben seguir la convención de `Conventional Commits` y son validados por Husky/commitlint.

Ejemplos:
- `feat(page): add visualStyle support for sections`
- `fix(store): ensure price is always in integer cents`
- `docs: update agent tools manual`

**¿Por qué?** Permite automatizar la creación de changelogs y le facilita a cualquier lector entender rápidamente el impacto del commit (si es un parche, una característica nueva, etc.) en el módulo indicado.
