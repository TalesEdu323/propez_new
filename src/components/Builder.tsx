import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Type, Image as ImageIcon, MousePointerClick, AlignLeft, 
  Trash2, ArrowUp, ArrowDown, Settings, Plus, LayoutTemplate,
  Minus, Maximize2, Youtube, Layout, BarChart, List, Sparkles,
  ChevronDown, PlayCircle, Filter, ListChecks, DollarSign, 
  MessageSquareQuote, GitCommit, CheckCircle2, Quote,
  Navigation, GalleryHorizontal, Grid3X3, Columns, Menu,
  Eye, EyeOff, Download, Upload, Trash, Layers, Box,
  Timer, MessageCircle, FolderOpen, Activity, Star, MapPin, Table, Images, Bell, Save, ChevronLeft,
  AlertCircle, ArrowRight
} from 'lucide-react';

// --- Types & Default Configurations ---
export type ElementType = 
  | 'heading' | 'paragraph' | 'button' | 'image' 
  | 'divider' | 'spacer' | 'video' | 'card' 
  | 'stats' | 'accordion' | 'animated_text'
  | 'funnel' | 'icon_list' | 'pricing' | 'testimonial' | 'timeline'
  | 'navbar' | 'slider' | 'feature_grid' | 'gallery' | 'grid' | 'container' | 'column'
  | 'countdown' | 'whatsapp_button' | 'tabs' | 'progress_bar' | 'star_rating'
  | 'google_map' | 'comparison_table' | 'image_carousel' | 'toast_notification'
  | 'marketing_hero' | 'marketing_context' | 'marketing_strategy' | 'marketing_services' | 'marketing_pricing' | 'marketing_cta';

export interface ElementData {
  id: string;
  type: ElementType;
  props: Record<string, any>;
  children?: ElementData[];
}

