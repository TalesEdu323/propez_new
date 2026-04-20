import React from 'react';
import {
  Type, Image as ImageIcon, MousePointerClick, AlignLeft,
  Minus, Maximize2, Youtube, Layout, BarChart, List, Sparkles,
  Filter, ListChecks, DollarSign,
  MessageSquareQuote, GitCommit,
  Navigation, GalleryHorizontal, Grid3X3, Columns,
  Box, Lock,
  Timer, MessageCircle, FolderOpen, Activity, Star, MapPin, Table, Images, Bell,
  LayoutTemplate,
  Layers,
} from 'lucide-react';
import type { BuilderElementType } from '../../types/builder';
import { getWidgetRequiredPlan, PLAN_META } from '../../lib/featureFlags';

function WidgetCategory({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-3 px-1">{title}</h2>
      <div className="grid grid-cols-2 gap-2">
        {children}
      </div>
    </div>
  );
}

function DraggableWidget({
  type,
  icon,
  label,
  onDragStart,
  locked,
  onLockedClick,
  requiredPlanName,
}: {
  type: BuilderElementType;
  icon: React.ReactNode;
  label: string;
  onDragStart: (e: React.DragEvent, type: BuilderElementType) => void;
  locked?: boolean;
  onLockedClick?: (type: BuilderElementType) => void;
  requiredPlanName?: string;
}) {
  if (locked) {
    return (
      <button
        type="button"
        onClick={() => onLockedClick?.(type)}
        title={requiredPlanName ? `Disponível no plano ${requiredPlanName}` : 'Disponível em plano superior'}
        className="relative flex flex-col items-center justify-center p-4 bg-zinc-50 border border-dashed border-zinc-200 rounded-2xl transition-all group opacity-80 hover:opacity-100 hover:border-amber-400/50"
      >
        <div className="text-zinc-300 group-hover:text-amber-500 mb-2 transition-colors">
          {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-6 h-6' })}
        </div>
        <span className="text-[11px] font-semibold text-center leading-tight text-zinc-400 group-hover:text-zinc-600 transition-colors">{label}</span>
        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center border border-amber-200">
          <Lock className="w-2.5 h-2.5" />
        </div>
      </button>
    );
  }

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, type)}
      className="flex flex-col items-center justify-center p-4 bg-white border border-black/5 hover:border-blue-500/30 hover:shadow-[0_4px_12px_rgba(59,130,246,0.08)] rounded-2xl cursor-grab active:cursor-grabbing transition-all group"
    >
      <div className="text-zinc-400 group-hover:text-blue-500 mb-2 transition-colors">
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-6 h-6' })}
      </div>
      <span className="text-[11px] font-semibold text-center leading-tight text-zinc-600 group-hover:text-zinc-900 transition-colors">{label}</span>
    </div>
  );
}

export interface BuilderWidgetPaletteProps {
  onDragStart: (e: React.DragEvent, type: BuilderElementType) => void;
  /** Conjunto de widgets que o usuário pode usar. Os demais aparecem com cadeado. */
  allowedWidgets?: ReadonlySet<BuilderElementType>;
  /** Handler chamado quando o usuário clica num widget travado. */
  onLockedWidgetClick?: (type: BuilderElementType) => void;
}

/**
 * Barra lateral esquerda do Builder com o catálogo de widgets disponíveis
 * para arrastar até o canvas. Puramente apresentacional — recebe apenas
 * o handler de `onDragStart` por props.
 */
