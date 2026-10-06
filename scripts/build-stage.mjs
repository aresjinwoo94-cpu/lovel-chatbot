/**
 * Empaqueta avatar-stage/stage.html como string en src/lib/avatarStageHtml.ts
 * para que la app lo cargue en un WebView (móvil) o un iframe (web).
 * Uso: node scripts/build-stage.mjs   (ejecútalo tras editar stage.html)
 */
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('avatar-stage/stage.html', 'utf8');
const escaped = html.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
writeFileSync(
  'src/lib/avatarStageHtml.ts',
  `// ARCHIVO GENERADO por scripts/build-stage.mjs a partir de avatar-stage/stage.html. No editar a mano.\nexport const AVATAR_STAGE_HTML = \`${escaped}\`;\n`,
);
console.log('src/lib/avatarStageHtml.ts actualizado');
