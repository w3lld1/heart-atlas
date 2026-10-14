import {
  createHeartClock,
  presetIds,
  presetParams,
  presetRateLimits,
  switchedHeartRate,
} from '@heart-atlas/heart-clock';
import { describe, expect, it } from 'vitest';
import { clockChoices } from '../src/components/heart-clock/choices.ts';
import { clamp, switchedRate } from '../src/components/heart-clock/clock-choice.ts';
import { embedSettings } from '../src/components/heart-clock/embed-settings.ts';
import { playerClock, playerHeartRate } from '../src/components/heart-sounds/player-clock.ts';

// Presets resolved in the build for the monitor island (#425).
describe('clockChoices', () => {
  const all = clockChoices(presetIds);

  it('offers every preset with its own parameters and limits', () => {
    expect(all.map((choice) => choice.id)).toEqual([...presetIds]);
    for (const choice of all) {
      expect(choice.params, choice.id).toEqual(presetParams(choice.id));
      expect(choice.limits, choice.id).toEqual(presetRateLimits(choice.id, choice.params));
    }
  });

  it('gives a caller rate to the starting preset, not to a later one that sets its own', () => {
    const choices = clockChoices(['normal', 'supraventricular-tachycardia'], 'normal', {
      heartRate: 90,
    });
    expect(choices.map((choice) => choice.params.heartRate)).toEqual([
      90,
      presetParams('supraventricular-tachycardia').heartRate,
    ]);
  });

  it('switches the heart rate the way the clock package does', () => {
    for (const from of all) {
      for (const to of all) {
        for (const rate of [40, 75, 160]) {
          expect(switchedRate(from, to, rate), `${from.id} -> ${to.id} at ${rate}`).toBe(
            clamp(switchedHeartRate(from.id, to.id, rate, to.params.heartRate), to.limits),
          );
        }
      }
    }
  });
});

describe('embedSettings', () => {
  it('sets nothing without settings', () => {
    expect(embedSettings('')).toBeUndefined();
    expect(embedSettings('?rate=abc&other=1')).toBeUndefined();
  });

  it('starts the asked preset at the asked rate', () => {
    const settings = embedSettings('?preset=atrial-fibrillation&rate=90');
    expect(settings?.preset).toBe('atrial-fibrillation');
    const start = settings?.choices.find((choice) => choice.id === 'atrial-fibrillation');
    expect(start?.params.heartRate).toBe(90);
  });

  it('starts on normal at a rate given alone', () => {
    const settings = embedSettings('?rate=90');
    expect(settings?.preset).toBeUndefined();
    expect(settings?.choices[0]?.id).toBe('normal');
    expect(settings?.choices[0]?.params.heartRate).toBe(90);
  });

  it('drops the rate of a preset without a pulse', () => {
    const settings = embedSettings('?preset=ventricular-fibrillation&rate=90');
    expect(settings?.preset).toBe('ventricular-fibrillation');
    expect(settings?.rate).toBeUndefined();
  });
});

describe('playerClock', () => {
  it('is the normal preset at the player rate', () => {
    expect(playerClock().params).toEqual(
      createHeartClock({ ...presetParams('normal'), heartRate: playerHeartRate }).params,
    );
  });
});