export function BuilderWidgetPalette({ onDragStart, allowedWidgets, onLockedWidgetClick }: BuilderWidgetPaletteProps) {
  const isLocked = (type: BuilderElementType) => !!allowedWidgets && !allowedWidgets.has(type);
  const widgetProps = (type: BuilderElementType) => {
    const locked = isLocked(type);
    if (!locked) return { onDragStart };
    const required = getWidgetRequiredPlan(type);
    return {
      onDragStart,
      locked: true,
      onLockedClick: onLockedWidgetClick,
      requiredPlanName: PLAN_META[required].name,
    };
  };

  return (
    <div className="w-[300px] glass-panel flex flex-col border-r border-black/5 z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all">
      <div className="p-5 border-b border-black/5 flex items-center gap-3 bg-white/50">
        <div className="w-8 h-8 rounded-xl bg-zinc-900 flex items-center justify-center shadow-sm">
          <LayoutTemplate className="w-4 h-4 text-white" />
        </div>
        <h1 className="font-semibold text-zinc-900 tracking-tight">Taggo Builder</h1>
      </div>

      <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
        <WidgetCategory title="Marketing Premium">
          <DraggableWidget type="marketing_hero" icon={<Sparkles />} label="Marketing Hero" {...widgetProps('marketing_hero')} />
          <DraggableWidget type="marketing_context" icon={<Layout />} label="Contexto" {...widgetProps('marketing_context')} />
          <DraggableWidget type="marketing_strategy" icon={<Layers />} label="Estratégia" {...widgetProps('marketing_strategy')} />
          <DraggableWidget type="marketing_services" icon={<List />} label="Serviços" {...widgetProps('marketing_services')} />
          <DraggableWidget type="marketing_pricing" icon={<DollarSign />} label="Preço" {...widgetProps('marketing_pricing')} />
          <DraggableWidget type="marketing_cta" icon={<MessageCircle />} label="CTA" {...widgetProps('marketing_cta')} />
        </WidgetCategory>

        <WidgetCategory title="Layout & Navegação">
          <DraggableWidget type="navbar" icon={<Navigation />} label="Menu (Navbar)" {...widgetProps('navbar')} />
          <DraggableWidget type="feature_grid" icon={<Columns />} label="Grid de Colunas" {...widgetProps('feature_grid')} />
          <DraggableWidget type="gallery" icon={<Grid3X3 />} label="Galeria" {...widgetProps('gallery')} />
          <DraggableWidget type="slider" icon={<GalleryHorizontal />} label="Slider" {...widgetProps('slider')} />
        </WidgetCategory>

        <WidgetCategory title="Básicos">
          <DraggableWidget type="heading" icon={<Type />} label="Título" {...widgetProps('heading')} />
          <DraggableWidget type="paragraph" icon={<AlignLeft />} label="Texto" {...widgetProps('paragraph')} />
          <DraggableWidget type="button" icon={<MousePointerClick />} label="Botão" {...widgetProps('button')} />
          <DraggableWidget type="image" icon={<ImageIcon />} label="Imagem" {...widgetProps('image')} />
        </WidgetCategory>

        <WidgetCategory title="Estrutura & Mídia">
          <DraggableWidget type="grid" icon={<Grid3X3 />} label="Grid / Seção" {...widgetProps('grid')} />
          <DraggableWidget type="container" icon={<Box />} label="Contêiner" {...widgetProps('container')} />
          <DraggableWidget type="divider" icon={<Minus />} label="Divisor" {...widgetProps('divider')} />
          <DraggableWidget type="spacer" icon={<Maximize2 />} label="Espaço" {...widgetProps('spacer')} />
          <DraggableWidget type="video" icon={<Youtube />} label="Vídeo" {...widgetProps('video')} />
          <DraggableWidget type="card" icon={<Layout />} label="Cartão" {...widgetProps('card')} />
        </WidgetCategory>

        <WidgetCategory title="Avançados & Conversão">
          <DraggableWidget type="funnel" icon={<Filter />} label="Funil" {...widgetProps('funnel')} />
          <DraggableWidget type="pricing" icon={<DollarSign />} label="Preço" {...widgetProps('pricing')} />
          <DraggableWidget type="icon_list" icon={<ListChecks />} label="Lista de Ícones" {...widgetProps('icon_list')} />
          <DraggableWidget type="timeline" icon={<GitCommit />} label="Linha do Tempo" {...widgetProps('timeline')} />
          <DraggableWidget type="testimonial" icon={<MessageSquareQuote />} label="Depoimento" {...widgetProps('testimonial')} />
          <DraggableWidget type="countdown" icon={<Timer />} label="Contador" {...widgetProps('countdown')} />
          <DraggableWidget type="whatsapp_button" icon={<MessageCircle />} label="WhatsApp" {...widgetProps('whatsapp_button')} />
          <DraggableWidget type="toast_notification" icon={<Bell />} label="Notificação" {...widgetProps('toast_notification')} />
        </WidgetCategory>

        <WidgetCategory title="Interativos & Animados">
          <DraggableWidget type="stats" icon={<BarChart />} label="Estatística" {...widgetProps('stats')} />
          <DraggableWidget type="accordion" icon={<List />} label="Sanfona (FAQ)" {...widgetProps('accordion')} />
          <DraggableWidget type="tabs" icon={<FolderOpen />} label="Abas" {...widgetProps('tabs')} />
          <DraggableWidget type="progress_bar" icon={<Activity />} label="Progresso" {...widgetProps('progress_bar')} />
          <DraggableWidget type="star_rating" icon={<Star />} label="Avaliação" {...widgetProps('star_rating')} />
          <DraggableWidget type="google_map" icon={<MapPin />} label="Mapa" {...widgetProps('google_map')} />
          <DraggableWidget type="comparison_table" icon={<Table />} label="Comparação" {...widgetProps('comparison_table')} />
          <DraggableWidget type="image_carousel" icon={<Images />} label="Carrossel" {...widgetProps('image_carousel')} />
          <DraggableWidget type="animated_text" icon={<Sparkles className="text-yellow-400" />} label="Texto Animado" {...widgetProps('animated_text')} />
        </WidgetCategory>

        <p className="text-xs text-zinc-500 mt-8 text-center px-4">
          Arraste os elementos para a área central para construir sua página.
        </p>
      </div>
    </div>
  );
}
