/**
 * English Teacher AI - Audio Track Mapping Storage
 * Manages book exercise <-> audio track mappings, status transitions,
 * custom start/end time intervals, and evidence logging.
 */

import {
  AudioTrackMapping,
  ExerciseAudioEvidence,
  MappingConfirmationStatus,
  MappingSource,
} from '../types';
import { isDemoModeActive } from './storage';

const MAPPING_PREFIX = 'eta_mapping_';
const DEMO_MAPPING_PREFIX = 'eta_demo_mapping_';

function getPrefix() {
  return isDemoModeActive() ? DEMO_MAPPING_PREFIX : MAPPING_PREFIX;
}

// Seed sample mappings for demo exercises
function seedDemoMappings() {
  if (typeof localStorage === 'undefined') return;
  const prefix = DEMO_MAPPING_PREFIX;
  if (localStorage.getItem(prefix + 'seeded')) return;

  const sampleMappings: AudioTrackMapping[] = [
    {
      id: 'map_ex_2_103',
      ownerId: 'usr_demo_01',
      bookId: 'book_headway_elem_demo',
      bookEdition: '5th Edition',
      audioCollectionId: 'col_audio_headway_elem',
      unitId: 'unit_1',
      exerciseId: 'ex_2',
      pageReference: '2',
      trackLabel: '1.03',
      audioAssetId: 'aud_track_1_03',
      startSeconds: 0,
      endSeconds: 35,
      status: 'confirmed',
      mappingSource: 'exactLabel',
      confirmedBy: 'usr_demo_01',
      confirmedAt: new Date().toISOString(),
      bookContentVersion: 1,
      revision: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'map_ex_dir_323',
      ownerId: 'usr_demo_01',
      bookId: 'book_headway_elem_demo',
      bookEdition: '5th Edition',
      audioCollectionId: 'col_audio_headway_elem',
      unitId: 'unit_2',
      exerciseId: 'ex_directions_323',
      pageReference: '4',
      trackLabel: '3.23',
      audioAssetId: 'aud_track_3_23',
      startSeconds: 0,
      endSeconds: 48,
      status: 'confirmed',
      mappingSource: 'exactLabel',
      confirmedBy: 'usr_demo_01',
      confirmedAt: new Date().toISOString(),
      bookContentVersion: 1,
      revision: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  localStorage.setItem(prefix + 'mappings', JSON.stringify(sampleMappings));
  localStorage.setItem(prefix + 'seeded', 'true');
}

try {
  seedDemoMappings();
} catch (e) {
  console.warn('Could not seed demo mappings', e);
}

export function getAudioTrackMappings(bookId?: string): AudioTrackMapping[] {
  const raw = localStorage.getItem(getPrefix() + 'mappings');
  if (!raw) return [];
  try {
    const list: AudioTrackMapping[] = JSON.parse(raw);
    if (bookId) {
      return list.filter((m) => m.bookId === bookId);
    }
    return list;
  } catch {
    return [];
  }
}

export function getMappingForExercise(exerciseId: string): AudioTrackMapping | undefined {
  const all = getAudioTrackMappings();
  return all.find((m) => m.exerciseId === exerciseId);
}

export function saveAudioTrackMapping(mapping: AudioTrackMapping): void {
  const all = getAudioTrackMappings();
  const index = all.findIndex((m) => m.exerciseId === mapping.exerciseId);

  const updatedMapping: AudioTrackMapping = {
    ...mapping,
    updatedAt: new Date().toISOString(),
    revision: (mapping.revision || 1) + 1,
  };

  if (index >= 0) {
    all[index] = updatedMapping;
  } else {
    all.push(updatedMapping);
  }

  localStorage.setItem(getPrefix() + 'mappings', JSON.stringify(all));
}

export function unlinkAudioTrackMapping(exerciseId: string): void {
  const all = getAudioTrackMappings();
  const index = all.findIndex((m) => m.exerciseId === exerciseId);
  if (index >= 0) {
    // Transition to unlinked
    all[index] = {
      ...all[index],
      status: 'unlinked',
      updatedAt: new Date().toISOString(),
      revision: (all[index].revision || 1) + 1,
    };
    localStorage.setItem(getPrefix() + 'mappings', JSON.stringify(all));
  }
}

export function logExerciseAudioEvidence(evidence: ExerciseAudioEvidence): void {
  const key = getPrefix() + 'evidence';
  const raw = localStorage.getItem(key);
  const list: ExerciseAudioEvidence[] = raw ? JSON.parse(raw) : [];
  list.push(evidence);
  localStorage.setItem(key, JSON.stringify(list));
}

export function getExerciseAudioEvidence(exerciseId: string): ExerciseAudioEvidence[] {
  const key = getPrefix() + 'evidence';
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    const list: ExerciseAudioEvidence[] = JSON.parse(raw);
    return list.filter((e) => e.exerciseId === exerciseId);
  } catch {
    return [];
  }
}
