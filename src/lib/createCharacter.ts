import { describeLook } from './character/catalog';
import { createAvatar, saveAvatarThumbnail } from './data';
import type { CharacterDraft } from './draft';
import { fillName, scenarioById } from './roleplay';

/** Convierte el borrador del creador en un personaje guardado en la cuenta. */
export async function createFromDraft(d: CharacterDraft) {
  const scenario = scenarioById(d.scenarioId);
  const name = d.name.trim();
  const avatar = await createAvatar({
    name,
    gender: d.gender,
    age: d.age,
    appearance: d.look,
    appearance_description: describeLook(d.look, 'es'),
    situation_description: scenario ? fillName(scenario.setup.es, name) : d.customScene.trim(),
    traits: d.traits,
    scenario_id: scenario ? scenario.id : null,
    voice_id: d.look.voice?.id ?? null,
  });
  // Foto de perfil capturada del 3D (si falla, se usa el retrato del modelo).
  if (d.snapshot) await saveAvatarThumbnail(avatar.id, d.snapshot).catch(() => undefined);
  return avatar;
}

export const isAvatarLimit = (e: unknown) => String(e instanceof Error ? e.message : (e as { message?: string })?.message ?? e).includes('AVATAR_LIMIT');
