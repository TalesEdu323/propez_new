export type IconCategory = 'status' | 'business' | 'communication' | 'media' | 'people' | 'objects';

export interface BuilderIconEntry {
  id: string;
  label: string;
  category: IconCategory;
  keywords: string[];
}

export const ICON_CATEGORY_LABELS: Record<IconCategory, string> = {
  status: 'Status',
  business: 'Negócios',
  communication: 'Comunicação',
  media: 'Mídia',
  people: 'Pessoas',
  objects: 'Objetos',
};

export const BUILDER_ICON_CATALOG: BuilderIconEntry[] = [
  { id: 'CheckCircle2', label: 'Check', category: 'status', keywords: ['ok', 'sim', 'confirmar'] },
  { id: 'XCircle', label: 'Fechar', category: 'status', keywords: ['nao', 'erro', 'x'] },
  { id: 'AlertCircle', label: 'Alerta', category: 'status', keywords: ['aviso', 'atencao'] },
  { id: 'Info', label: 'Info', category: 'status', keywords: ['informacao'] },
  { id: 'HelpCircle', label: 'Ajuda', category: 'status', keywords: ['duvida'] },
  { id: 'Minus', label: 'Menos', category: 'status', keywords: ['remover'] },
  { id: 'Plus', label: 'Mais', category: 'status', keywords: ['adicionar'] },
  { id: 'Circle', label: 'Círculo', category: 'status', keywords: [] },
  { id: 'DollarSign', label: 'Dinheiro', category: 'business', keywords: ['preco', 'valor', 'pagamento'] },
  { id: 'TrendingUp', label: 'Crescimento', category: 'business', keywords: ['subir', 'grafico'] },
  { id: 'TrendingDown', label: 'Queda', category: 'business', keywords: ['descer'] },
  { id: 'BarChart3', label: 'Gráfico', category: 'business', keywords: ['estatistica'] },
  { id: 'PieChart', label: 'Pizza', category: 'business', keywords: ['grafico'] },
  { id: 'Target', label: 'Meta', category: 'business', keywords: ['objetivo', 'foco'] },
  { id: 'Briefcase', label: 'Maleta', category: 'business', keywords: ['trabalho', 'empresa'] },
  { id: 'Building2', label: 'Empresa', category: 'business', keywords: ['predio', 'escritorio'] },
  { id: 'CreditCard', label: 'Cartão', category: 'business', keywords: ['pagamento'] },
  { id: 'Wallet', label: 'Carteira', category: 'business', keywords: ['financeiro'] },
  { id: 'Receipt', label: 'Recibo', category: 'business', keywords: ['nota', 'fatura'] },
  { id: 'MessageCircle', label: 'Mensagem', category: 'communication', keywords: ['chat', 'whatsapp'] },
  { id: 'Mail', label: 'E-mail', category: 'communication', keywords: ['correio'] },
  { id: 'Phone', label: 'Telefone', category: 'communication', keywords: ['ligar', 'contato'] },
  { id: 'Send', label: 'Enviar', category: 'communication', keywords: ['enviar'] },
  { id: 'Bell', label: 'Notificação', category: 'communication', keywords: ['alerta', 'sino'] },
  { id: 'Mic', label: 'Microfone', category: 'communication', keywords: ['audio'] },
  { id: 'Video', label: 'Vídeo chamada', category: 'communication', keywords: ['camera'] },
  { id: 'Image', label: 'Imagem', category: 'media', keywords: ['foto', 'picture'] },
  { id: 'PlayCircle', label: 'Play', category: 'media', keywords: ['video', 'reproduzir'] },
  { id: 'Youtube', label: 'YouTube', category: 'media', keywords: ['video'] },
  { id: 'Camera', label: 'Câmera', category: 'media', keywords: ['foto'] },
  { id: 'Music', label: 'Música', category: 'media', keywords: ['audio'] },
  { id: 'FileText', label: 'Documento', category: 'media', keywords: ['arquivo', 'pdf'] },
  { id: 'User', label: 'Usuário', category: 'people', keywords: ['pessoa', 'perfil'] },
  { id: 'Users', label: 'Equipe', category: 'people', keywords: ['grupo', 'time'] },
  { id: 'UserCheck', label: 'Usuário OK', category: 'people', keywords: ['aprovado'] },
  { id: 'Heart', label: 'Coração', category: 'people', keywords: ['amor', 'favorito'] },
  { id: 'Star', label: 'Estrela', category: 'people', keywords: ['avaliacao', 'rating'] },
  { id: 'Award', label: 'Prêmio', category: 'people', keywords: ['trofeu', 'medalha'] },
  { id: 'ThumbsUp', label: 'Like', category: 'people', keywords: ['positivo'] },
  { id: 'Zap', label: 'Raio', category: 'objects', keywords: ['rapido', 'energia'] },
  { id: 'Sparkles', label: 'Brilho', category: 'objects', keywords: ['destaque', 'magia'] },
  { id: 'Shield', label: 'Escudo', category: 'objects', keywords: ['seguranca', 'protecao'] },
  { id: 'Lock', label: 'Cadeado', category: 'objects', keywords: ['seguro', 'privado'] },
  { id: 'Unlock', label: 'Aberto', category: 'objects', keywords: ['desbloquear'] },
  { id: 'Globe', label: 'Globo', category: 'objects', keywords: ['web', 'mundo', 'site'] },
  { id: 'MapPin', label: 'Local', category: 'objects', keywords: ['mapa', 'endereco'] },
  { id: 'Clock', label: 'Relógio', category: 'objects', keywords: ['tempo', 'prazo'] },
  { id: 'Calendar', label: 'Calendário', category: 'objects', keywords: ['data', 'agenda'] },
  { id: 'Package', label: 'Pacote', category: 'objects', keywords: ['entrega', 'produto'] },
  { id: 'Truck', label: 'Entrega', category: 'objects', keywords: ['frete', 'logistica'] },
  { id: 'Rocket', label: 'Foguete', category: 'objects', keywords: ['lancamento', 'startup'] },
  { id: 'Lightbulb', label: 'Ideia', category: 'objects', keywords: ['lampada', 'inovacao'] },
  { id: 'Settings', label: 'Config', category: 'objects', keywords: ['engrenagem', 'ajustes'] },
  { id: 'Wrench', label: 'Ferramenta', category: 'objects', keywords: ['suporte', 'manutencao'] },
  { id: 'Palette', label: 'Design', category: 'objects', keywords: ['cor', 'criativo'] },
  { id: 'Layers', label: 'Camadas', category: 'objects', keywords: ['layout'] },
  { id: 'Layout', label: 'Layout', category: 'objects', keywords: ['estrutura'] },
  { id: 'Quote', label: 'Citação', category: 'communication', keywords: ['depoimento', 'aspas'] },
  { id: 'ListChecks', label: 'Lista OK', category: 'status', keywords: ['checklist', 'tarefas'] },
  { id: 'CircleHelp', label: 'Dúvida', category: 'status', keywords: ['help', 'fallback'] },
];

export const DEFAULT_LIST_ICON = 'CheckCircle2';

export function findIconEntry(id: string): BuilderIconEntry | undefined {
  return BUILDER_ICON_CATALOG.find((e) => e.id === id);
}
