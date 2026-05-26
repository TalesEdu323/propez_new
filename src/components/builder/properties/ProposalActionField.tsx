import type { FieldProps } from './TextFields';

const CTA_TYPES = new Set(['button', 'marketing_cta', 'pricing', 'card']);

export function ProposalActionField({ element, updateElement }: FieldProps) {
  if (!CTA_TYPES.has(element.type)) return null;
  const value = (element.props.proposalAction as string) ?? 'approve';

  return (
    <div>
      <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
        Ação da proposta
      </label>
      <select
        value={value}
        onChange={(e) => updateElement(element.id, { proposalAction: e.target.value })}
        className="glass-input"
      >
        <option value="approve">Aprovar proposta</option>
        <option value="none">Nenhuma (decorativo)</option>
      </select>
    </div>
  );
}
