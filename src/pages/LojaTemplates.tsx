import type { NavigateFn } from '../../types/navigation';
import { LojaTemplatesPanel } from './modelos/LojaTemplatesPanel';

/** Compatibilidade com links antigos para / loja-templates */
export default function LojaTemplates({ navigate }: { navigate: NavigateFn }) {
  return <LojaTemplatesPanel navigate={navigate} />;
}
