export interface OptionItem<V extends string = string> {
  label: string;
  value: V;
}

export const ALIGN_OPTIONS: OptionItem[] = [
  { label: 'Esq', value: 'left' },
  { label: 'Centro', value: 'center' },
  { label: 'Dir', value: 'right' },
];

export const ANIMATION_OPTIONS: OptionItem[] = [
  { label: 'Nenhuma', value: 'none' },
  { label: 'Fade Up', value: 'fade-up' },
  { label: 'Pulse', value: 'pulse' },
  { label: 'Bounce', value: 'bounce' },
  { label: 'Scale In', value: 'scale' },
];
