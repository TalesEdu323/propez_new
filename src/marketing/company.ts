/** Dados institucionais da matriz Taggo — fonte única para marketing. */
export const TAGGO_COMPANY = {
  brandName: 'Taggo',
  legalName: 'Taggo Software',
  tagline: 'Tecnologia para negócios',
  email: 'contato@taggo.com.br',
  phone: '(11) 91424-4166',
  phoneTel: '+5511914244166',
  address: {
    street: 'R. Topázio, 534 - Sala 07',
    neighborhood: 'Jardim Nomura',
    city: 'Cotia',
    state: 'SP',
    country: 'Brasil',
    formatted: 'R. Topázio, 534 - Sala 07, Jardim Nomura, Cotia/SP',
  },
  siteUrl: 'https://taggo.com.br',
  prosyncUrl: import.meta.env.VITE_PROSYNC_URL || 'https://prosync.tech',
  suiteName: 'Taggo Growth Suite',
  labName: 'Taggo Lab',
} as const;

export const TAGGO_SUITE_PRODUCTS = [
  { name: 'Propez — Propostas comerciais', href: '/', internal: true as const },
  { name: 'ProSync — Gestão 360°', href: TAGGO_COMPANY.prosyncUrl, internal: false as const },
  { name: 'Cronnos AI', href: 'https://cronnus.taggo.com.br/', internal: false as const },
  { name: 'Themis', href: 'https://themis.taggo.com.br/', internal: false as const },
] as const;

export const TAGGO_LAB_PRODUCTS = [
  {
    name: 'Para Infoprodutores',
    href: 'https://social.taggo.com.br/',
    subtitle: 'Sistema completo de automação',
  },
  {
    name: 'Taggo Software House',
    href: 'https://lp.taggo.com.br/',
    subtitle: 'Transforme suas ideias em realidade',
  },
  {
    name: 'Para Advogados',
    href: 'https://adv.taggo.com.br/',
    subtitle: 'Sites profissionais para escritórios',
  },
] as const;
