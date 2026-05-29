/**
 * Calculadora de projeção — preset traffic_roi (tráfego pago / funil comercial).
 * Fórmulas espelham o simulador HTML de referência.
 */

export type SliderFormat = 'currency' | 'percent' | 'decimal';
export type OutputFormat = 'number' | 'currency' | 'multiplier';
export type OutputHighlight = 'green' | 'red' | 'none';

export interface ProjectionSliderConfig {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  format: SliderFormat;
  /** Multiplicador aplicado ao valor bruto do slider (ex.: cpc em centavos → 0.01). */
  valueScale?: number;
  hintMin?: string;
  hintMax?: string;
}

export interface ProjectionOutputConfig {
  id: string;
  label: string;
  format: OutputFormat;
  highlight?: OutputHighlight;
}

export interface TrafficRoiValues {
  adSpend: number;
  cpc: number;
  lpConv: number;
  qualRate: number;
  closeRate: number;
  ticket: number;
  margin: number;
}

export interface TrafficRoiResult {
  clicks: number;
  leads: number;
  qualified: number;
  contracts: number;
  revenue: number;
  profit: number;
  roas: number;
  cac: number;
  profitPct: number;
}

export const DEFAULT_TRAFFIC_SLIDERS: ProjectionSliderConfig[] = [
  { id: 'adSpend', label: 'Investimento Mensal em Mídia', min: 1000, max: 15000, step: 500, default: 5000, format: 'currency', hintMin: 'R$ 1.000', hintMax: 'R$ 15.000' },
  { id: 'cpc', label: 'CPC Estimado', min: 50, max: 500, step: 25, default: 200, format: 'decimal', valueScale: 0.01, hintMin: 'R$ 0,50', hintMax: 'R$ 5,00' },
  { id: 'lpConv', label: 'Taxa de Conversão da LP', min: 5, max: 35, step: 1, default: 18, format: 'percent', hintMin: '5%', hintMax: '35%' },
  { id: 'qualRate', label: 'Taxa de Qualificação do Lead', min: 15, max: 65, step: 5, default: 40, format: 'percent', hintMin: '15%', hintMax: '65%' },
  { id: 'closeRate', label: 'Taxa de Fechamento Comercial', min: 5, max: 40, step: 1, default: 22, format: 'percent', hintMin: '5%', hintMax: '40%' },
  { id: 'ticket', label: 'Ticket Médio Liberado', min: 500, max: 5000, step: 100, default: 2000, format: 'currency', hintMin: 'R$ 500', hintMax: 'R$ 5.000' },
  { id: 'margin', label: 'Margem Sobre o Valor Liberado', min: 1, max: 25, step: 1, default: 12, format: 'percent', hintMin: '1%', hintMax: '25%' },
];

export const DEFAULT_TRAFFIC_OUTPUTS: ProjectionOutputConfig[] = [
  { id: 'clicks', label: 'Cliques', format: 'number' },
  { id: 'leads', label: 'Leads', format: 'number' },
  { id: 'qualified', label: 'Qualificados', format: 'number' },
  { id: 'contracts', label: 'Contratos', format: 'number' },
  { id: 'revenue', label: 'Receita Bruta', format: 'currency' },
  { id: 'profit', label: 'Lucro Líquido', format: 'currency', highlight: 'green' },
  { id: 'roas', label: 'ROAS', format: 'multiplier' },
  { id: 'cac', label: 'CAC / Contrato', format: 'currency' },
];

export function sliderToDisplayValue(slider: ProjectionSliderConfig, raw: number): number {
  if (slider.format === 'percent') return raw / 100;
  if (slider.valueScale) return raw * slider.valueScale;
  return raw;
}

export function rawValuesToTrafficRoi(
  sliders: ProjectionSliderConfig[],
  raw: Record<string, number>,
): TrafficRoiValues {
  const get = (id: keyof TrafficRoiValues) => {
    const cfg = sliders.find((s) => s.id === id);
    const v = raw[id] ?? cfg?.default ?? 0;
    return sliderToDisplayValue(cfg ?? { id, label: '', min: 0, max: 0, step: 1, default: v, format: 'currency' }, v);
  };
  return {
    adSpend: get('adSpend'),
    cpc: get('cpc'),
    lpConv: get('lpConv'),
    qualRate: get('qualRate'),
    closeRate: get('closeRate'),
    ticket: get('ticket'),
    margin: get('margin'),
  };
}

export function computeTrafficRoi(values: TrafficRoiValues): TrafficRoiResult {
  const { adSpend, cpc, lpConv, qualRate, closeRate, ticket, margin } = values;
  const clicks = cpc > 0 ? Math.floor(adSpend / cpc) : 0;
  const leads = Math.floor(clicks * lpConv);
  const qualified = Math.floor(leads * qualRate);
  const contracts = Math.floor(qualified * closeRate);
  const volumeReleased = contracts * ticket;
  const revenue = volumeReleased * margin;
  const profit = revenue - adSpend;
  const roas = adSpend > 0 ? revenue / adSpend : 0;
  const cac = contracts > 0 ? adSpend / contracts : 0;
  const profitPct = revenue > 0 ? (profit / revenue) * 100 : 0;
  return { clicks, leads, qualified, contracts, revenue, profit, roas, cac, profitPct };
}

export function fmtNumber(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function fmtCurrency(n: number): string {
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function fmtDecimal(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatSliderDisplay(slider: ProjectionSliderConfig, raw: number): string {
  if (slider.format === 'currency') return fmtCurrency(raw);
  if (slider.format === 'percent') return `${raw}%`;
  if (slider.format === 'decimal') {
    const v = slider.valueScale ? raw * slider.valueScale : raw;
    return `R$ ${fmtDecimal(v)}`;
  }
  return String(raw);
}

export function formatOutputValue(
  output: ProjectionOutputConfig,
  result: TrafficRoiResult,
): string {
  const map: Record<string, number> = {
    clicks: result.clicks,
    leads: result.leads,
    qualified: result.qualified,
    contracts: result.contracts,
    revenue: result.revenue,
    profit: result.profit,
    roas: result.roas,
    cac: result.cac,
  };
  const v = map[output.id] ?? 0;
  if (output.format === 'currency') return fmtCurrency(v);
  if (output.format === 'multiplier') return `${v.toFixed(2)}x`;
  return fmtNumber(v);
}

export function initialSliderValues(sliders: ProjectionSliderConfig[]): Record<string, number> {
  return Object.fromEntries(sliders.map((s) => [s.id, s.default]));
}
