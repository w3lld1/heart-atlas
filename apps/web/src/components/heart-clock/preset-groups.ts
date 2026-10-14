/** Groups of the state list when a monitor offers many states (the heart clock page, embeds). */
export const presetGroups = ['rhythm', 'conduction', 'structure', 'treated'] as const;
export type PresetGroup = (typeof presetGroups)[number];
// The group of each preset is `presetGroup` in choices.ts: a new preset must be placed there.

/** A monitor with more states than this shows them as a grouped list instead of a switch. */
export const maxSwitchChoices = 6;
