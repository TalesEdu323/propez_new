import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  Maximize2, PlayCircle, Star
} from 'lucide-react';
import type { BuilderElement, BuilderPageLayout, BuilderViewport } from '../../types/builder';
import { TabsElement } from './TabsElement';
import { BuilderIcon } from './icons/BuilderIcon';
import { normalizeIconItems } from './icons/normalizeIconItem';
import { DEFAULT_LIST_ICON } from './icons/iconCatalog';
import { featureGridColsClass, gridColsClass } from './gridUtils';
import { resolvePagePadding } from './pageLayoutUtils';
import { ProjectionCalculator } from './widgets/ProjectionCalculator';
import { MetricsTable } from './widgets/MetricsTable';
import { AccordionWidget } from './widgets/AccordionWidget';
import { CountdownWidget } from './widgets/CountdownWidget';
import { ImageCarouselWidget } from './widgets/ImageCarouselWidget';
import { SliderWidget } from './widgets/SliderWidget';
import {
  normalizeStatsItems,
  normalizeAccordionItems,
  normalizeStrategySteps,
  normalizeComparisonTable,
  normalizeContextDescription,
  normalizeHeroCopy,
} from './propUtils';
import { resolveThemeColors } from '../../lib/proposalTheme';
import { isSafeImageUrl, pickSafeImageUrl } from './imageUrlUtils';

function SectionLabel({
  label,
  accent,
}: {
  label?: unknown;
  accent: string;
}) {
  const text = typeof label === 'string' ? label.trim() : '';
  if (!text) return null;
  return (
    <span
      className="inline-block text-xs font-semibold uppercase tracking-widest mb-4"
      style={{ color: accent }}
    >
      {text}
    </span>
  );
}

