import { describeLook, normalizeLook, RETIRED_MODELS } from './character/catalog';
import { createAvatar, saveAvatarThumbnail } from './data';
import type { CharacterDraft } from './draft';
import { sceneText, scenarioById } from './roleplay';

/** Convierte el borrador del creador en un personaje guardado en la cuenta. */
export async function createFromDraft(d: CharacterDraft) {
  const scenario = scenarioById(d.scenarioId);
  const name = d.name.trim();
  // Un borrador antiguo puede traer un cuerpo retirado: se migra y su captura no se usa.
  const look = normalizeLook(d.look, d.gender);
  const snapshot = d.look?.model && RETIRED_MODELS[d.look.model] ? null : d.snapshot;
  const avatar = await createAvatar({
    name,
    gender: d.gender,
    age: d.age,
    appearance: look,
    appearance_description: describeLook(look, 'es'),
    situation_description: scenario ? sceneText(scenario.setup.es, name, d.gender) : d.customScene.trim(),
    traits: d.traits,
    scenario_id: scenario ? scenario.id : null,
    voice_id: look.voice?.id ?? null,
  });
  // Foto de perfil capturada del 3D (si falla, se usa el retrato del modelo).
  if (snapshot) await saveAvatarThumbnail(avatar.id, snapshot).catch(() => undefined);
  return avatar;
}

export const isAvatarLimit = (e: unknown) => String(e instanceof Error ? e.message : (e as { message?: string })?.message ?? e).includes('AVATAR_LIMIT');