const DEFAULT_PROPS: Record<ElementType, Record<string, any>> = {
  heading: { text: 'Novo Título', color: '#18181b', align: 'left', size: 'text-4xl', weight: 'font-bold' },
  paragraph: { text: 'Digite seu texto aqui. Você pode editar as propriedades na barra lateral.', color: '#52525b', align: 'left', size: 'text-base' },
  button: { text: 'Clique Aqui', bgColor: '#dc2626', textColor: '#ffffff', align: 'center', radius: 'rounded-md', animation: 'none' },
  image: { url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop', alt: 'Imagem', width: '100%', radius: 'rounded-xl', shadow: 'shadow-none' },
  divider: { color: '#e5e7eb', thickness: '2', style: 'solid' },
  spacer: { height: '64' },
  video: { url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', radius: 'rounded-xl', shadow: 'shadow-lg' },
  card: { title: 'Título do Cartão', description: 'Uma breve descrição sobre o benefício ou recurso.', imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop', buttonText: 'Saiba Mais', bgColor: '#ffffff', radius: 'rounded-2xl', shadow: 'shadow-xl' },
  stats: { value: '100', label: 'Clientes Satisfeitos', suffix: '%', color: '#dc2626' },
  accordion: { title: 'Como funciona o serviço?', content: 'Nós oferecemos uma solução completa de ponta a ponta para o seu negócio crescer de forma escalável e previsível.', bgColor: '#ffffff' },
  animated_text: { text: 'Texto com Animação', animation: 'fade-up', color: '#dc2626', size: 'text-5xl', align: 'center', weight: 'font-extrabold' },
  funnel: { 
    stages: [
      { name: 'Visitantes', value: '10.000' },
      { name: 'Leads', value: '500' },
      { name: 'Oportunidades', value: '150' },
      { name: 'Vendas', value: '50' }
    ],
    color: '#dc2626'
  },
  icon_list: {
    items: ['Design Responsivo e Moderno', 'Otimizado para SEO e Conversão', 'Integração com CRM e Automação'],
    iconColor: '#10b981',
    textColor: '#52525b'
  },
  pricing: {
    title: 'Plano Profissional',
    price: 'R$ 997',
    period: '/mês',
    items: ['Acesso Completo à Plataforma', 'Suporte Prioritário 24/7', 'Atualizações Gratuitas', 'Consultoria Mensal'],
    buttonText: 'Assinar Agora',
    buttonColor: '#18181b',
    bgColor: '#ffffff'
  },
  testimonial: {
    quote: 'Esta ferramenta mudou completamente a forma como criamos páginas. É incrivelmente rápida, intuitiva e os resultados são fantásticos.',
    author: 'Maria Silva',
    role: 'Diretora de Marketing',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
    bgColor: '#f8fafc'
  },
  timeline: {
    steps: [
      { title: 'Passo 1: Planejamento', desc: 'Definição de metas, público-alvo e estratégia de comunicação.' },
      { title: 'Passo 2: Execução', desc: 'Criação das campanhas, landing pages e automações.' },
      { title: 'Passo 3: Escala', desc: 'Otimização contínua, testes A/B e aumento de verba.' }
    ],
    color: '#3b82f6'
  },
  navbar: {
    logoText: 'Minha Marca',
    links: ['Início', 'Sobre', 'Serviços', 'Contato'],
    buttonText: 'Falar com Especialista',
    bgColor: '#ffffff',
    textColor: '#18181b'
  },
  slider: {
    slides: [
      { title: 'Design Moderno', desc: 'Crie interfaces incríveis com facilidade.', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop' },
      { title: 'Alta Conversão', desc: 'Focado em resultados e performance.', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200&auto=format&fit=crop' }
    ],
    height: '400'
  },
  feature_grid: {
    columns: '3',
    features: [
      { title: 'Rápido', desc: 'Carregamento otimizado' },
      { title: 'Responsivo', desc: 'Funciona em qualquer tela' },
      { title: 'Seguro', desc: 'Proteção de ponta a ponta' }
    ],
    bgColor: '#ffffff'
  },
  gallery: {
    columns: '3',
    images: [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=400&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=400&auto=format&fit=crop'
    ],
    gap: '16',
    radius: 'rounded-xl'
  },
  grid: {
    columns: '2',
    gap: '16',
    padding: '16',
    bgColor: 'transparent',
    radius: 'rounded-none'
  },
  container: {
    padding: '16',
    bgColor: 'transparent',
    radius: 'rounded-none',
    shadow: 'shadow-none',
    align: 'left'
  },
  column: {
    padding: '16',
    bgColor: 'transparent',
    radius: 'rounded-none',
    shadow: 'shadow-none',
    align: 'left'
  },
  countdown: {
    targetDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
    targetTime: '23:59',
    color: '#dc2626',
    bgColor: '#ffffff',
    labelColor: '#52525b',
    expiredText: 'Oferta Encerrada!'
  },
  whatsapp_button: {
    link: 'https://wa.me/5511999999999',
    position: 'bottom-right',
    bgColor: '#25D366',
    iconColor: '#ffffff'
  },
  tabs: {
    tabs: [
      { title: 'Aba 1', content: 'Conteúdo da primeira aba.' },
      { title: 'Aba 2', content: 'Conteúdo da segunda aba.' },
      { title: 'Aba 3', content: 'Conteúdo da terceira aba.' }
    ],
    activeColor: '#3b82f6',
    bgColor: '#ffffff'
  },
  progress_bar: {
    percentage: '75',
    label: 'Vagas Preenchidas',
    color: '#10b981',
    bgColor: '#e5e7eb',
    height: '16'
  },
  star_rating: {
    rating: '5',
    maxStars: '5',
    color: '#fbbf24',
    size: '24',
    align: 'center'
  },
  google_map: {
    address: 'Av. Paulista, 1000, São Paulo, SP',
    height: '400',
    zoom: '15',
    radius: 'rounded-xl'
  },
  comparison_table: {
    title: 'Comparativo de Planos',
    headers: ['Recurso', 'Nosso Plano', 'Concorrente'],
    rows: [
      { feature: 'Suporte 24/7', us: true, them: false },
      { feature: 'Atualizações', us: true, them: true },
      { feature: 'Treinamento', us: true, them: false }
    ],
    color: '#10b981',
    bgColor: '#ffffff'
  },
  image_carousel: {
    images: [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop'
    ],
    height: '400',
    radius: 'rounded-xl',
    autoPlay: true,
    interval: '3000'
  },
  toast_notification: {
    name: 'João S.',
    action: 'acabou de comprar o plano Pro',
    timeAgo: 'há 2 minutos',
    avatarUrl: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop',
    position: 'bottom-left',
    bgColor: '#ffffff',
    textColor: '#18181b'
  },
  marketing_hero: {
    title: 'Chegar em quem já quer comprar — todo dia.',
    subtitle: 'Proposta Exclusiva · Cliente Exemplo',
    description: 'Você tem produtos incríveis e um posicionamento único. Nós colocamos eles na frente de quem está pronto para comprar.',
    primaryColor: '#B45309',
    secondaryColor: '#D97706',
    logoUrl: 'https://chocolate-wren-935571.hostingersite.com/wp-content/uploads/2026/03/Vortex.png'
  },
  marketing_context: {
    title: 'Entendemos o que você construiu.',
    description: 'Você não tem só um produto — tem ativos complementares que criam uma oportunidade única de escala no digital.',
    stats: [
      { value: '2', label: 'Produtos ativos' },
      { value: 'Meta', label: 'Instagram + Facebook' }
    ],
    challenges: [
      { title: 'Alcance limitado', desc: 'O conteúdo excelente não chega a quem nunca te seguiu.' },
      { title: 'Sem funil estruturado', desc: 'Visitantes chegam e saem sem entender o caminho.' }
    ]
  },
  marketing_strategy: {
    title: 'Funil completo do lead à venda.',
    steps: [
      { letra: 'T', titulo: 'Topo — Atração', desc: 'Anúncios para novos públicos que nunca ouviram falar de você.' },
      { letra: 'M', titulo: 'Meio — Nutrição', desc: 'Remarketing inteligente para quem já interagiu com a marca.' },
      { letra: 'F', titulo: 'Fundo — Conversão', desc: 'Público aquecido pronto para converter no produto de maior ticket.' }
    ]
  },
  marketing_services: {
    title: 'Estratégia simples, resultado real.',
    services: [
      { num: '01', titulo: 'Gestão de Tráfego Pago', desc: 'Configuramos, gerenciamos e otimizamos todas as campanhas.' },
      { num: '02', titulo: 'Produção Audiovisual', desc: 'Produzimos fotos e vídeos pensados para performance.' }
    ]
  },
  marketing_pricing: {
    title: 'O que você recebe',
    price: '2.459,97',
    items: [
      'Gestão completa de Meta Ads',
      'Produção audiovisual mensal',
      '1 Landing Page por mês'
    ]
  },
  marketing_cta: {
    title: 'O custo de não agir é maior do que o investimento.',
    description: 'Cada semana sem anúncios é uma semana de vendas que ficaram para o concorrente.',
    buttonText: 'Falar com Especialista agora'
  }
};

const ALIGN_OPTIONS = [
  { label: 'Esq', value: 'left' },
  { label: 'Centro', value: 'center' },
  { label: 'Dir', value: 'right' }
];

const ANIMATION_OPTIONS = [
  { label: 'Nenhuma', value: 'none' },
  { label: 'Fade Up', value: 'fade-up' },
  { label: 'Pulse', value: 'pulse' },
  { label: 'Bounce', value: 'bounce' },
  { label: 'Scale In', value: 'scale' }
];

export default function Builder({ 
  initialElements, 
  onSave, 
  onBack,
  onChange,
  saveLabel = "Salvar",
  previewMode: initialPreviewMode = false
}: { 
  initialElements?: ElementData[], 
  onSave?: (elements: ElementData[]) => void, 
  onBack?: () => void,
  onChange?: (elements: ElementData[]) => void,
  saveLabel?: string,
  previewMode?: boolean
}) {
  const [elements, setElements] = useState<ElementData[]>(() => {
    if (initialElements !== undefined) return initialElements;
    const saved = localStorage.getItem('taggo_builder_data');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(initialPreviewMode);
  const [activeTab, setActiveTab] = useState<'properties' | 'layers'>('properties');

  // Auto-save and onChange
  useEffect(() => {
    localStorage.setItem('taggo_builder_data', JSON.stringify(elements));
    if (onChange) onChange(elements);
  }, [elements, onChange]);

  // Export/Import
  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(elements));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "taggo_landing_page.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setElements(json);
      } catch (err) {
        alert("Arquivo inválido!");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  // --- Drag & Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, type: ElementType) => {
    e.dataTransfer.setData('elementType', type);
  };

  const addElementToParent = (items: ElementData[], parentId: string, newEl: ElementData): ElementData[] => {
    return items.map(item => {
      if (item.id === parentId) {
        return { ...item, children: [...(item.children || []), newEl] };
      }
      if (item.children) {
        return { ...item, children: addElementToParent(item.children, parentId, newEl) };
      }
      return item;
    });
  };

  const handleDrop = (e: React.DragEvent, parentId: string | null = null) => {
    e.preventDefault();
    e.stopPropagation();
    const type = e.dataTransfer.getData('elementType') as ElementType;
    if (!type) return;

    const newElement: ElementData = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      props: { ...DEFAULT_PROPS[type] },
      ...(type === 'grid' || type === 'container' || type === 'column' ? { children: [] } : {})
    };

    if (type === 'grid') {
      const colsCount = parseInt(DEFAULT_PROPS.grid.columns || '2');
      newElement.children = Array.from({ length: colsCount }).map(() => ({
        id: Math.random().toString(36).substr(2, 9),
        type: 'column',
        props: { ...DEFAULT_PROPS.column },
        children: []
      }));
    }

    if (parentId) {
      setElements(addElementToParent(elements, parentId, newElement));
    } else {
      setElements([...elements, newElement]);
    }
    setSelectedId(newElement.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // --- Element Actions ---
  const updateElementRecursive = (items: ElementData[], id: string, newProps: Record<string, any>): ElementData[] => {
    return items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, props: { ...item.props, ...newProps } };
        
        if (item.type === 'grid' && newProps.columns) {
          const newColCount = parseInt(newProps.columns);
          const currentCols = item.children || [];
          if (newColCount > currentCols.length) {
            const colsToAdd = newColCount - currentCols.length;
            const newCols = Array.from({ length: colsToAdd }).map(() => ({
              id: Math.random().toString(36).substr(2, 9),
              type: 'column' as ElementType,
              props: { ...DEFAULT_PROPS.column },
              children: []
            }));
            updatedItem.children = [...currentCols, ...newCols];
          } else if (newColCount < currentCols.length) {
            updatedItem.children = currentCols.slice(0, newColCount);
          }
        }
        
        return updatedItem;
      }
      if (item.children) {
        return { ...item, children: updateElementRecursive(item.children, id, newProps) };
      }
      return item;
    });
  };

  const deleteElementRecursive = (items: ElementData[], id: string): ElementData[] => {
    return items.filter(item => item.id !== id).map(item => {
      if (item.children) {
        return { ...item, children: deleteElementRecursive(item.children, id) };
      }
      return item;
    });
  };

  const moveElementRecursive = (items: ElementData[], id: string, direction: 'up' | 'down'): ElementData[] => {
    const index = items.findIndex(el => el.id === id);
    if (index !== -1) {
      const newItems = [...items];
      if (direction === 'up' && index > 0) {
        [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
      } else if (direction === 'down' && index < newItems.length - 1) {
        [newItems[index + 1], newItems[index]] = [newItems[index], newItems[index + 1]];
      }
      return newItems;
    }
    return items.map(item => {
      if (item.children) {
        return { ...item, children: moveElementRecursive(item.children, id, direction) };
      }
      return item;
    });
  };

  const updateElement = (id: string, newProps: Record<string, any>) => {
    setElements(updateElementRecursive(elements, id, newProps));
  };

  const deleteElement = (id: string) => {
    setElements(deleteElementRecursive(elements, id));
    if (selectedId === id) setSelectedId(null);
  };

  const moveElement = (id: string, direction: 'up' | 'down') => {
    setElements(moveElementRecursive(elements, id, direction));
  };

  const findElementRecursive = (items: ElementData[], id: string): ElementData | undefined => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children) {
        const found = findElementRecursive(item.children, id);
        if (found) return found;
      }
    }
    return undefined;
  };

  const selectedElement = selectedId ? findElementRecursive(elements, selectedId) : undefined;

  const renderElementNode = (el: ElementData) => {
    const isSelected = selectedId === el.id;
    
    return (
      <motion.div 
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        key={el.id}
        onClick={(e) => { e.stopPropagation(); if(!previewMode) setSelectedId(el.id); }}
        className={`relative group transition-all duration-200 ${previewMode ? '' : 'border-2 rounded-2xl p-2'} ${!previewMode && isSelected ? 'border-blue-500/50 shadow-[0_0_0_4px_rgba(59,130,246,0.1)] z-10 bg-blue-50/30' : !previewMode ? 'border-transparent hover:border-black/5 hover:bg-black/5' : ''}`}
      >
        {/* Hover/Active Controls */}
        {!previewMode && (isSelected || true) && (
        <div className={`absolute -top-5 right-4 bg-white border border-black/10 text-zinc-900 rounded-xl shadow-xl flex items-center overflow-hidden transition-all duration-200 z-20 ${isSelected ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'}`}>
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest bg-zinc-50 border-r border-black/5 text-zinc-500">
            {el.type.replace('_', ' ')}
          </div>
          <button onClick={(e) => { e.stopPropagation(); setActiveTab('layers'); setSelectedId(el.id); }} className="p-2 hover:bg-zinc-50 border-r border-black/5 text-zinc-600 hover:text-blue-600 transition-colors" title="Ver na Estrutura"><Layers className="w-4 h-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); moveElement(el.id, 'up'); }} className="p-2 hover:bg-zinc-50 text-zinc-600 hover:text-blue-600 transition-colors" title="Mover para cima"><ArrowUp className="w-4 h-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); moveElement(el.id, 'down'); }} className="p-2 hover:bg-zinc-50 border-l border-black/5 text-zinc-600 hover:text-blue-600 transition-colors" title="Mover para baixo"><ArrowDown className="w-4 h-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); deleteElement(el.id); }} className="p-2 hover:bg-red-50 border-l border-black/5 text-red-500 hover:text-red-600 transition-colors" title="Excluir"><Trash2 className="w-4 h-4" /></button>
        </div>
        )}
        
        {/* Render Element */}
        <div className={`${(el.type === 'grid' || el.type === 'container' || el.type === 'column') && !previewMode ? '' : 'pointer-events-none'} ${el.type === 'button' ? `flex justify-${el.props.align === 'left' ? 'start' : el.props.align === 'right' ? 'end' : 'center'}` : ''} ${el.type === 'column' ? 'h-full' : ''}`}>
          {el.type === 'grid' ? (
            <div 
              className={`grid ${el.props.columns === '1' ? 'grid-cols-1' : el.props.columns === '2' ? 'grid-cols-2' : el.props.columns === '3' ? 'grid-cols-3' : el.props.columns === '4' ? 'grid-cols-4' : el.props.columns === '5' ? 'grid-cols-5' : 'grid-cols-6'} ${el.props.radius}`}
              style={{ 
                gap: `${el.props.gap}px`, 
                padding: `${el.props.padding}px`,
                backgroundColor: el.props.bgColor 
              }}
            >
              {(!el.children || el.children.length === 0) && !previewMode ? (
                <div 
                  className="col-span-full p-8 border-2 border-dashed border-black/10 rounded-2xl flex flex-col items-center justify-center text-zinc-500 bg-zinc-50/50 backdrop-blur-sm"
                  onDrop={(e) => handleDrop(e, el.id)}
                  onDragOver={handleDragOver}
                >
                  <Plus className="w-8 h-8 mb-2 opacity-50" />
                  <span className="text-sm font-medium">Arraste elementos para este Grid</span>
                </div>
              ) : (
                el.children?.map(child => renderElementNode(child))
              )}
            </div>
          ) : el.type === 'container' || el.type === 'column' ? (
            <div 
              className={`flex flex-col ${el.props.radius} ${el.props.shadow} h-full`}
              style={{ 
                padding: `${el.props.padding}px`,
                backgroundColor: el.props.bgColor,
                alignItems: el.props.align === 'center' ? 'center' : el.props.align === 'right' ? 'flex-end' : 'flex-start'
              }}
              onDrop={(e) => handleDrop(e, el.id)}
              onDragOver={handleDragOver}
            >
              {(!el.children || el.children.length === 0) && !previewMode ? (
                <div className="w-full h-full min-h-[120px] border-2 border-dashed border-black/10 rounded-2xl flex flex-col items-center justify-center text-zinc-500 bg-zinc-50/50 backdrop-blur-sm">
                  <Plus className="w-6 h-6 mb-2 opacity-50" />
                  <span className="text-xs font-medium text-center px-2">Arraste para esta {el.type === 'column' ? 'coluna' : 'área'}</span>
                </div>
              ) : (
                el.children?.map(child => renderElementNode(child))
              )}
            </div>
          ) : (
            <RenderElement element={el} previewMode={previewMode} />
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="h-screen w-full flex bg-transparent font-sans overflow-hidden text-zinc-900">
      
      {/* LEFT SIDEBAR: WIDGETS */}
      {!previewMode && (
        <div className="w-[300px] glass-panel flex flex-col border-r border-black/5 z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all">
          <div className="p-5 border-b border-black/5 flex items-center gap-3 bg-white/50">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 flex items-center justify-center shadow-sm">
              <LayoutTemplate className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-semibold text-zinc-900 tracking-tight">Taggo Builder</h1>
          </div>
          
          <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
            
            <WidgetCategory title="Marketing Premium">
            <DraggableWidget type="marketing_hero" icon={<Sparkles />} label="Marketing Hero" onDragStart={handleDragStart} />
            <DraggableWidget type="marketing_context" icon={<Layout />} label="Contexto" onDragStart={handleDragStart} />
            <DraggableWidget type="marketing_strategy" icon={<Layers />} label="Estratégia" onDragStart={handleDragStart} />
            <DraggableWidget type="marketing_services" icon={<List />} label="Serviços" onDragStart={handleDragStart} />
            <DraggableWidget type="marketing_pricing" icon={<DollarSign />} label="Preço" onDragStart={handleDragStart} />
            <DraggableWidget type="marketing_cta" icon={<MessageCircle />} label="CTA" onDragStart={handleDragStart} />
          </WidgetCategory>

          <WidgetCategory title="Layout & Navegação">
            <DraggableWidget type="navbar" icon={<Navigation />} label="Menu (Navbar)" onDragStart={handleDragStart} />
            <DraggableWidget type="feature_grid" icon={<Columns />} label="Grid de Colunas" onDragStart={handleDragStart} />
            <DraggableWidget type="gallery" icon={<Grid3X3 />} label="Galeria" onDragStart={handleDragStart} />
            <DraggableWidget type="slider" icon={<GalleryHorizontal />} label="Slider" onDragStart={handleDragStart} />
          </WidgetCategory>

          <WidgetCategory title="Básicos">
            <DraggableWidget type="heading" icon={<Type />} label="Título" onDragStart={handleDragStart} />
            <DraggableWidget type="paragraph" icon={<AlignLeft />} label="Texto" onDragStart={handleDragStart} />
            <DraggableWidget type="button" icon={<MousePointerClick />} label="Botão" onDragStart={handleDragStart} />
            <DraggableWidget type="image" icon={<ImageIcon />} label="Imagem" onDragStart={handleDragStart} />
          </WidgetCategory>

          <WidgetCategory title="Estrutura & Mídia">
            <DraggableWidget type="grid" icon={<Grid3X3 />} label="Grid / Seção" onDragStart={handleDragStart} />
            <DraggableWidget type="container" icon={<Box />} label="Contêiner" onDragStart={handleDragStart} />
            <DraggableWidget type="divider" icon={<Minus />} label="Divisor" onDragStart={handleDragStart} />
            <DraggableWidget type="spacer" icon={<Maximize2 />} label="Espaço" onDragStart={handleDragStart} />
            <DraggableWidget type="video" icon={<Youtube />} label="Vídeo" onDragStart={handleDragStart} />
            <DraggableWidget type="card" icon={<Layout />} label="Cartão" onDragStart={handleDragStart} />
          </WidgetCategory>

          <WidgetCategory title="Avançados & Conversão">
            <DraggableWidget type="funnel" icon={<Filter />} label="Funil" onDragStart={handleDragStart} />
            <DraggableWidget type="pricing" icon={<DollarSign />} label="Preço" onDragStart={handleDragStart} />
            <DraggableWidget type="icon_list" icon={<ListChecks />} label="Lista de Ícones" onDragStart={handleDragStart} />
            <DraggableWidget type="timeline" icon={<GitCommit />} label="Linha do Tempo" onDragStart={handleDragStart} />
            <DraggableWidget type="testimonial" icon={<MessageSquareQuote />} label="Depoimento" onDragStart={handleDragStart} />
            <DraggableWidget type="countdown" icon={<Timer />} label="Contador" onDragStart={handleDragStart} />
            <DraggableWidget type="whatsapp_button" icon={<MessageCircle />} label="WhatsApp" onDragStart={handleDragStart} />
            <DraggableWidget type="toast_notification" icon={<Bell />} label="Notificação" onDragStart={handleDragStart} />
          </WidgetCategory>

          <WidgetCategory title="Interativos & Animados">
            <DraggableWidget type="stats" icon={<BarChart />} label="Estatística" onDragStart={handleDragStart} />
            <DraggableWidget type="accordion" icon={<List />} label="Sanfona (FAQ)" onDragStart={handleDragStart} />
            <DraggableWidget type="tabs" icon={<FolderOpen />} label="Abas" onDragStart={handleDragStart} />
            <DraggableWidget type="progress_bar" icon={<Activity />} label="Progresso" onDragStart={handleDragStart} />
            <DraggableWidget type="star_rating" icon={<Star />} label="Avaliação" onDragStart={handleDragStart} />
            <DraggableWidget type="google_map" icon={<MapPin />} label="Mapa" onDragStart={handleDragStart} />
            <DraggableWidget type="comparison_table" icon={<Table />} label="Comparação" onDragStart={handleDragStart} />
            <DraggableWidget type="image_carousel" icon={<Images />} label="Carrossel" onDragStart={handleDragStart} />
            <DraggableWidget type="animated_text" icon={<Sparkles className="text-yellow-400" />} label="Texto Animado" onDragStart={handleDragStart} />
          </WidgetCategory>

          <p className="text-xs text-zinc-500 mt-8 text-center px-4">Arraste os elementos para a área central para construir sua página.</p>
          </div>
        </div>
      )}

      {/* CENTER: CANVAS (DROP ZONE) */}
      <div 
        className="flex-1 flex flex-col relative overflow-y-auto custom-scrollbar bg-transparent"
        onDrop={(e) => handleDrop(e)}
        onDragOver={handleDragOver}
        onClick={() => setSelectedId(null)}
      >
        {/* Top Toolbar */}
        <div className="h-16 glass-panel border-b border-black/5 flex items-center justify-between px-6 sticky top-0 z-20 shadow-sm shrink-0 bg-white/80">
          <div className="flex items-center gap-2">
            {onBack && (
              <button onClick={onBack} className="btn-secondary mr-2">
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
            )}
            <button onClick={() => { setPreviewMode(!previewMode); setSelectedId(null); }} className={`btn-secondary ${previewMode ? 'bg-zinc-100 text-zinc-900 border-black/10 shadow-inner' : ''}`}>
              {previewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {previewMode ? 'Sair do Preview' : 'Preview'}
            </button>
          </div>
          {!previewMode && (
            <div className="flex items-center gap-2">
              <label className="btn-secondary cursor-pointer">
                <Upload className="w-4 h-4" /> Importar
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>
              <button onClick={handleExport} className="btn-secondary">
                <Download className="w-4 h-4" /> Exportar
              </button>
              <div className="w-px h-6 bg-black/10 mx-2" />
              <button onClick={() => { if(confirm('Tem certeza que deseja limpar tudo?')) setElements([]) }} className="btn-danger">
                <Trash className="w-4 h-4" /> Limpar
              </button>
              {onSave && (
                <>
                  <div className="w-px h-6 bg-black/10 mx-2" />
                  <button onClick={() => onSave(elements)} className="btn-primary">
                    <Save className="w-4 h-4" /> {saveLabel}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className={`min-h-full flex justify-center ${previewMode ? 'p-0' : 'p-8'}`}>
          <div className={`w-full max-w-5xl bg-white min-h-[800px] transition-all duration-500 ${previewMode ? '' : 'shadow-xl border border-black/5 rounded-[2rem] p-8 pb-32 ring-1 ring-black/5'}`}>
            {elements.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 border-2 border-dashed border-black/10 rounded-3xl p-12 bg-zinc-50/50 hover:bg-zinc-50 transition-colors">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-black/5 flex items-center justify-center mb-4">
                  <Plus className="w-8 h-8 text-zinc-400" />
                </div>
                <p className="text-lg font-medium text-zinc-900">Sua página está vazia</p>
                <p className="text-sm mt-2 text-zinc-500">Arraste elementos da barra lateral para começar a construir.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                <AnimatePresence>
                  {elements.map((el) => renderElementNode(el))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR: PROPERTIES PANEL */}
      {!previewMode && (
        <div className="w-[320px] glass-panel border-l border-black/5 flex flex-col z-10 shadow-[-4px_0_24px_rgba(0,0,0,0.02)] transition-all">
          <div className="flex border-b border-black/5 bg-zinc-50/80 shrink-0 p-2 gap-2">
            <button 
              onClick={() => setActiveTab('properties')}
              className={`flex-1 py-2 px-4 flex items-center justify-center gap-2 font-medium text-sm transition-all rounded-xl ${activeTab === 'properties' ? 'text-zinc-900 bg-white shadow-sm border border-black/5' : 'text-zinc-500 hover:text-zinc-700 hover:bg-black/5'}`}
            >
              <Settings className="w-4 h-4" /> Propriedades
            </button>
            <button 
              onClick={() => setActiveTab('layers')}
              className={`flex-1 py-2 px-4 flex items-center justify-center gap-2 font-medium text-sm transition-all rounded-xl ${activeTab === 'layers' ? 'text-zinc-900 bg-white shadow-sm border border-black/5' : 'text-zinc-500 hover:text-zinc-700 hover:bg-black/5'}`}
            >
              <Layers className="w-4 h-4" /> Estrutura
            </button>
          </div>
        
        <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === 'layers' ? (
            elements.length === 0 ? (
              <div className="text-center text-zinc-500 mt-10">
                <Layers className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-sm">Nenhum elemento na página ainda.</p>
              </div>
            ) : (
              <LayerTree elements={elements} selectedId={selectedId} setSelectedId={setSelectedId} />
            )
          ) : !selectedElement ? (
            <div className="text-center text-zinc-500 mt-10">
              <MousePointerClick className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm">Selecione um elemento na tela para editar suas propriedades.</p>
            </div>
          ) : (
            <div className="space-y-6 pb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold rounded-lg uppercase tracking-wider mb-2">
                <Settings className="w-3.5 h-3.5" />
                {selectedElement.type.replace('_', ' ')}
              </div>

              {/* --- DYNAMIC PROPERTY INPUTS --- */}
              
              <div className="space-y-5">
                {/* Text Inputs */}
                {['text', 'title', 'label', 'value', 'suffix', 'buttonText', 'price', 'period', 'quote', 'author', 'role', 'logoText', 'expiredText', 'percentage', 'rating', 'maxStars', 'size', 'address', 'zoom', 'name', 'action', 'timeAgo', 'height'].map(propKey => (
                  propKey in selectedElement.props && (
                    <div key={propKey}>
                      <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                        {propKey === 'text' ? 'Texto' : propKey === 'title' ? 'Título' : propKey === 'label' ? 'Rótulo' : propKey === 'value' ? 'Valor' : propKey === 'suffix' ? 'Sufixo' : propKey === 'buttonText' ? 'Texto do Botão' : propKey === 'price' ? 'Preço' : propKey === 'period' ? 'Período' : propKey === 'quote' ? 'Citação' : propKey === 'author' ? 'Autor' : propKey === 'role' ? 'Cargo' : propKey === 'logoText' ? 'Texto da Logo' : propKey === 'expiredText' ? 'Texto Expirado' : propKey === 'percentage' ? 'Porcentagem' : propKey === 'rating' ? 'Avaliação' : propKey === 'maxStars' ? 'Máx. Estrelas' : propKey === 'size' ? 'Tamanho' : propKey === 'address' ? 'Endereço' : propKey === 'zoom' ? 'Zoom' : propKey === 'name' ? 'Nome' : propKey === 'action' ? 'Ação' : propKey === 'timeAgo' ? 'Tempo Atrás' : propKey === 'height' ? 'Altura' : propKey}
                      </label>
                      {selectedElement.type === 'paragraph' && propKey === 'text' ? (
                        <textarea 
                          value={selectedElement.props[propKey]} 
                          onChange={(e) => updateElement(selectedElement.id, { [propKey]: e.target.value })}
                          className="glass-input min-h-[100px] resize-y"
                        />
                      ) : selectedElement.type === 'testimonial' && propKey === 'quote' ? (
                        <textarea 
                          value={selectedElement.props[propKey]} 
                          onChange={(e) => updateElement(selectedElement.id, { [propKey]: e.target.value })}
                          className="glass-input min-h-[80px] resize-y"
                        />
                      ) : (
                        <input 
                          type="text" 
                          value={selectedElement.props[propKey]} 
                          onChange={(e) => updateElement(selectedElement.id, { [propKey]: e.target.value })}
                          className="glass-input"
                        />
                      )}
                    </div>
                  )
                ))}

                {/* Date/Time Inputs */}
                {['targetDate', 'targetTime'].map(propKey => (
                  propKey in selectedElement.props && (
                    <div key={propKey}>
                      <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                        {propKey === 'targetDate' ? 'Data Alvo' : 'Hora Alvo'}
                      </label>
                      <input 
                        type={propKey === 'targetDate' ? 'date' : 'time'} 
                        value={selectedElement.props[propKey]} 
                        onChange={(e) => updateElement(selectedElement.id, { [propKey]: e.target.value })}
                        className="glass-input"
                      />
                    </div>
                  )
                ))}

                {/* Textareas for Descriptions/Content */}
                {['description', 'content'].map(propKey => (
                  propKey in selectedElement.props && (
                    <div key={propKey}>
                      <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">{propKey === 'description' ? 'Descrição' : 'Conteúdo'}</label>
                      <textarea 
                        value={selectedElement.props[propKey]} 
                        onChange={(e) => updateElement(selectedElement.id, { [propKey]: e.target.value })}
                        className="glass-input min-h-[80px] resize-y"
                      />
                    </div>
                  )
                ))}

                {/* URL Inputs */}
                {['url', 'imageUrl', 'avatarUrl', 'link'].map(propKey => (
                  propKey in selectedElement.props && (
                    <div key={propKey}>
                      <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">URL da {propKey === 'imageUrl' ? 'Imagem' : propKey === 'avatarUrl' ? 'Avatar' : propKey === 'link' ? 'Link' : selectedElement.type === 'video' ? 'Vídeo (Embed)' : 'Mídia'}</label>
                      <input 
                        type="text" 
                        value={selectedElement.props[propKey]} 
                        onChange={(e) => updateElement(selectedElement.id, { [propKey]: e.target.value })}
                        className="glass-input"
                      />
                    </div>
                  )
                ))}
              </div>

              <div className="h-px w-full bg-black/5 my-6" />

              <div className="space-y-5">
                {/* Alignment */}
                {('align' in selectedElement.props) && (
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Alinhamento</label>
                    <div className="flex bg-zinc-100 rounded-xl p-1 border border-black/5">
                      {ALIGN_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => updateElement(selectedElement.id, { align: opt.value })}
                          className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${selectedElement.props.align === opt.value ? 'bg-white shadow-sm border border-black/5 text-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-black/5'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Colors */}
                {['color', 'bgColor', 'textColor', 'iconColor', 'buttonColor', 'labelColor', 'activeColor'].map(propKey => (
                  propKey in selectedElement.props && (
                    <div key={propKey}>
                      <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                        {propKey === 'color' ? 'Cor Principal' : propKey === 'bgColor' ? 'Cor de Fundo' : propKey === 'iconColor' ? 'Cor do Ícone' : propKey === 'buttonColor' ? 'Cor do Botão' : propKey === 'labelColor' ? 'Cor do Rótulo' : propKey === 'activeColor' ? 'Cor Ativa' : 'Cor do Texto'}
                      </label>
                      <div className="flex items-center gap-3 bg-white border border-black/10 rounded-xl p-2">
                        <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-black/10 shadow-sm shrink-0">
                          <input type="color" value={selectedElement.props[propKey]} onChange={(e) => updateElement(selectedElement.id, { [propKey]: e.target.value })} className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer" />
                        </div>
                        <input type="text" value={selectedElement.props[propKey]} onChange={(e) => updateElement(selectedElement.id, { [propKey]: e.target.value })} className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-mono uppercase text-zinc-700 p-0" />
                      </div>
                    </div>
                  )
                ))}

                {/* Selects (Size, Radius, Shadow, Animation, Style) */}
                {('position' in selectedElement.props) && (
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Posição</label>
                    <select value={selectedElement.props.position} onChange={(e) => updateElement(selectedElement.id, { position: e.target.value })} className="glass-input appearance-none cursor-pointer">
                      <option value="bottom-right">Inferior Direito</option>
                      <option value="bottom-left">Inferior Esquerdo</option>
                      <option value="top-right">Superior Direito</option>
                      <option value="top-left">Superior Esquerdo</option>
                    </select>
                  </div>
                )}

                {('columns' in selectedElement.props) && (
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Colunas</label>
                    <select value={selectedElement.props.columns} onChange={(e) => updateElement(selectedElement.id, { columns: e.target.value })} className="glass-input appearance-none cursor-pointer">
                      <option value="1">1 Coluna</option>
                      <option value="2">2 Colunas</option>
                      <option value="3">3 Colunas</option>
                      <option value="4">4 Colunas</option>
                      {selectedElement.type === 'grid' && <option value="5">5 Colunas</option>}
                      {selectedElement.type === 'grid' && <option value="6">6 Colunas</option>}
                    </select>
                  </div>
                )}

                {('size' in selectedElement.props) && (
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Tamanho do Texto</label>
                    <select value={selectedElement.props.size} onChange={(e) => updateElement(selectedElement.id, { size: e.target.value })} className="glass-input appearance-none cursor-pointer">
                      <option value="text-sm">Pequeno</option>
                      <option value="text-base">Normal</option>
                      <option value="text-xl">Grande</option>
                      <option value="text-3xl">Muito Grande</option>
                      <option value="text-5xl">Gigante</option>
                      <option value="text-7xl">Titã</option>
                    </select>
                  </div>
                )}

                {('radius' in selectedElement.props) && (
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Arredondamento</label>
                    <select value={selectedElement.props.radius} onChange={(e) => updateElement(selectedElement.id, { radius: e.target.value })} className="glass-input appearance-none cursor-pointer">
                      <option value="rounded-none">Quadrado</option>
                      <option value="rounded-md">Suave</option>
                      <option value="rounded-xl">Arredondado</option>
                      <option value="rounded-2xl">Muito Arredondado</option>
                      <option value="rounded-full">Pílula</option>
                    </select>
                  </div>
                )}

                {('shadow' in selectedElement.props) && (
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Sombra</label>
                    <select value={selectedElement.props.shadow} onChange={(e) => updateElement(selectedElement.id, { shadow: e.target.value })} className="glass-input appearance-none cursor-pointer">
                      <option value="shadow-none">Sem Sombra</option>
                      <option value="shadow-sm">Pequena</option>
                      <option value="shadow-md">Média</option>
                      <option value="shadow-lg">Grande</option>
                      <option value="shadow-xl">Extra Grande</option>
                    </select>
                  </div>
                )}

                {('animation' in selectedElement.props) && (
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Animação</label>
                    <select value={selectedElement.props.animation} onChange={(e) => updateElement(selectedElement.id, { animation: e.target.value })} className="glass-input appearance-none cursor-pointer">
                      {ANIMATION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                )}

                {('style' in selectedElement.props) && selectedElement.type === 'divider' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Estilo da Linha</label>
                    <select value={selectedElement.props.style} onChange={(e) => updateElement(selectedElement.id, { style: e.target.value })} className="glass-input appearance-none cursor-pointer">
                      <option value="solid">Sólida</option>
                      <option value="dashed">Tracejada</option>
                      <option value="dotted">Pontilhada</option>
                    </select>
                  </div>
                )}

                {/* Number Inputs (Thickness, Height) */}
                {('gap' in selectedElement.props) && (
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Espaçamento (px)</label>
                    <input type="number" min="0" max="100" value={selectedElement.props.gap} onChange={(e) => updateElement(selectedElement.id, { gap: e.target.value })} className="glass-input" />
                  </div>
                )}

                {('padding' in selectedElement.props) && (
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Padding Interno (px)</label>
                    <input type="number" min="0" max="100" value={selectedElement.props.padding} onChange={(e) => updateElement(selectedElement.id, { padding: e.target.value })} className="glass-input" />
                  </div>
                )}

                {('thickness' in selectedElement.props) && (
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Espessura (px)</label>
                    <input type="number" min="1" max="20" value={selectedElement.props.thickness} onChange={(e) => updateElement(selectedElement.id, { thickness: e.target.value })} className="glass-input" />
                  </div>
                )}

                {('height' in selectedElement.props) && (
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex justify-between">
                      <span>Altura (px)</span>
                      <span className="text-zinc-400">{selectedElement.props.height}px</span>
                    </label>
                    <input type="range" min="10" max="800" value={selectedElement.props.height} onChange={(e) => updateElement(selectedElement.id, { height: e.target.value })} className="w-full accent-blue-500" />
                  </div>
                )}
              </div>

              {/* --- ARRAY EDITORS (Lists, Funnels, Timelines) --- */}
              {('links' in selectedElement.props) && (
                <div className="pt-4 border-t border-black/5">
                  <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Links do Menu</label>
                  <div className="space-y-2">
                    {selectedElement.props.links.map((link: string, idx: number) => (
                      <div key={idx} className="flex gap-2 group">
                        <input 
                          type="text" 
                          value={link} 
                          onChange={(e) => {
                            const newLinks = [...selectedElement.props.links];
                            newLinks[idx] = e.target.value;
                            updateElement(selectedElement.id, { links: newLinks });
                          }}
                          className="flex-1 glass-input transition-all group-hover:border-black/20"
                        />
                        <button 
                          onClick={() => {
                            const newLinks = selectedElement.props.links.filter((_: any, i: number) => i !== idx);
                            updateElement(selectedElement.id, { links: newLinks });
                          }}
                          className="p-2 text-zinc-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => updateElement(selectedElement.id, { links: [...selectedElement.props.links, 'Novo Link'] })}
                      className="w-full py-2 border border-dashed border-black/10 text-zinc-500 rounded-xl text-sm font-medium hover:border-black/20 hover:text-zinc-900 hover:bg-black/5 transition-all flex items-center justify-center gap-2 mt-2"
                    >
                      <Plus className="w-4 h-4" /> Adicionar Link
                    </button>
                  </div>
                </div>
              )}

              {('images' in selectedElement.props) && (
                <div className="pt-4 border-t border-black/5">
                  <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Imagens da Galeria</label>
                  <div className="space-y-2">
                    {selectedElement.props.images.map((img: string, idx: number) => (
                      <div key={idx} className="flex gap-2 group">
                        <input 
                          type="text" 
                          value={img} 
                          onChange={(e) => {
                            const newImages = [...selectedElement.props.images];
                            newImages[idx] = e.target.value;
                            updateElement(selectedElement.id, { images: newImages });
                          }}
                          className="flex-1 glass-input transition-all group-hover:border-black/20"
                          placeholder="URL da Imagem"
                        />
                        <button 
                          onClick={() => {
                            const newImages = selectedElement.props.images.filter((_: any, i: number) => i !== idx);
                            updateElement(selectedElement.id, { images: newImages });
                          }}
                          className="p-2 text-zinc-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => updateElement(selectedElement.id, { images: [...selectedElement.props.images, 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop'] })}
                      className="w-full py-2 border border-dashed border-black/10 text-zinc-500 rounded-xl text-sm font-medium hover:border-black/20 hover:text-zinc-900 hover:bg-black/5 transition-all flex items-center justify-center gap-2 mt-2"
                    >
                      <Plus className="w-4 h-4" /> Adicionar Imagem
                    </button>
                  </div>
                </div>
              )}

              {('slides' in selectedElement.props) && (
                <div className="pt-4 border-t border-black/5">
                  <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Slides</label>
                  <div className="space-y-3">
                    {selectedElement.props.slides.map((slide: any, idx: number) => (
                      <div key={idx} className="flex gap-2 items-start bg-white/50 p-3 rounded-2xl border border-black/5 shadow-sm group hover:border-black/10 transition-all">
                        <div className="flex-1 space-y-2">
                          <input 
                            type="text" placeholder="URL da Imagem" value={slide.image} 
                            onChange={(e) => {
                              const newSlides = [...selectedElement.props.slides];
                              newSlides[idx].image = e.target.value;
                              updateElement(selectedElement.id, { slides: newSlides });
                            }}
                            className="glass-input"
                          />
                          <input 
                            type="text" placeholder="Título" value={slide.title} 
                            onChange={(e) => {
                              const newSlides = [...selectedElement.props.slides];
                              newSlides[idx].title = e.target.value;
                              updateElement(selectedElement.id, { slides: newSlides });
                            }}
                            className="glass-input font-medium"
                          />
                          <textarea 
                            placeholder="Descrição" value={slide.desc} 
                            onChange={(e) => {
                              const newSlides = [...selectedElement.props.slides];
                              newSlides[idx].desc = e.target.value;
                              updateElement(selectedElement.id, { slides: newSlides });
                            }}
                            className="glass-input min-h-[60px] resize-y"
                          />
                        </div>
                        <button 
                          onClick={() => {
                            const newSlides = selectedElement.props.slides.filter((_: any, i: number) => i !== idx);
                            updateElement(selectedElement.id, { slides: newSlides });
                          }}
                          className="p-2 text-zinc-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors mt-1 opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => updateElement(selectedElement.id, { slides: [...selectedElement.props.slides, { title: 'Novo Slide', desc: 'Descrição', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop' }] })}
                      className="w-full py-2 border border-dashed border-black/10 text-zinc-500 rounded-xl text-sm font-medium hover:border-black/20 hover:text-zinc-900 hover:bg-black/5 transition-all flex items-center justify-center gap-2 mt-2"
                    >
                      <Plus className="w-4 h-4" /> Adicionar Slide
                    </button>
                  </div>
                </div>
              )}

              {('features' in selectedElement.props) && (
                <div className="pt-4 border-t border-black/5">
                  <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Colunas / Recursos</label>
                  <div className="space-y-3">
                    {selectedElement.props.features.map((feature: any, idx: number) => (
                      <div key={idx} className="flex gap-2 items-start bg-white/50 p-3 rounded-2xl border border-black/5 shadow-sm group hover:border-black/10 transition-all">
                        <div className="flex-1 space-y-2">
                          <input 
                            type="text" placeholder="Título" value={feature.title} 
                            onChange={(e) => {
                              const newFeatures = [...selectedElement.props.features];
                              newFeatures[idx].title = e.target.value;
                              updateElement(selectedElement.id, { features: newFeatures });
                            }}
                            className="glass-input font-medium"
                          />
                          <textarea 
                            placeholder="Descrição" value={feature.desc} 
                            onChange={(e) => {
                              const newFeatures = [...selectedElement.props.features];
                              newFeatures[idx].desc = e.target.value;
                              updateElement(selectedElement.id, { features: newFeatures });
                            }}
                            className="glass-input min-h-[60px] resize-y"
                          />
                        </div>
                        <button 
                          onClick={() => {
                            const newFeatures = selectedElement.props.features.filter((_: any, i: number) => i !== idx);
                            updateElement(selectedElement.id, { features: newFeatures });
                          }}
                          className="p-2 text-zinc-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors mt-1 opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => updateElement(selectedElement.id, { features: [...selectedElement.props.features, { title: 'Novo Recurso', desc: 'Descrição' }] })}
                      className="w-full py-2 border border-dashed border-black/10 text-zinc-500 rounded-xl text-sm font-medium hover:border-black/20 hover:text-zinc-900 hover:bg-black/5 transition-all flex items-center justify-center gap-2 mt-2"
                    >
                      <Plus className="w-4 h-4" /> Adicionar Coluna
                    </button>
                  </div>
                </div>
              )}

              {('items' in selectedElement.props) && (
                <div className="pt-4 border-t border-black/5">
                  <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Itens da Lista</label>
                  <div className="space-y-2">
                    {selectedElement.props.items.map((item: string, idx: number) => (
                      <div key={idx} className="flex gap-2 group">
                        <input 
                          type="text" 
                          value={item} 
                          onChange={(e) => {
                            const newItems = [...selectedElement.props.items];
                            newItems[idx] = e.target.value;
                            updateElement(selectedElement.id, { items: newItems });
                          }}
                          className="flex-1 glass-input transition-all group-hover:border-black/20"
                        />
                        <button 
                          onClick={() => {
                            const newItems = selectedElement.props.items.filter((_: any, i: number) => i !== idx);
                            updateElement(selectedElement.id, { items: newItems });
                          }}
                          className="p-2 text-zinc-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => updateElement(selectedElement.id, { items: [...selectedElement.props.items, 'Novo Item'] })}
                      className="w-full py-2 border border-dashed border-black/10 text-zinc-500 rounded-xl text-sm font-medium hover:border-black/20 hover:text-zinc-900 hover:bg-black/5 transition-all flex items-center justify-center gap-2 mt-2"
                    >
                      <Plus className="w-4 h-4" /> Adicionar Item
                    </button>
                  </div>
                </div>
              )}

              {('stages' in selectedElement.props) && (
                <div className="pt-4 border-t border-black/5">
                  <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Estágios do Funil</label>
                  <div className="space-y-3">
                    {selectedElement.props.stages.map((stage: any, idx: number) => (
                      <div key={idx} className="flex gap-2 items-start bg-white/50 p-3 rounded-2xl border border-black/5 shadow-sm group hover:border-black/10 transition-all">
                        <div className="flex-1 space-y-2">
                          <input 
                            type="text" placeholder="Nome" value={stage.name} 
                            onChange={(e) => {
                              const newStages = [...selectedElement.props.stages];
                              newStages[idx].name = e.target.value;
                              updateElement(selectedElement.id, { stages: newStages });
                            }}
                            className="glass-input"
                          />
                          <input 
                            type="text" placeholder="Valor" value={stage.value} 
                            onChange={(e) => {
                              const newStages = [...selectedElement.props.stages];
                              newStages[idx].value = e.target.value;
                              updateElement(selectedElement.id, { stages: newStages });
                            }}
                            className="glass-input font-medium"
                          />
                        </div>
                        <button 
                          onClick={() => {
                            const newStages = selectedElement.props.stages.filter((_: any, i: number) => i !== idx);
                            updateElement(selectedElement.id, { stages: newStages });
                          }}
                          className="p-2 text-zinc-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors mt-1 opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => updateElement(selectedElement.id, { stages: [...selectedElement.props.stages, { name: 'Novo Estágio', value: '0' }] })}
                      className="w-full py-2 border border-dashed border-black/10 text-zinc-500 rounded-xl text-sm font-medium hover:border-black/20 hover:text-zinc-900 hover:bg-black/5 transition-all flex items-center justify-center gap-2 mt-2"
                    >
                      <Plus className="w-4 h-4" /> Adicionar Estágio
                    </button>
                  </div>
                </div>
              )}

              {('steps' in selectedElement.props) && (
                <div className="pt-4 border-t border-black/5">
                  <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Passos da Linha do Tempo</label>
                  <div className="space-y-3">
                    {selectedElement.props.steps.map((step: any, idx: number) => (
                      <div key={idx} className="flex gap-2 items-start bg-white/50 p-3 rounded-2xl border border-black/5 shadow-sm group hover:border-black/10 transition-all">
                        <div className="flex-1 space-y-2">
                          <input 
                            type="text" placeholder="Título" value={step.title} 
                            onChange={(e) => {
                              const newSteps = [...selectedElement.props.steps];
                              newSteps[idx].title = e.target.value;
                              updateElement(selectedElement.id, { steps: newSteps });
                            }}
                            className="glass-input font-medium"
                          />
                          <textarea 
                            placeholder="Descrição" value={step.desc} 
                            onChange={(e) => {
                              const newSteps = [...selectedElement.props.steps];
                              newSteps[idx].desc = e.target.value;
                              updateElement(selectedElement.id, { steps: newSteps });
                            }}
                            className="glass-input min-h-[60px] resize-y"
                          />
                        </div>
                        <button 
                          onClick={() => {
                            const newSteps = selectedElement.props.steps.filter((_: any, i: number) => i !== idx);
                            updateElement(selectedElement.id, { steps: newSteps });
                          }}
                          className="p-2 text-zinc-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors mt-1 opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => updateElement(selectedElement.id, { steps: [...selectedElement.props.steps, { title: 'Novo Passo', desc: 'Descrição do passo' }] })}
                      className="w-full py-2 border border-dashed border-black/10 text-zinc-500 rounded-xl text-sm font-medium hover:border-black/20 hover:text-zinc-900 hover:bg-black/5 transition-all flex items-center justify-center gap-2 mt-2"
                    >
                      <Plus className="w-4 h-4" /> Adicionar Passo
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
        </div>
      )}
    </div>
  );
}

// --- Subcomponents ---

function LayerTree({ elements, selectedId, setSelectedId, level = 0 }: { elements: ElementData[], selectedId: string | null, setSelectedId: (id: string) => void, level?: number }) {
  return (
    <div className="space-y-1">
      {elements.map(el => (
        <div key={el.id}>
          <div 
            onClick={() => setSelectedId(el.id)}
            className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer text-sm transition-all ${selectedId === el.id ? 'bg-blue-50 text-blue-600 font-medium border border-blue-100 shadow-sm' : 'hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 border border-transparent'}`}
            style={{ paddingLeft: `${level * 16 + 8}px` }}
          >
            <div className={`w-4 h-4 flex items-center justify-center ${selectedId === el.id ? 'text-blue-500' : 'text-zinc-400'}`}>
              {el.children && el.children.length > 0 ? <ChevronDown className="w-3 h-3" /> : <Minus className="w-3 h-3 opacity-50" />}
            </div>
            <span className="capitalize">{el.type.replace('_', ' ')}</span>
          </div>
          {el.children && el.children.length > 0 && (
            <LayerTree elements={el.children} selectedId={selectedId} setSelectedId={setSelectedId} level={level + 1} />
          )}
        </div>
      ))}
    </div>
  );
}

function WidgetCategory({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-3 px-1">{title}</h2>
      <div className="grid grid-cols-2 gap-2">
        {children}
      </div>
    </div>
  );
}

function DraggableWidget({ type, icon, label, onDragStart }: { type: ElementType, icon: React.ReactNode, label: string, onDragStart: (e: React.DragEvent, type: ElementType) => void }) {
  return (
    <div 
      draggable
      onDragStart={(e) => onDragStart(e, type)}
      className="flex flex-col items-center justify-center p-4 bg-white border border-black/5 hover:border-blue-500/30 hover:shadow-[0_4px_12px_rgba(59,130,246,0.08)] rounded-2xl cursor-grab active:cursor-grabbing transition-all group"
    >
      <div className="text-zinc-400 group-hover:text-blue-500 mb-2 transition-colors">
        {React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6' })}
      </div>
      <span className="text-[11px] font-semibold text-center leading-tight text-zinc-600 group-hover:text-zinc-900 transition-colors">{label}</span>
    </div>
  );
}

// --- Dynamic Renderer ---
export function RenderElement({ element, previewMode }: { element: ElementData, previewMode?: boolean, key?: React.Key }) {
  const { type, props } = element;

  // Animation Helper for specific elements
  const getAnimationProps = (animType: string) => {
    switch (animType) {
      case 'fade-up': return { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } };
      case 'scale': return { initial: { opacity: 0, scale: 0.8 }, whileInView: { opacity: 1, scale: 1 }, viewport: { once: true } };
      case 'pulse': return { animate: { scale: [1, 1.05, 1] }, transition: { repeat: Infinity, duration: 2 } };
      case 'bounce': return { animate: { y: [0, -10, 0] }, transition: { repeat: Infinity, duration: 1.5 } };
      default: return {};
    }
  };

  switch (type) {
    case 'heading':
      return (
        <motion.h2 
          {...getAnimationProps(props.animation || 'fade-up')}
          className={`${props.size} ${props.weight} tracking-tight`} 
          style={{ color: props.color, textAlign: props.align }}
        >
          {props.text}
        </motion.h2>
      );
    
    case 'paragraph':
      return (
        <motion.p 
          {...getAnimationProps(props.animation || 'fade-up')}
          className={`${props.size} leading-relaxed`} 
          style={{ color: props.color, textAlign: props.align }}
        >
          {props.text}
        </motion.p>
      );
    
    case 'button':
      return (
        <motion.button 
          {...getAnimationProps(props.animation || 'scale')}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          className={`px-8 py-4 font-bold ${props.radius} shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-md border border-black/5`}
          style={{ backgroundColor: props.bgColor, color: props.textColor }}
        >
          {props.text}
        </motion.button>
      );
    
    case 'image':
      return (
        <motion.div {...getAnimationProps(props.animation || 'fade-up')} className="relative group overflow-hidden" style={{ width: props.width }}>
          <motion.img 
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            src={props.url} 
            alt={props.alt || 'Imagem'} 
            className={`${props.radius} ${props.shadow} object-cover w-full h-full`}
          />
          <div className={`absolute inset-0 ring-1 ring-inset ring-black/10 ${props.radius} pointer-events-none`} />
        </motion.div>
      );
    
    case 'divider':
      return (
        <motion.div {...getAnimationProps('fade-up')} className="w-full flex justify-center py-8">
          <div style={{ width: '100%', borderTopWidth: `${props.thickness}px`, borderTopStyle: props.style, borderTopColor: props.color, opacity: 0.3 }} />
        </motion.div>
      );
    
    case 'grid':
      const gridColsCls = props.columns === '1' ? 'grid-cols-1' : props.columns === '2' ? 'grid-cols-1 md:grid-cols-2' : props.columns === '3' ? 'grid-cols-1 md:grid-cols-3' : props.columns === '4' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : props.columns === '5' ? 'grid-cols-1 md:grid-cols-5' : 'grid-cols-1 md:grid-cols-6';
      return (
        <div 
          className={`grid ${gridColsCls} ${props.radius}`}
          style={{ 
            gap: `${props.gap}px`, 
            padding: `${props.padding}px`,
            backgroundColor: props.bgColor 
          }}
        >
          {element.children?.map(child => (
            <RenderElement key={child.id} element={child} previewMode={previewMode} />
          ))}
        </div>
      );

    case 'container':
    case 'column':
      return (
        <div 
          className={`flex flex-col ${props.radius} ${props.shadow} h-full`}
          style={{ 
            padding: `${props.padding}px`,
            backgroundColor: props.bgColor,
            alignItems: props.align === 'center' ? 'center' : props.align === 'right' ? 'flex-end' : 'flex-start'
          }}
        >
          {element.children?.map(child => (
            <RenderElement key={child.id} element={child} previewMode={previewMode} />
          ))}
        </div>
      );

    case 'spacer':
      return <div style={{ height: `${props.height}px`, width: '100%' }} />;
    
    case 'video':
      // Basic check to ensure it's an embed URL if it's youtube
      const videoUrl = props.url.includes('watch?v=') ? props.url.replace('watch?v=', 'embed/') : props.url;
      return (
        <motion.div 
          {...getAnimationProps('fade-up')}
          className={`w-full aspect-video overflow-hidden ${props.radius} ${props.shadow} glass-panel border border-black/5 flex items-center justify-center relative group`}
        >
          {videoUrl ? (
            <iframe src={videoUrl} className="w-full h-full absolute inset-0" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-100/50 to-zinc-200/50 backdrop-blur-xl">
              <PlayCircle className="w-20 h-20 text-zinc-400 group-hover:text-zinc-600 transition-colors duration-300 group-hover:scale-110" />
            </div>
          )}
        </motion.div>
      );
    
    case 'card':
      return (
        <motion.div 
          {...getAnimationProps('fade-up')}
          whileHover={{ y: -5 }}
          className={`flex flex-col md:flex-row overflow-hidden ${props.radius} ${props.shadow} glass-panel border border-black/5 transition-all duration-500`} 
          style={{ backgroundColor: props.bgColor }}
        >
          <div className="md:w-2/5 h-64 md:h-auto relative overflow-hidden">
            <motion.img 
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.6 }}
              src={props.imageUrl} 
              alt={props.title} 
              className="w-full h-full object-cover" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent md:bg-gradient-to-r" />
          </div>
          <div className="p-8 md:p-10 md:w-3/5 flex flex-col justify-center relative z-10">
            <h3 className="text-3xl font-bold text-zinc-900 mb-4 tracking-tight">{props.title}</h3>
            <p className="text-zinc-600 mb-8 leading-relaxed text-lg">{props.description}</p>
            <div>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-3 bg-black/5 hover:bg-black/10 text-zinc-900 font-medium rounded-xl backdrop-blur-md border border-black/5 transition-colors"
              >
                {props.buttonText}
              </motion.button>
            </div>
          </div>
        </motion.div>
      );
    
    case 'stats':
      return (
        <motion.div 
          {...getAnimationProps('fade-up')}
          whileHover={{ scale: 1.02 }}
          className="flex flex-col items-center justify-center p-10 glass-panel rounded-[2rem] border border-black/5 shadow-lg relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <motion.div 
            initial={{ scale: 0.5, opacity: 0, y: 20 }}
            whileInView={{ scale: 1, opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            className="text-7xl font-black tracking-tighter mb-3 relative z-10 drop-shadow-sm"
            style={{ color: props.color }}
          >
            {props.value}<span className="text-4xl ml-1 opacity-80">{props.suffix}</span>
          </motion.div>
          <div className="text-zinc-500 font-bold uppercase tracking-widest text-sm relative z-10">{props.label}</div>
        </motion.div>
      );
    
    case 'accordion':
      // Note: In builder mode, we show it open or toggleable visually, but keep it simple for preview
      return (
        <motion.div 
          {...getAnimationProps('fade-up')}
          className="glass-panel border border-black/5 rounded-2xl overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md" 
          style={{ backgroundColor: props.bgColor }}
        >
          <div className="p-6 flex justify-between items-center bg-black/5 border-b border-black/5 cursor-pointer group">
            <h4 className="font-bold text-zinc-900 text-lg group-hover:text-blue-600 transition-colors">{props.title}</h4>
            <motion.div whileHover={{ rotate: 180 }} transition={{ duration: 0.3 }}>
              <ChevronDown className="w-5 h-5 text-zinc-400 group-hover:text-blue-600 transition-colors" />
            </motion.div>
          </div>
          <div className="p-6 text-zinc-600 leading-relaxed bg-white/50 backdrop-blur-md">
            {props.content}
          </div>
        </motion.div>
      );
    
    case 'animated_text':
      return (
        <motion.div {...getAnimationProps(props.animation || 'fade-up')} className="w-full">
          <h2 className={`${props.size} ${props.weight} tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 to-zinc-500`} style={{ textAlign: props.align }}>
            {props.text}
          </h2>
        </motion.div>
      );

    case 'marketing_hero':
      return (
        <div className="relative min-h-[600px] flex flex-col items-center justify-center text-center p-8 overflow-hidden" style={{ backgroundColor: '#000' }}>
          {/* Background Gradient */}
          <div className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(circle at 50% 50%, ${props.primaryColor || '#B45309'} 0%, transparent 70%)` }}></div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="relative z-10 max-w-4xl mx-auto"
          >
            {props.logoUrl && (
              <img src={props.logoUrl} alt="Logo" className="h-16 mx-auto mb-8" referrerPolicy="no-referrer" />
            )}
            <span className="inline-block px-4 py-1 rounded-full text-xs font-semibold tracking-widest uppercase mb-6" style={{ backgroundColor: props.primaryColor || '#B45309', color: '#fff' }}>
              {props.subtitle}
            </span>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 leading-tight">
              {props.title}
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-12 leading-relaxed">
              {props.description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-8 py-4 rounded-xl font-bold text-white transition-all hover:scale-105" style={{ background: `linear-gradient(to right, ${props.primaryColor || '#B45309'}, ${props.secondaryColor || '#D97706'})` }}>
                Garantir minha vaga
              </button>
            </div>
          </motion.div>
        </div>
      );

    case 'marketing_context':
      return (
        <div className="py-24 px-8" style={{ backgroundColor: '#0a0a0a' }}>
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}>
              <h2 className="text-4xl font-bold text-white mb-6">{props.title}</h2>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed">{props.description}</p>
              
              <div className="grid grid-cols-2 gap-6">
                {props.stats?.map((stat: any, i: number) => (
                  <div key={i} className="p-6 rounded-2xl border border-white/10 bg-white/5">
                    <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                    <div className="text-sm text-gray-500 uppercase tracking-wider">{stat.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} className="space-y-6">
              {props.challenges?.map((challenge: any, i: number) => (
                <div key={i} className="flex gap-4 p-6 rounded-2xl bg-white/5 border border-white/10">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#B45309' }}>
                    <AlertCircle className="text-white w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold mb-1">{challenge.title}</h4>
                    <p className="text-gray-400 text-sm">{challenge.desc}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      );

    case 'marketing_strategy':
      return (
        <div className="py-24 px-8" style={{ backgroundColor: '#000' }}>
          <div className="max-w-5xl mx-auto text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">{props.title}</h2>
          </div>
          
          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
            {props.steps?.map((step: any, i: number) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="relative p-8 rounded-3xl border border-white/10 bg-white/5 group hover:border-amber-600/50 transition-colors"
              >
                <div className="text-6xl font-black text-white/5 absolute top-4 right-8 group-hover:text-amber-600/10 transition-colors">
                  {step.letra}
                </div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6" style={{ backgroundColor: '#B45309' }}>
                  <span className="text-white font-bold">{i + 1}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-4">{step.titulo}</h3>
                <p className="text-gray-400 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      );

    case 'marketing_services':
      return (
        <div className="py-24 px-8" style={{ backgroundColor: '#0a0a0a' }}>
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-white mb-12 text-center">{props.title}</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {props.services?.map((service: any, i: number) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  className="p-8 rounded-3xl border border-white/10 bg-white/5 flex gap-6"
                >
                  <div className="text-4xl font-bold text-white/20">{service.num}</div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-3">{service.titulo}</h3>
                    <p className="text-gray-400 leading-relaxed">{service.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      );

    case 'marketing_pricing':
      return (
        <div className="py-24 px-8" style={{ backgroundColor: '#000' }}>
          <div className="max-w-4xl mx-auto p-12 rounded-[40px] border-2 border-amber-600/30 bg-gradient-to-br from-amber-900/20 to-black relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8">
              <div className="px-4 py-1 rounded-full bg-amber-600 text-white text-xs font-bold uppercase tracking-widest">
                Recomendado
              </div>
            </div>
            
            <div className="relative z-10">
              <h2 className="text-3xl font-bold text-white mb-8">{props.title}</h2>
              <div className="flex items-baseline gap-2 mb-12">
                <span className="text-gray-400 text-xl">R$</span>
                <span className="text-6xl font-bold text-white">{props.price}</span>
                <span className="text-gray-400">/mês</span>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6 mb-12">
                {props.items?.map((item: string, i: number) => (
                  <div key={i} className="flex items-center gap-3 text-gray-300">
                    <CheckCircle2 className="text-amber-600 w-5 h-5 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              
              <button className="w-full py-5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xl transition-all shadow-lg shadow-amber-600/20">
                Começar agora
              </button>
            </div>
          </div>
        </div>
      );

    case 'marketing_cta':
      return (
        <div className="py-24 px-8 text-center" style={{ backgroundColor: '#0a0a0a' }}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="max-w-3xl mx-auto"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              {props.title}
            </h2>
            <p className="text-xl text-gray-400 mb-12 leading-relaxed">
              {props.description}
            </p>
            <button className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-white text-black font-bold text-xl hover:bg-gray-200 transition-all group">
              {props.buttonText}
              <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>
      );

    case 'navbar':
      return (
        <motion.div 
          {...getAnimationProps('fade-up')}
          className="flex items-center justify-between py-5 px-8 glass-panel border-b border-black/5 backdrop-blur-2xl sticky top-0 z-50" 
          style={{ backgroundColor: props.bgColor }}
        >
          <div className="font-black text-2xl tracking-tighter" style={{ color: props.textColor }}>
            {props.logoText}
          </div>
          <div className="hidden md:flex items-center gap-8">
            {props.links.map((link: string, idx: number) => (
              <motion.a 
                whileHover={{ scale: 1.05 }}
                key={idx} 
                href="#" 
                className="text-sm font-semibold hover:text-blue-600 transition-colors" 
                style={{ color: props.textColor }}
              >
                {link}
              </motion.a>
            ))}
          </div>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-2.5 bg-zinc-900 text-white font-bold rounded-full shadow-md hover:shadow-lg transition-all"
          >
            {props.buttonText}
          </motion.button>
        </motion.div>
      );

    case 'slider':
      return (
        <motion.div 
          {...getAnimationProps('fade-up')}
          className="w-full relative group overflow-hidden rounded-[2rem] shadow-lg border border-black/5" 
          style={{ height: `${props.height}px` }}
        >
          <div className="flex w-full h-full overflow-x-auto snap-x snap-mandatory custom-scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {props.slides.map((slide: any, idx: number) => (
              <div key={idx} className="w-full h-full flex-shrink-0 snap-center relative">
                <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-12">
                  <motion.h3 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-5xl font-black text-white mb-4 tracking-tight drop-shadow-md"
                  >
                    {slide.title}
                  </motion.h3>
                  <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-xl text-white/80 max-w-2xl leading-relaxed drop-shadow-sm"
                  >
                    {slide.desc}
                  </motion.p>
                </div>
              </div>
            ))}
          </div>
          <div className="absolute bottom-6 left-0 w-full flex justify-center gap-3">
            {props.slides.map((_: any, idx: number) => (
              <div key={idx} className={`w-2.5 h-2.5 rounded-full transition-all duration-300 shadow-sm ${idx === 0 ? 'bg-white w-8' : 'bg-white/50 hover:bg-white/80'}`} />
            ))}
          </div>
        </motion.div>
      );

    case 'feature_grid':
      const gridCols = props.columns === '1' ? 'grid-cols-1' : props.columns === '2' ? 'grid-cols-1 md:grid-cols-2' : props.columns === '4' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-3';
      return (
        <motion.div 
          {...getAnimationProps('fade-up')}
          className={`grid ${gridCols} gap-8 py-12`} 
          style={{ backgroundColor: props.bgColor }}
        >
          {props.features.map((feature: any, idx: number) => (
            <motion.div 
              key={idx} 
              whileHover={{ y: -10 }}
              className="flex flex-col p-8 rounded-[2rem] glass-panel border border-black/5 hover:bg-white hover:border-black/10 hover:shadow-xl transition-all duration-500 group"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-blue-200 group-hover:scale-110 transition-transform duration-300">
                <Sparkles className="w-7 h-7" />
              </div>
              <h4 className="text-2xl font-bold text-zinc-900 mb-4 tracking-tight">{feature.title}</h4>
              <p className="text-zinc-500 leading-relaxed text-lg">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      );

    case 'gallery':
      const galCols = props.columns === '1' ? 'grid-cols-1' : props.columns === '2' ? 'grid-cols-2' : props.columns === '4' ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3';
      return (
        <motion.div 
          {...getAnimationProps('fade-up')}
          className={`grid ${galCols} py-8`} 
          style={{ gap: `${props.gap}px` }}
        >
          {props.images.map((img: string, idx: number) => (
            <motion.div 
              key={idx} 
              whileHover={{ scale: 1.02, zIndex: 10 }}
              className={`relative aspect-square overflow-hidden ${props.radius} shadow-sm group border border-black/5`}
            >
              <img src={img} alt={`Galeria ${idx}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-6">
                <div className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center border border-black/5 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                  <Maximize2 className="w-5 h-5 text-zinc-900" />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      );

    case 'funnel':
      return (
        <motion.div 
          {...getAnimationProps('fade-up')}
          className="flex flex-col items-center gap-4 w-full py-12"
        >
          {props.stages.map((stage: any, idx: number) => {
            const width = 100 - (idx * (50 / Math.max(1, props.stages.length - 1)));
            return (
              <motion.div 
                key={idx} 
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1, type: "spring" }}
                whileHover={{ scale: 1.02 }}
                className="flex items-center justify-between px-8 py-5 rounded-2xl text-white shadow-lg border border-black/5 backdrop-blur-md relative overflow-hidden group" 
                style={{ width: `${width}%`, backgroundColor: props.color, opacity: 1 - (idx * 0.1) }}
              >
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/20 transition-colors duration-300" />
                <span className="font-bold text-xl relative z-10">{stage.name}</span>
                <span className="font-black text-3xl tracking-tighter relative z-10">{stage.value}</span>
              </motion.div>
            );
          })}
        </motion.div>
      );

    case 'icon_list':
      return (
        <motion.ul 
          {...getAnimationProps('fade-up')}
          className="space-y-6 py-6"
        >
          {props.items.map((item: string, idx: number) => (
            <motion.li 
              key={idx} 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-start gap-4 p-4 rounded-2xl hover:bg-black/5 transition-colors border border-transparent hover:border-black/5"
            >
              <div className="p-2 rounded-xl bg-black/5 border border-black/5 shadow-sm">
                <CheckCircle2 className="w-6 h-6 shrink-0" style={{ color: props.iconColor }} />
              </div>
              <span className="text-xl font-medium pt-1" style={{ color: props.textColor }}>{item}</span>
            </motion.li>
          ))}
        </motion.ul>
      );

    case 'pricing':
      return (
        <motion.div 
          {...getAnimationProps('fade-up')}
          whileHover={{ y: -10 }}
          className="glass-panel border border-black/5 rounded-[2.5rem] p-10 shadow-lg max-w-sm mx-auto flex flex-col my-8 relative overflow-hidden group" 
          style={{ backgroundColor: props.bgColor }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <h3 className="text-3xl font-bold text-zinc-900 mb-4 text-center relative z-10 tracking-tight">{props.title}</h3>
          <div className="text-center mb-10 relative z-10">
            <span className="text-6xl font-black text-zinc-900 tracking-tighter drop-shadow-sm">{props.price}</span>
            <span className="text-zinc-500 font-medium ml-2 text-lg">{props.period}</span>
          </div>
          <ul className="space-y-5 mb-10 flex-1 relative z-10">
            {props.items.map((item: string, idx: number) => (
              <li key={idx} className="flex items-center gap-4">
                <div className="p-1 rounded-full bg-black/5">
                  <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: props.buttonColor }} />
                </div>
                <span className="text-zinc-600 font-medium text-lg">{item}</span>
              </li>
            ))}
          </ul>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-5 rounded-2xl font-bold text-white shadow-md mt-auto relative z-10 border border-black/10 backdrop-blur-md text-lg" 
            style={{ backgroundColor: props.buttonColor }}
          >
            {props.buttonText}
          </motion.button>
        </motion.div>
      );

    case 'testimonial':
      return (
        <motion.div 
          {...getAnimationProps('fade-up')}
          whileHover={{ scale: 1.02 }}
          className="p-10 md:p-12 rounded-[2.5rem] shadow-lg relative mt-10 glass-panel border border-black/5 group" 
          style={{ backgroundColor: props.bgColor }}
        >
          <div className="absolute -top-8 left-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md transform -rotate-6 group-hover:rotate-0 transition-transform duration-300">
            <Quote className="w-8 h-8 text-white" />
          </div>
          <p className="text-2xl md:text-3xl font-medium italic text-zinc-600 mb-10 relative z-10 leading-relaxed tracking-tight">
            "{props.quote}"
          </p>
          <div className="flex items-center gap-5">
            <img src={props.avatarUrl} alt={props.author} className="w-16 h-16 rounded-full object-cover shadow-sm border-2 border-white" />
            <div>
              <h5 className="font-bold text-zinc-900 text-xl">{props.author}</h5>
              <span className="text-zinc-500 font-medium">{props.role}</span>
            </div>
          </div>
        </motion.div>
      );

    case 'timeline':
      return (
        <motion.div 
          {...getAnimationProps('fade-up')}
          className="relative border-l-4 ml-4 md:ml-10 py-6 space-y-12" 
          style={{ borderColor: props.color }}
        >
          {props.steps.map((step: any, idx: number) => (
            <motion.div 
              key={idx} 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.2 }}
              className="relative pl-10 group"
            >
              <div 
                className="absolute -left-[14px] top-1.5 w-6 h-6 rounded-full border-4 border-white shadow-sm group-hover:scale-125 transition-transform duration-300" 
                style={{ backgroundColor: props.color }} 
              />
              <div className="glass-panel p-6 rounded-2xl border border-black/5 hover:border-black/10 transition-colors bg-white/50">
                <h4 className="text-2xl font-bold text-zinc-900 mb-3 tracking-tight">{step.title}</h4>
                <p className="text-zinc-600 leading-relaxed text-lg">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      );

    case 'countdown':
      return (
        <motion.div 
          {...getAnimationProps('fade-up')}
          className="flex flex-col items-center justify-center p-10 rounded-[2.5rem] shadow-lg glass-panel border border-black/5 relative overflow-hidden" 
          style={{ backgroundColor: props.bgColor }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent pointer-events-none" />
          <div className="flex gap-6 md:gap-10 text-center relative z-10">
            {['Dias', 'Horas', 'Minutos', 'Segundos'].map((label, i) => (
              <div key={label} className="flex flex-col items-center">
                <div className="w-20 h-24 md:w-28 md:h-32 rounded-2xl bg-white/80 backdrop-blur-md border border-black/5 flex items-center justify-center shadow-sm mb-3">
                  <span className="text-4xl md:text-6xl font-black font-mono tracking-tighter" style={{ color: props.color }}>
                    {['00', '23', '59', '59'][i]}
                  </span>
                </div>
                <span className="text-sm font-bold uppercase tracking-widest" style={{ color: props.labelColor }}>{label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      );

    case 'whatsapp_button':
      return (
        <motion.a 
          {...getAnimationProps('pulse')}
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
          href={props.link}
          target="_blank"
          rel="noopener noreferrer"
          className={`${previewMode ? 'fixed' : 'relative mx-auto'} z-50 flex items-center justify-center w-16 h-16 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 ${previewMode ? (props.position === 'bottom-right' ? 'bottom-8 right-8' : 'bottom-8 left-8') : ''} border border-black/5 backdrop-blur-md`}
          style={{ backgroundColor: props.bgColor }}
        >
          <MessageCircle className="w-8 h-8" style={{ color: props.iconColor }} />
        </motion.a>
      );

    case 'tabs':
      return (
        <motion.div 
          {...getAnimationProps('fade-up')}
          className="w-full rounded-3xl overflow-hidden shadow-lg glass-panel border border-black/5" 
          style={{ backgroundColor: props.bgColor }}
        >
          <div className="flex border-b border-black/5 bg-white/50 backdrop-blur-md overflow-x-auto custom-scrollbar-hide">
            {props.tabs.map((tab: any, idx: number) => (
              <motion.button 
                whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                key={idx}
                className={`flex-1 py-5 px-8 text-sm font-bold transition-all whitespace-nowrap ${idx === 0 ? 'text-zinc-900 border-b-2 border-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
                style={idx === 0 ? { color: props.activeColor, borderBottom: `2px solid ${props.activeColor}`, backgroundColor: 'rgba(0,0,0,0.02)' } : {}}
              >
                {tab.title}
              </motion.button>
            ))}
          </div>
          <div className="p-8 md:p-10 text-zinc-600 leading-relaxed text-lg bg-white/50">
            {props.tabs[0]?.content}
          </div>
        </motion.div>
      );

    case 'progress_bar':
      return (
        <motion.div {...getAnimationProps('fade-up')} className="w-full">
          <div className="flex justify-between text-sm font-bold mb-3">
            <span className="text-zinc-500 uppercase tracking-widest">{props.label}</span>
            <span style={{ color: props.color }} className="text-lg">{props.percentage}%</span>
          </div>
          <div className="w-full rounded-full overflow-hidden glass-panel border border-black/5 shadow-inner" style={{ backgroundColor: props.bgColor, height: `${props.height}px` }}>
            <motion.div 
              initial={{ width: 0 }}
              whileInView={{ width: `${props.percentage}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              viewport={{ once: true }}
              className="h-full rounded-full relative overflow-hidden" 
              style={{ backgroundColor: props.color }}
            >
              <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }} />
            </motion.div>
          </div>
        </motion.div>
      );

    case 'star_rating':
      return (
        <motion.div 
          {...getAnimationProps('fade-up')}
          className={`flex gap-2 justify-${props.align === 'left' ? 'start' : props.align === 'right' ? 'end' : 'center'}`}
        >
          {Array.from({ length: parseInt(props.maxStars) || 5 }).map((_, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1, type: "spring" }}
              whileHover={{ scale: 1.2, rotate: 15 }}
            >
              <Star 
                className={`${idx < parseInt(props.rating) ? 'fill-current drop-shadow-sm' : 'text-zinc-300'}`} 
                style={{ width: `${props.size}px`, height: `${props.size}px`, color: idx < parseInt(props.rating) ? props.color : undefined }} 
              />
            </motion.div>
          ))}
        </motion.div>
      );

    case 'google_map':
      return (
        <motion.div 
          {...getAnimationProps('fade-up')}
          className={`w-full overflow-hidden shadow-lg glass-panel border border-black/5 ${props.radius} p-2`} 
          style={{ height: `${props.height}px` }}
        >
          <iframe
            width="100%"
            height="100%"
            className={props.radius}
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://maps.google.com/maps?q=${encodeURIComponent(props.address)}&t=&z=${props.zoom}&ie=UTF8&iwloc=&output=embed`}
          ></iframe>
        </motion.div>
      );

    case 'comparison_table':
      return (
        <motion.div 
          {...getAnimationProps('fade-up')}
          className="w-full overflow-x-auto rounded-[2rem] shadow-lg glass-panel border border-black/5" 
          style={{ backgroundColor: props.bgColor }}
        >
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr>
                {props.headers.map((header: string, idx: number) => (
                  <th key={idx} className="p-6 border-b border-black/5 font-bold text-zinc-900 bg-white/80 backdrop-blur-md text-lg tracking-tight">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {props.rows.map((row: any, idx: number) => (
                <motion.tr 
                  key={idx} 
                  whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                  className="border-b border-black/5 last:border-0 transition-colors"
                >
                  <td className="p-6 font-medium text-zinc-600 text-lg">{row.feature}</td>
                  <td className="p-6 text-center bg-black/5">
                    {row.us ? <CheckCircle2 className="w-8 h-8 mx-auto drop-shadow-sm" style={{ color: props.color }} /> : <Minus className="w-8 h-8 mx-auto text-zinc-400" />}
                  </td>
                  <td className="p-6 text-center">
                    {row.them ? <CheckCircle2 className="w-8 h-8 mx-auto text-zinc-400" /> : <Minus className="w-8 h-8 mx-auto text-zinc-300" />}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      );

    case 'image_carousel':
      return (
        <motion.div 
          {...getAnimationProps('fade-up')}
          className={`w-full overflow-hidden shadow-lg relative group border border-black/5 ${props.radius}`} 
          style={{ height: `${props.height}px` }}
        >
          <motion.img 
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.7 }}
            src={props.images[0]} 
            alt="Carousel" 
            className="w-full h-full object-cover" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
          <div className="absolute inset-0 flex items-center justify-between p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="w-12 h-12 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center shadow-md border border-black/5 text-zinc-900 hover:bg-white transition-colors"><ChevronLeft className="w-6 h-6" /></motion.button>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="w-12 h-12 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center shadow-md border border-black/5 text-zinc-900 hover:bg-white transition-colors"><ChevronLeft className="w-6 h-6 rotate-180" /></motion.button>
          </div>
          <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-3">
            {props.images.map((_: any, idx: number) => (
              <div key={idx} className={`w-2.5 h-2.5 rounded-full shadow-sm transition-all duration-300 ${idx === 0 ? 'bg-white w-8' : 'bg-white/50 hover:bg-white/80'}`} />
            ))}
          </div>
        </motion.div>
      );

    case 'toast_notification':
      return (
        <AnimatePresence>
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`${previewMode ? 'fixed' : 'relative mx-auto'} z-50 flex items-center gap-4 p-5 rounded-2xl shadow-lg glass-panel border border-black/5 w-80 backdrop-blur-xl ${previewMode ? (props.position === 'bottom-left' ? 'bottom-8 left-8' : props.position === 'bottom-right' ? 'bottom-8 right-8' : props.position === 'top-left' ? 'top-8 left-8' : 'top-8 right-8') : ''}`}
            style={{ backgroundColor: props.bgColor, color: props.textColor }}
          >
            <img src={props.avatarUrl} alt={props.name} className="w-14 h-14 rounded-full object-cover shadow-sm border-2 border-white" />
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold truncate tracking-tight">{props.name}</p>
              <p className="text-sm opacity-90 truncate">{props.action}</p>
              <p className="text-xs opacity-60 mt-1 font-medium">{props.timeAgo}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      );

    default:
      return null;
  }
}
