import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Heart,
  TrendingUp,
  Package,
  Building2,
  CreditCard,
  Users,
  Wrench,
  LayoutTemplate,
  Inbox,
  BookOpen,
} from 'lucide-react';
import type { AppRoute } from '../../types/navigation';

export interface AdminNavItem {
  id: AppRoute;
  label: string;
  subtitle?: string;
  icon: LucideIcon;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    id: 'admin-dashboard',
    label: 'Command Center',
    subtitle: 'Receita, retenção e alertas em tempo real.',
    icon: LayoutDashboard,
  },
  {
    id: 'admin-retention',
    label: 'Retenção',
    icon: Heart,
  },
  {
    id: 'admin-acquisition',
    label: 'Aquisição',
    icon: TrendingUp,
  },
  {
    id: 'admin-product',
    label: 'Produto',
    icon: Package,
  },
  {
    id: 'admin-organizations',
    label: 'Organizações',
    icon: Building2,
  },
  {
    id: 'admin-subscriptions',
    label: 'Assinaturas',
    icon: CreditCard,
  },
  {
    id: 'admin-users',
    label: 'Usuários',
    icon: Users,
  },
  {
    id: 'admin-operations',
    label: 'Operações',
    icon: Wrench,
  },
  {
    id: 'admin-requests',
    label: 'Solicitações',
    icon: Inbox,
  },
  {
    id: 'admin-marketplace',
    label: 'Templates',
    icon: LayoutTemplate,
  },
  {
    id: 'admin-blog',
    label: 'Blog',
    icon: BookOpen,
  },
];

/** Rota admin-* → item ativo na sidebar (ex.: detalhe de org). */
export function resolveAdminNavActive(route: AppRoute): AppRoute {
  if (route === 'admin-organization-detail') return 'admin-organizations';
  if (route === 'admin-blog-editor') return 'admin-blog';
  return route;
}
