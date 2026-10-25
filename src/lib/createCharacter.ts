import { describeLook, normalizeLook, presetById, RETIRED_MODELS } from './character/catalog';
import { createAvatar, saveAvatarThumbnail } from './data';
import type { CharacterDraft } from './draft';
import { sceneFitsGender, sceneText, scenarioById } from './roleplay';
import { track } from './analytics';
import { primeAvatar } from './threads';

/** Convierte el borrador del creador en un personaje guardado en la cuenta. */
export async function createFromDraft(d: CharacterDraft) {
  const picked = scenarioById(d.scenarioId);
  // La escena propia de un personaje solo vale para ese personaje con su género (si hay texto propio, manda ese).
  const fits = !picked?.character || (picked.character === d.presetId && sceneFitsGender(picked, d.gender));
  const scenario = fits || !d.customScene.trim() ? picked : undefined;
  const name = d.name.trim();
  // Un borrador antiguo puede traer un cuerpo retirado: se migra y su captura no se usa.
  const look = normalizeLook(d.look, d.gender);
  // La forma de ser del personaje del catálogo solo vale si sigue siendo ese personaje (mismo género).
  const preset = presetById(d.presetId);
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
    preset_id: preset && preset.gender === d.gender ? preset.id : null,
    voice_id: look.voice?.id ?? null,
  });
  primeAvatar(avatar);
  track('character_created', { preset: avatar.preset_id ?? null, scene: avatar.scenario_id ?? null, custom: !scenario });
  // Foto de perfil capturada del 3D (si falla, se usa el retrato del modelo).
  if (snapshot) await saveAvatarThumbnail(avatar.id, snapshot).catch(() => undefined);
  return avatar;
}

export const isAvatarLimit = (e: unknown) => String(e instanceof Error ? e.message : (e as { message?: string })?.message ?? e).includes('AVATAR_LIMIT');
