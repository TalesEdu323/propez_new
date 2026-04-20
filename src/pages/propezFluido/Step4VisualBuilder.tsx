import { motion } from 'motion/react';
import Builder from '../../components/Builder';
import type { BuilderElement } from '../../types/builder';
import type { PropezFluidoFormData, SetFormData } from './types';

export interface Step4Props {
  formData: PropezFluidoFormData;
  setFormData: SetFormData;
}

export function Step4VisualBuilder({ formData, setFormData }: Step4Props) {
  return (
    <motion.div
      key="step4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="h-full flex flex-col"
    >
      <div className="mb-8">
        <h2 className="text-3xl font-semibold text-zinc-900 mb-2 tracking-tight">Personalização Visual</h2>
        <p className="text-zinc-500">Ajuste o design e os elementos da sua proposta.</p>
      </div>

      <div className="flex-1 border border-black/5 rounded-3xl overflow-hidden bg-white shadow-2xl min-h-[600px]">
        <Builder
          initialElements={formData.elementos}
          onChange={(els: BuilderElement[]) => setFormData(prev => ({ ...prev, elementos: els }))}
          previewMode={false}
        />
      </div>
    </motion.div>
  );
}
