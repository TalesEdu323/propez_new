import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertCircle, ArrowRight, CheckCircle2, ChevronDown, ChevronLeft,
  Maximize2, MessageCircle, Minus, PlayCircle, Quote, Sparkles, Star
} from 'lucide-react';
import type { BuilderElement } from '../../types/builder';

type ElementData = BuilderElement;

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
