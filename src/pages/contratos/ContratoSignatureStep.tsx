import type { Marcador, PositioningSigner } from '../../lib/documents/positioningTypes';
import { RubricaSignaturePositioningPanel } from '../../components/contratos/RubricaSignaturePositioningPanel';

export interface ContratoSignatureStepProps {
  signers: PositioningSigner[];
  marcadores: Marcador[];
  setMarcadores: React.Dispatch<React.SetStateAction<Marcador[]>>;
  selectedSignerId: string | null;
  onSelectSigner: (id: string) => void;
  documentPages: number;
  currentPage: number;
  onCurrentPageChange: (page: number) => void;
  previewUrl: string | null;
  onNotify: (message: string) => void;
  onReloadPreview?: () => void;
}

export function ContratoSignatureStep(props: ContratoSignatureStepProps) {
  return (
    <div className="max-w-6xl mx-auto w-full p-6">
      <h2 className="text-lg font-semibold text-zinc-900 mb-1">Posicionar assinaturas</h2>
      <p className="text-sm text-zinc-500 mb-6">
        Selecione <strong>Cliente</strong> ou <strong>Empresa</strong>, clique no PDF e adicione os campos. É
        obrigatório pelo menos uma assinatura para cada um.
      </p>
      <RubricaSignaturePositioningPanel
        signers={props.signers}
        marcadores={props.marcadores}
        setMarcadores={props.setMarcadores}
        selectedSignerId={props.selectedSignerId}
        onSelectSigner={props.onSelectSigner}
        documentPages={props.documentPages}
        currentPage={props.currentPage}
        onCurrentPageChange={props.onCurrentPageChange}
        previewUrl={props.previewUrl}
        onNotify={props.onNotify}
        onReloadPreview={props.onReloadPreview}
      />
    </div>
  );
}
