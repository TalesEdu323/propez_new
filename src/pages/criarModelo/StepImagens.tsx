import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ImageIcon, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import type { BuilderElement } from '../../types/builder';
import type { OfferType } from '../../lib/layoutContext';
import { suggestGlobalImagePrompt } from '../../lib/buildImagePrompt';
import { collectModelImageSlots } from '../../lib/modelImageSlots';
import { hasUnresolvedImagePrompts } from '../../lib/modelImagePrompts';
import { getSegmentLabel } from '../../lib/segmentLabels';
import { iaApi, getIaErrorMessage } from '../../lib/iaApi';

export interface StepImagensProps {
  elementos: BuilderElement[];
  offerType: OfferType;
  brief?: string;
  modelName?: string;
  serviceNames?: string[];
  onElementosChange: (elementos: BuilderElement[]) => void;
  /** Dispara resolve automático ao montar (starters / prompts pendentes). */
  autoResolve?: boolean;
}

export function StepImagens({
  elementos,
  offerType,
  brief,
  modelName,
  serviceNames,
  onElementosChange,
  autoResolve = true,
}: StepImagensProps) {
  const slots = collectModelImageSlots(elementos);
  const suggestedGlobal = useMemo(
    () => suggestGlobalImagePrompt(modelName, serviceNames, brief),
    [modelName, serviceNames, brief],
  );

  const [globalPrompt, setGlobalPrompt] = useState(suggestedGlobal);
  const [slotPrompts, setSlotPrompts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [regeneratingKey, setRegeneratingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autoResolvedRef = useRef(false);

  useEffect(() => {
    if (!suggestedGlobal) return;
    setGlobalPrompt((prev) => (prev.trim() ? prev : suggestedGlobal));
  }, [suggestedGlobal]);

  const runResolve = async (regenerate?: 'all' | string[]) => {
    setError(null);
    setLoading(true);
    try {
      const result = await iaApi.resolveModelImages(elementos, {
        brief,
        offerType,
        modelName,
        serviceNames,
        globalPrompt: globalPrompt.trim() || undefined,
        imagePrompts: Object.fromEntries(
          Object.entries(slotPrompts).filter(([, v]) => v.trim()),
        ),
        regenerate,
      });
      onElementosChange(result.elementos);
    } catch (err) {
      setError(getIaErrorMessage(err));
    } finally {
      setLoading(false);
      setRegeneratingKey(null);
    }
  };

  useEffect(() => {
    if (!autoResolve || autoResolvedRef.current || !hasUnresolvedImagePrompts(elementos)) return;
    autoResolvedRef.current = true;
    void runResolve('all');
  }, []);

  const handleRegenerateOne = async (slotKey: string) => {
    setRegeneratingKey(slotKey);
    await runResolve([slotKey]);
  };

  const updateSlotPrompt = (slotKey: string, value: string) => {
    setSlotPrompts((prev) => ({ ...prev, [slotKey]: value }));
  };

  return (
    <motion.div
      key="step-imagens"
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className="space-y-8"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
          <ImageIcon className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Imagens e banners</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Geradas com IA conforme sua descrição, o nicho{' '}
            <strong className="text-zinc-700">{getSegmentLabel(offerType)}</strong>
            {modelName ? (
              <>
                {' '}
                e o modelo <strong className="text-zinc-700">{modelName}</strong>
              </>
            ) : null}
            .
          </p>
        </div>
      </div>

      {slots.length === 0 ? (
        <p className="text-sm text-zinc-500 bg-zinc-50 rounded-2xl p-6 border border-zinc-100">
          Este layout ainda não tem blocos com imagem. Você pode adicionar no editor visual.
        </p>
      ) : (
        <>
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest">
              Descrição para as imagens
            </label>
            <textarea
              value={globalPrompt}
              onChange={(e) => setGlobalPrompt(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={suggestedGlobal || 'Descreva o visual desejado para as imagens…'}
              className="w-full bg-zinc-50 border border-black/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 resize-y min-h-[80px]"
            />
            {serviceNames && serviceNames.length > 0 ? (
              <p className="text-xs text-zinc-400">
                Serviços no contexto: {serviceNames.join(', ')}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={() => runResolve('all')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-50"
            >
              {loading && !regeneratingKey ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Regenerar todas
            </button>
            <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400 self-center">
              <Sparkles className="w-3.5 h-3.5" />
              Pollinations · model=flux
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {slots.map((slot) => (
              <div
                key={slot.slotKey}
                className="rounded-2xl border border-zinc-100 overflow-hidden bg-zinc-50"
              >
                <div className="aspect-video relative bg-zinc-200">
                  <img
                    src={slot.url}
                    alt={slot.label}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {(loading && regeneratingKey === slot.slotKey) ||
                  (loading && !regeneratingKey) ? (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  ) : null}
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-700 truncate">{slot.label}</p>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wider">
                        {slot.elementType}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleRegenerateOne(slot.slotKey)}
                      className="shrink-0 text-xs font-medium text-amber-700 hover:text-amber-900 disabled:opacity-50"
                    >
                      Regenerar
                    </button>
                  </div>
                  <textarea
                    value={slotPrompts[slot.slotKey] ?? ''}
                    onChange={(e) => updateSlotPrompt(slot.slotKey, e.target.value)}
                    rows={2}
                    maxLength={500}
                    placeholder="Descreva esta imagem (opcional)"
                    className="w-full text-xs bg-white border border-zinc-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-300 resize-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100">
          {error}
        </p>
      )}
    </motion.div>
  );
}

export { hasModelImageSlots } from '../../lib/modelImageSlots';
