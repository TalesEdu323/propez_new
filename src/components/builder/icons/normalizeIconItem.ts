import { DEFAULT_LIST_ICON } from './iconCatalog';

export interface IconListItem {
  text: string;
  icon?: string;
}

export function normalizeIconItem(
  item: string | IconListItem,
  fallbackIcon: string = DEFAULT_LIST_ICON,
): IconListItem {
  if (typeof item === 'string') {
    return { text: item, icon: fallbackIcon };
  }
  return {
    text: item.text ?? '',
    icon: item.icon ?? fallbackIcon,
  };
}

export function normalizeIconItems(
  items: Array<string | IconListItem> | undefined,
  fallbackIcon: string = DEFAULT_LIST_ICON,
): IconListItem[] {
  if (!items?.length) return [];
  return items.map((item) => normalizeIconItem(item, fallbackIcon));
}

export function itemDisplayText(item: string | IconListItem): string {
  return typeof item === 'string' ? item : item.text;
}