function ImagePlaceholder({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-gradient-to-br from-zinc-100 to-zinc-200 ${className}`}
      aria-hidden
    />
  );
}

function SafeImg({
  src,
  alt,
  className,
  ...rest
}: React.ImgHTMLAttributes<HTMLImageElement> & { src: unknown }) {
  const safeSrc = isSafeImageUrl(src) ? src : undefined;
  if (!safeSrc) {
    return <ImagePlaceholder className={className} />;
  }
  return <img src={safeSrc} alt={alt ?? ''} className={className} referrerPolicy="no-referrer" {...rest} />;
}

export type ProposalActionHandler = (action: 'approve') => void;

export type ProposalDecision = 'pending' | 'approved' | 'rejected';

function resolveProposalAction(
  elType: string,
  props: Record<string, unknown>,
): 'approve' | 'none' {
  if (props.proposalAction === 'none') return 'none';
  if (props.proposalAction === 'approve') return 'approve';
  if (['button', 'marketing_cta', 'pricing', 'card', 'marketing_hero', 'marketing_pricing'].includes(elType)) return 'approve';
  return 'none';
}

function shouldRenderApproveCta(
  elType: string,
  props: Record<string, unknown>,
  proposalDecision?: ProposalDecision,
): boolean {
  if (proposalDecision !== 'approved') return true;
  return resolveProposalAction(elType, props) !== 'approve';
}

function proposalClickProps(
  elType: string,
  props: Record<string, unknown>,
  previewMode: boolean | undefined,
  onProposalAction?: ProposalActionHandler,
): { onClick?: (e: React.MouseEvent) => void; type?: 'button' } {
  if (!previewMode || !onProposalAction) return {};
  if (resolveProposalAction(elType, props) !== 'approve') return {};
  return {
    type: 'button' as const,
    onClick: (e: React.MouseEvent) => {
      e.preventDefault();
      onProposalAction('approve');
    },
  };
}

// --- Dynamic Renderer ---
export function RenderElement({
  element,
  previewMode,
  allowInteraction,
  onProposalAction,
  proposalDecision,
  viewport = 'desktop',
  pageLayout,
}: {
  element: ElementData;
  previewMode?: boolean;
  allowInteraction?: boolean;
  onProposalAction?: ProposalActionHandler;
  proposalDecision?: ProposalDecision;
  viewport?: BuilderViewport;
  pageLayout?: BuilderPageLayout | null;
  key?: React.Key;
}) {
  const { type, props } = element;
  const childRenderProps = { previewMode, allowInteraction, onProposalAction, proposalDecision, viewport, pageLayout };
  const contentPad = pageLayout?.widthMode === 'boxed' ? resolvePagePadding(pageLayout) : undefined;
  const theme = resolveThemeColors(pageLayout);
  const isInteractive = previewMode || allowInteraction;

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
      if (!shouldRenderApproveCta('button', props, proposalDecision)) return null;
      return (
        <motion.button
          {...getAnimationProps(props.animation || 'scale')}
          {...proposalClickProps('button', props, previewMode, onProposalAction)}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          className={`px-8 py-4 font-bold ${props.radius} shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-md border border-black/5`}
          style={{ backgroundColor: props.bgColor, color: props.textColor }}
        >
          {props.text}
        </motion.button>
      );

    case 'logo': {
      const logoSrc = (props.logoUrl as string) || theme.logoUrl;
      const align = props.align === 'left' ? 'justify-start' : props.align === 'right' ? 'justify-end' : 'justify-center';
      return (
        <motion.div {...getAnimationProps('fade-up')} className={`flex ${align} py-4`}>
          {props.mode === 'image' && pickSafeImageUrl(logoSrc) ? (
            <SafeImg
              src={logoSrc}
              alt={String(props.logoText ?? 'Logo')}
              style={{ height: `${props.height ?? 48}px` }}
              className="object-contain"
            />
          ) : (
            <span
              className="font-black tracking-tighter"
              style={{ color: props.textColor as string, fontSize: `${Math.max(20, parseInt(String(props.height ?? 48), 10) * 0.6)}px` }}
            >
              {props.logoText}
            </span>
          )}
        </motion.div>
      );
    }

    case 'image': {
      const imageSrc = pickSafeImageUrl(props.url);
      return (
        <motion.div {...getAnimationProps(props.animation || 'fade-up')} className="relative group overflow-hidden" style={{ width: props.width }}>
          {imageSrc ? (
            <motion.img
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              src={imageSrc}
              alt={props.alt || 'Imagem'}
              className={`${props.radius} ${props.shadow} object-cover w-full h-full`}
            />
          ) : (
            <ImagePlaceholder className={`${props.radius} w-full h-48 min-h-[12rem]`} />
          )}
          <div className={`absolute inset-0 ring-1 ring-inset ring-black/10 ${props.radius} pointer-events-none`} />
        </motion.div>
      );
    }

    case 'divider': {
      const dividerMargin = parseInt(String(props.margin ?? '32'), 10);
      return (
        <motion.div
          {...getAnimationProps('fade-up')}
          className="w-full flex justify-center"
          style={{ paddingTop: dividerMargin, paddingBottom: dividerMargin }}
        >
          <div style={{ width: '100%', borderTopWidth: `${props.thickness}px`, borderTopStyle: props.style, borderTopColor: props.color, opacity: 0.3 }} />
        </motion.div>
      );
    }

    case 'grid':
      return (
        <div
          className={`grid ${gridColsClass(String(props.columns), viewport)} ${props.radius}`}
          style={{
            gap: `${props.gap}px`,
            padding: `${props.padding}px`,
            margin: props.margin && props.margin !== '0' ? `${props.margin}px` : undefined,
            backgroundColor: props.bgColor
          }}
        >
          {element.children?.map(child => (
            <RenderElement key={child.id} element={child} {...childRenderProps} />
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
            margin: props.margin && props.margin !== '0' ? `${props.margin}px` : undefined,
            backgroundColor: props.bgColor,
            alignItems: props.align === 'center' ? 'center' : props.align === 'right' ? 'flex-end' : 'flex-start'
          }}
        >
          {element.children?.map(child => (
            <RenderElement key={child.id} element={child} {...childRenderProps} />
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
            {pickSafeImageUrl(props.imageUrl) ? (
              <motion.img
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.6 }}
                src={pickSafeImageUrl(props.imageUrl)}
                alt={props.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <ImagePlaceholder className="w-full h-full min-h-[16rem]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent md:bg-gradient-to-r" />
          </div>
          <div className="p-8 md:p-10 md:w-3/5 flex flex-col justify-center relative z-10">
            <h3 className="text-3xl font-bold text-zinc-900 mb-4 tracking-tight">{props.title}</h3>
            <p className="text-zinc-600 mb-8 leading-relaxed text-lg">{props.description}</p>
            {shouldRenderApproveCta('card', props, proposalDecision) && (
            <div>
              <motion.button
                {...proposalClickProps('card', props, previewMode, onProposalAction)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-3 bg-black/5 hover:bg-black/10 text-zinc-900 font-medium rounded-xl backdrop-blur-md border border-black/5 transition-colors"
              >
                {props.buttonText}
              </motion.button>
            </div>
            )}
          </div>
        </motion.div>
      );

    case 'stats': {
      const statItems = normalizeStatsItems(props);
      const cols = statItems.length <= 1 ? 'grid-cols-1' : statItems.length === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3';
      const darkBg = props.bgColor === '#0a0a0a' || props.textColor === '#ffffff';
      return (
        <motion.div
          {...getAnimationProps('fade-up')}
          className={`grid ${cols} gap-6 py-8 w-full rounded-[2rem] ${props.bgColor ? 'p-8' : ''}`}
          style={{ backgroundColor: props.bgColor as string | undefined }}
        >
          {statItems.map((stat, idx) => (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.02 }}
              className="flex flex-col items-center justify-center p-8 glass-panel rounded-[2rem] border border-black/5 shadow-lg relative overflow-hidden group"
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0, y: 20 }}
                whileInView={{ scale: 1, opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                className="text-5xl md:text-6xl font-black tracking-tighter mb-3 relative z-10 drop-shadow-sm"
                style={{ color: stat.color }}
              >
                {stat.value}
                {stat.suffix && <span className="text-2xl md:text-3xl ml-1 opacity-80">{stat.suffix}</span>}
              </motion.div>
              <div className={`font-bold uppercase tracking-widest text-sm relative z-10 ${darkBg ? 'text-gray-400' : 'text-zinc-500'}`}>
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
      );
    }

    case 'accordion':
      return (
        <motion.div {...getAnimationProps('fade-up')} className="w-full">
          <AccordionWidget
            items={normalizeAccordionItems(props)}
            bgColor={props.bgColor as string}
            interactive={isInteractive}
          />
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

    case 'marketing_hero': {
      const hero = normalizeHeroCopy(props);
      const primary = (props.primaryColor as string) || theme.primaryColor;
      const secondary = (props.secondaryColor as string) || theme.secondaryColor;
      const logoSrc = (props.logoUrl as string) || theme.logoUrl;
      const bgImage = pickSafeImageUrl(props.backgroundImageUrl as string | undefined);
      const secondaryText = String(props.secondaryButtonText ?? '').trim();
      const secondaryAction = resolveProposalAction('marketing_hero', {
        ...props,
        proposalAction: props.secondaryButtonAction ?? 'none',
      });
      return (
        <div className="relative min-h-[600px] flex flex-col items-center justify-center text-center p-8 overflow-hidden" style={{ backgroundColor: '#000' }}>
          {bgImage ? (
            <>
              <SafeImg
                src={bgImage}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
              {props.dotOverlay ? <div className="propez-hero-dot-overlay" /> : null}
              <div className="absolute inset-0 bg-black/55" />
            </>
          ) : props.dotOverlay ? (
            <div className="propez-hero-dot-overlay" />
          ) : null}
          <div className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(circle at 50% 50%, ${primary} 0%, transparent 70%)` }} />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="relative z-10 max-w-4xl mx-auto"
          >
            {pickSafeImageUrl(logoSrc) && (
              <SafeImg src={logoSrc} alt="Logo" className="h-16 mx-auto mb-8 object-contain" />
            )}
            {hero.badge && (
              <span className="inline-block px-4 py-1 rounded-full text-xs font-semibold tracking-widest uppercase mb-6" style={{ backgroundColor: primary, color: '#fff' }}>
                {hero.badge}
              </span>
            )}
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 leading-tight whitespace-pre-line">{hero.title}</h1>
            {hero.description && (
              <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-12 leading-relaxed whitespace-pre-line">{hero.description}</p>
            )}
            {(shouldRenderApproveCta('marketing_hero', props, proposalDecision) ||
              (secondaryText && shouldRenderApproveCta('marketing_hero', { ...props, proposalAction: props.secondaryButtonAction ?? 'none' }, proposalDecision))) && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {shouldRenderApproveCta('marketing_hero', props, proposalDecision) && (
              <button
                {...proposalClickProps('marketing_hero', props, previewMode, onProposalAction)}
                className="px-8 py-4 rounded-xl font-bold text-white transition-all hover:scale-105"
                style={{ background: `linear-gradient(to right, ${primary}, ${secondary})` }}
              >
                {hero.buttonText}
              </button>
              )}
              {secondaryText && shouldRenderApproveCta('marketing_hero', { ...props, proposalAction: props.secondaryButtonAction ?? 'none' }, proposalDecision) ? (
                <button
                  {...(secondaryAction === 'approve'
                    ? proposalClickProps('marketing_hero', { ...props, proposalAction: 'approve' }, previewMode, onProposalAction)
                    : { type: 'button' as const })}
                  className="px-8 py-4 rounded-xl font-bold text-white border border-white/30 bg-white/10 backdrop-blur transition-all hover:scale-105 hover:bg-white/20"
                >
                  {secondaryText}
                </button>
              ) : null}
            </div>
            )}
          </motion.div>
        </div>
      );
    }

    case 'marketing_context': {
      const description = normalizeContextDescription(props);
      const accent = theme.primaryColor;
      return (
        <div className="py-24" style={{ backgroundColor: '#0a0a0a', paddingLeft: contentPad, paddingRight: contentPad }}>
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center w-full">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}>
              <SectionLabel label={props.sectionLabel} accent={accent} />
              <h2 className="text-4xl font-bold text-white mb-6">{props.title}</h2>
              {description && (
                <p className="text-gray-400 text-lg mb-8 leading-relaxed whitespace-pre-line">{description}</p>
              )}
              <div className="grid grid-cols-2 gap-6">
                {props.stats?.map((stat: { value: string; label: string }, i: number) => (
                  <div key={i} className="p-6 rounded-2xl border border-white/10 bg-white/5">
                    <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                    <div className="text-sm text-gray-500 uppercase tracking-wider">{stat.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} className="space-y-6">
              {props.challenges?.map((challenge: { title: string; desc: string; icon?: string }, i: number) => (
                <div key={i} className="flex gap-4 p-6 rounded-2xl bg-white/5 border border-white/10">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: accent }}>
                    <BuilderIcon name={challenge.icon ?? 'AlertCircle'} className="text-white w-6 h-6" />
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
    }

    case 'marketing_strategy': {
      const steps = normalizeStrategySteps(props.steps ?? []);
      const accent = theme.primaryColor;
      return (
        <div className="py-24 px-8" style={{ backgroundColor: '#000' }}>
          <div className="max-w-5xl mx-auto text-center mb-16">
            <SectionLabel label={props.sectionLabel} accent={accent} />
            <h2 className="text-4xl font-bold text-white mb-4">{props.title}</h2>
          </div>
          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
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
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6" style={{ backgroundColor: accent }}>
                  <span className="text-white font-bold">{i + 1}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-4">{step.titulo}</h3>
                <p className="text-gray-400 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      );
    }

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
              <SectionLabel label={props.sectionLabel} accent="#f59e0b" />
              <h2 className="text-3xl font-bold text-white mb-8">{props.title}</h2>
              <div className="flex items-baseline gap-2 mb-12">
                <span className="text-gray-400 text-xl">R$</span>
                <span className="text-6xl font-bold text-white">{props.price}</span>
                <span className="text-gray-400">/mês</span>
              </div>
              <div className="grid md:grid-cols-2 gap-6 mb-12">
                {normalizeIconItems(props.items, (props.listIcon as string) ?? DEFAULT_LIST_ICON).map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-gray-300">
                    <BuilderIcon name={item.icon} className="text-amber-600 w-5 h-5 shrink-0" />
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
              {shouldRenderApproveCta('marketing_pricing', props, proposalDecision) && (
              <button
                {...proposalClickProps('marketing_pricing', props, previewMode, onProposalAction)}
                className="w-full py-5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xl transition-all shadow-lg shadow-amber-600/20"
              >
                {props.buttonText ?? 'Aprovar proposta'}
              </button>
              )}
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
            <SectionLabel label={props.sectionLabel} accent={theme.primaryColor} />
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              {props.title}
            </h2>
            <p className="text-xl text-gray-400 mb-12 leading-relaxed">
              {props.description}
            </p>
            {shouldRenderApproveCta('marketing_cta', props, proposalDecision) && (
            <button
              {...proposalClickProps('marketing_cta', props, previewMode, onProposalAction)}
              className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-white text-black font-bold text-xl hover:bg-gray-200 transition-all group"
            >
              {props.buttonText}
              <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
            )}
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
          <div className="flex items-center gap-3">
            {pickSafeImageUrl(props.logoUrl) || pickSafeImageUrl(theme.logoUrl) ? (
              <SafeImg
                src={pickSafeImageUrl(props.logoUrl) ?? pickSafeImageUrl(theme.logoUrl)}
                alt={String(props.logoText ?? 'Logo')}
                className="h-8 max-w-[140px] object-contain"
              />
            ) : (
              <div className="font-black text-2xl tracking-tighter" style={{ color: props.textColor }}>
                {props.logoText}
              </div>
            )}
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
          {shouldRenderApproveCta('navbar', props, proposalDecision) && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            {...proposalClickProps('navbar', props, previewMode, onProposalAction)}
            className="px-6 py-2.5 bg-zinc-900 text-white font-bold rounded-full shadow-md hover:shadow-lg transition-all"
          >
            {props.buttonText}
          </motion.button>
          )}
        </motion.div>
      );

    case 'slider':
      return (
        <motion.div {...getAnimationProps('fade-up')} className="w-full">
          <SliderWidget
            slides={props.slides ?? []}
            height={String(props.height ?? '400')}
            interactive={isInteractive}
          />
        </motion.div>
      );

    case 'feature_grid': {
      const features = props.features ?? props.items ?? [];
      return (
        <motion.div
          {...getAnimationProps('fade-up')}
          className={`grid ${featureGridColsClass(String(props.columns ?? '3'), viewport)} gap-8 py-12`}
          style={{ backgroundColor: props.bgColor }}
        >
          {features.map((feature: any, idx: number) => (
            <motion.div
              key={idx}
              whileHover={{ y: -10 }}
              className="flex flex-col p-8 rounded-[2rem] glass-panel border border-black/5 hover:bg-white hover:border-black/10 hover:shadow-xl transition-all duration-500 group"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-blue-200 group-hover:scale-110 transition-transform duration-300">
                <BuilderIcon name={feature.icon ?? 'Sparkles'} className="w-7 h-7" />
              </div>
              <h4 className="text-2xl font-bold text-zinc-900 mb-4 tracking-tight">{feature.title}</h4>
              <p className="text-zinc-500 leading-relaxed text-lg">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      );
    }

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
              <SafeImg src={img} alt={`Galeria ${idx}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
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
          className="flex flex-col items-center gap-4 w-full py-12 px-8"
        >
          <SectionLabel label={props.sectionLabel} accent={theme.primaryColor} />
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

    case 'icon_list': {
      const listIcon = (props.listIcon as string) ?? DEFAULT_LIST_ICON;
      const items = normalizeIconItems(props.items, listIcon);
      return (
        <motion.ul
          {...getAnimationProps('fade-up')}
          className="space-y-6 py-6"
        >
          {items.map((item, idx: number) => (
            <motion.li
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-start gap-4 p-4 rounded-2xl hover:bg-black/5 transition-colors border border-transparent hover:border-black/5"
            >
              <div className="p-2 rounded-xl bg-black/5 border border-black/5 shadow-sm">
                <BuilderIcon name={item.icon} className="w-6 h-6 shrink-0" style={{ color: props.iconColor as string }} />
              </div>
              <span className="text-xl font-medium pt-1" style={{ color: props.textColor as string }}>{item.text}</span>
            </motion.li>
          ))}
        </motion.ul>
      );
    }

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
            {normalizeIconItems(props.items, (props.listIcon as string) ?? DEFAULT_LIST_ICON).map((item, idx: number) => (
              <li key={idx} className="flex items-center gap-4">
                <div className="p-1 rounded-full bg-black/5">
                  <BuilderIcon name={item.icon} className="w-5 h-5 shrink-0" style={{ color: props.buttonColor as string }} />
                </div>
                <span className="text-zinc-600 font-medium text-lg">{item.text}</span>
              </li>
            ))}
          </ul>
          {shouldRenderApproveCta('pricing', props, proposalDecision) && (
          <motion.button
            {...proposalClickProps('pricing', props, previewMode, onProposalAction)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-5 rounded-2xl font-bold text-white shadow-md mt-auto relative z-10 border border-black/10 backdrop-blur-md text-lg"
            style={{ backgroundColor: props.buttonColor }}
          >
            {props.buttonText}
          </motion.button>
          )}
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
            <BuilderIcon name={(props.quoteIcon as string) ?? 'Quote'} className="w-8 h-8 text-white" />
          </div>
          <p className="text-2xl md:text-3xl font-medium italic text-zinc-600 mb-10 relative z-10 leading-relaxed tracking-tight">
            "{props.quote}"
          </p>
          <div className="flex items-center gap-5">
            <SafeImg src={props.avatarUrl} alt={props.author} className="w-16 h-16 rounded-full object-cover shadow-sm border-2 border-white" />
            <div>
              <h5 className="font-bold text-zinc-900 text-xl">{props.author}</h5>
              <span className="text-zinc-500 font-medium">{props.role}</span>
            </div>
          </div>
        </motion.div>
      );

    case 'timeline': {
      const timelineSteps = props.steps ?? props.items ?? [];
      return (
        <motion.div
          {...getAnimationProps('fade-up')}
          className="relative border-l-4 ml-4 md:ml-10 py-6 space-y-12"
          style={{ borderColor: props.color }}
        >
          {timelineSteps.map((step: any, idx: number) => (
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
    }

    case 'countdown':
      return (
        <CountdownWidget
          targetDate={String(props.targetDate ?? new Date(Date.now() + 86400000).toISOString().split('T')[0])}
          targetTime={String(props.targetTime ?? '23:59')}
          color={props.color as string}
          bgColor={props.bgColor as string}
          labelColor={props.labelColor as string}
          expiredText={String(props.expiredText ?? 'Oferta Encerrada!')}
        />
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
          <BuilderIcon name={(props.icon as string) ?? 'MessageCircle'} className="w-8 h-8" style={{ color: props.iconColor as string }} />
        </motion.a>
      );

    case 'tabs':
      return (
        <motion.div {...getAnimationProps('fade-up')} className="w-full px-8 py-6">
          <SectionLabel label={props.sectionLabel} accent={theme.primaryColor} />
          <TabsElement
            tabs={props.tabs ?? []}
            activeColor={props.activeColor as string | undefined}
            bgColor={props.bgColor as string | undefined}
          />
        </motion.div>
      );

    case 'service_stack': {
      const previewLabels = Array.isArray(props.previewLabels)
        ? (props.previewLabels as string[]).filter((l) => typeof l === 'string' && l.trim())
        : [];
      const showSyntheticPreview = previewMode && previewLabels.length > 0;

      return (
        <motion.div
          {...getAnimationProps('fade-up')}
          className={`w-full py-12 px-8 rounded-3xl border-2 border-dashed ${
            showSyntheticPreview ? 'border-zinc-300 bg-white/90' : 'border-zinc-200 bg-zinc-50/80'
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2 text-center">
            Seção de serviços
          </p>
          <h3 className="text-xl font-semibold text-zinc-800 mb-4 text-center">
            {props.title ?? 'Serviços da proposta'}
          </h3>

          {showSyntheticPreview ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-4">
              {previewLabels.map((label, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-left shadow-sm"
                >
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    Serviço {i + 1}
                  </span>
                  <p className="text-sm font-semibold text-zinc-800 mt-2">{label}</p>
                  <p className="text-xs text-zinc-500 mt-2">Prévia — conteúdo real dos serviços no passo 1.</p>
                </div>
              ))}
            </div>
          ) : null}

          <p className="text-sm text-zinc-500 max-w-lg mx-auto text-center">
            {props.hint ?? 'Selecione serviços no modelo para preencher esta área automaticamente.'}
          </p>
        </motion.div>
      );
    }

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

    case 'comparison_table': {
      const { headers, rows } = normalizeComparisonTable(props);
      const isTextMode = rows.some((r) => r.us !== 'yes' && r.us !== 'no');
      return (
        <motion.div
          {...getAnimationProps('fade-up')}
          className="w-full overflow-x-auto rounded-[2rem] shadow-lg glass-panel border border-black/5"
          style={{ backgroundColor: props.bgColor as string }}
        >
          {props.title && (
            <h3 className="p-6 pb-0 text-2xl font-bold text-zinc-900">{props.title as string}</h3>
          )}
          <table className="w-full text-left border-collapse min-w-[320px] sm:min-w-[600px]">
            <thead>
              <tr>
                {headers.map((header, idx) => (
                  <th key={idx} className="p-6 border-b border-black/5 font-bold text-zinc-900 bg-white/80 backdrop-blur-md text-lg tracking-tight">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <motion.tr
                  key={idx}
                  whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                  className="border-b border-black/5 last:border-0 transition-colors"
                >
                  <td className="p-6 font-medium text-zinc-600 text-lg">{row.feature}</td>
                  <td className="p-6 text-center bg-black/5">
                    {isTextMode ? (
                      <span className="text-zinc-700">{row.us}</span>
                    ) : row.us === 'yes' ? (
                      <BuilderIcon name={(props.yesIcon as string) ?? 'CheckCircle2'} className="w-8 h-8 mx-auto drop-shadow-sm" style={{ color: props.color as string }} />
                    ) : (
                      <BuilderIcon name={(props.noIcon as string) ?? 'Minus'} className="w-8 h-8 mx-auto text-zinc-400" />
                    )}
                  </td>
                  <td className="p-6 text-center">
                    {isTextMode ? (
                      <span className="text-zinc-700 font-medium">{row.them}</span>
                    ) : row.them === 'yes' ? (
                      <BuilderIcon name={(props.yesIcon as string) ?? 'CheckCircle2'} className="w-8 h-8 mx-auto text-zinc-400" />
                    ) : (
                      <BuilderIcon name={(props.noIcon as string) ?? 'Minus'} className="w-8 h-8 mx-auto text-zinc-300" />
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      );
    }

    case 'image_carousel':
      return (
        <motion.div {...getAnimationProps('fade-up')} className="w-full">
          <ImageCarouselWidget
            images={props.images ?? []}
            height={String(props.height ?? '400')}
            radius={String(props.radius ?? 'rounded-xl')}
            autoPlay={props.autoPlay !== false}
            interval={String(props.interval ?? '3000')}
            interactive={isInteractive}
          />
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
            <SafeImg src={props.avatarUrl} alt={props.name} className="w-14 h-14 rounded-full object-cover shadow-sm border-2 border-white" />
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold truncate tracking-tight">{props.name}</p>
              <p className="text-sm opacity-90 truncate">{props.action}</p>
              <p className="text-xs opacity-60 mt-1 font-medium">{props.timeAgo}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      );

    case 'projection_calculator':
      return (
        <motion.div {...getAnimationProps('fade-up')} className="w-full">
          <ProjectionCalculator
            title={props.title as string}
            subtitle={props.subtitle as string}
            sliders={props.sliders as Parameters<typeof ProjectionCalculator>[0]['sliders']}
            outputs={props.outputs as Parameters<typeof ProjectionCalculator>[0]['outputs']}
            showProfitBar={props.showProfitBar as boolean}
            accentColor={props.accentColor as string}
            headerBg={props.headerBg as string}
            profitPositiveColor={props.profitPositiveColor as string}
          />
        </motion.div>
      );

    case 'metrics_table':
      return (
        <motion.div {...getAnimationProps('fade-up')} className="w-full">
          <MetricsTable
            title={props.title as string}
            headers={props.headers as string[]}
            rows={props.rows as Parameters<typeof MetricsTable>[0]['rows']}
            headerBg={props.headerBg as string}
            highlightColor={props.highlightColor as string}
            bgColor={props.bgColor as string}
          />
        </motion.div>
      );

    default:
      return null;
  }
}
