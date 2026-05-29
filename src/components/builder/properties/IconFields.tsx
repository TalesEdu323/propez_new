import type { FieldProps } from './TextFields';
import { IconPickerField } from './IconPickerField';
import { DEFAULT_LIST_ICON } from '../icons/iconCatalog';

export function IconFields({ element, updateElement }: FieldProps) {
  const { type, props, id } = element;

  if (type === 'icon_list' || type === 'pricing' || type === 'marketing_pricing') {
    return (
      <div>
        <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
          Ícone padrão da lista
        </label>
        <IconPickerField
          value={(props.listIcon as string) ?? DEFAULT_LIST_ICON}
          onChange={(iconId) => updateElement(id, { listIcon: iconId })}
        />
      </div>
    );
  }

  if (type === 'whatsapp_button') {
    return (
      <div>
        <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
          Ícone do botão
        </label>
        <IconPickerField
          value={(props.icon as string) ?? 'MessageCircle'}
          onChange={(iconId) => updateElement(id, { icon: iconId })}
        />
      </div>
    );
  }

  if (type === 'testimonial') {
    return (
      <div>
        <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
          Ícone da citação
        </label>
        <IconPickerField
          value={(props.quoteIcon as string) ?? 'Quote'}
          onChange={(iconId) => updateElement(id, { quoteIcon: iconId })}
        />
      </div>
    );
  }

  if (type === 'comparison_table') {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            Ícone &quot;sim&quot;
          </label>
          <IconPickerField
            value={(props.yesIcon as string) ?? 'CheckCircle2'}
            onChange={(iconId) => updateElement(id, { yesIcon: iconId })}
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            Ícone &quot;não&quot;
          </label>
          <IconPickerField
            value={(props.noIcon as string) ?? 'Minus'}
            onChange={(iconId) => updateElement(id, { noIcon: iconId })}
          />
        </div>
      </div>
    );
  }

  return null;
}
