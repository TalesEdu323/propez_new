import React from 'react';
import { FileText, Info, Copy, Type, Hash, Calendar, User } from 'lucide-react';

interface Placeholder {
  key: string;
  label: string;
  icon: React.ReactNode;
}

const PLACEHOLDERS: Placeholder[] = [
  { key: '{{CLIENTE_NOME}}', label: 'Nome do Cliente', icon: <User className="w-3 h-3" /> },
  { key: '{{CLIENTE_EMPRESA}}', label: 'Empresa do Cliente', icon: <Type className="w-3 h-3" /> },
  { key: '{{VALOR_TOTAL}}', label: 'Valor Total', icon: <Hash className="w-3 h-3" /> },
  { key: '{{DATA_ATUAL}}', label: 'Data de Hoje', icon: <Calendar className="w-3 h-3" /> },
  { key: '{{SERVICOS_LISTA}}', label: 'Lista de Serviços', icon: <FileText className="w-3 h-3" /> },
];

interface ContractEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function ContractEditor({ value, onChange }: ContractEditorProps) {
  const insertAtCursor = (text: string) => {
    const textarea = document.getElementById('contract-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = value.substring(0, start) + text + value.substring(end);
    onChange(newValue);
    
    // Reset focus and cursor position after state update
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Sidebar de Placeholders */}
      <div className="w-full lg:w-64 flex flex-col gap-4">
        <div className="bg-zinc-50 rounded-2xl p-4 border border-black/5">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-4 h-4 text-zinc-400" />
            <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-widest">Campos Dinâmicos</h4>
          </div>
          <p className="text-[11px] text-zinc-500 mb-4 leading-relaxed">
            Clique nos campos abaixo para copiar ou inserir no contrato. Eles serão substituídos automaticamente pelos dados reais.
          </p>
          <div className="space-y-2">
            {PLACEHOLDERS.map((p) => (
              <button
                key={p.key}
                onClick={() => insertAtCursor(p.key)}
                className="w-full flex items-center justify-between p-2.5 bg-white border border-black/5 rounded-xl text-left hover:border-black/20 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-zinc-100 rounded-lg flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                    {p.icon}
                  </div>
                  <span className="text-[11px] font-medium text-zinc-700">{p.label}</span>
                </div>
                <Copy className="w-3 h-3 text-zinc-300 group-hover:text-zinc-500" />
              </button>
            ))}
          </div>
        </div>

        <div className="bg-black text-white rounded-2xl p-4 shadow-lg">
          <h4 className="text-[10px] font-bold uppercase tracking-widest mb-2 opacity-60">Dica Propez</h4>
          <p className="text-[11px] leading-relaxed opacity-90">
            Você pode colar um contrato pronto aqui e apenas substituir os nomes pelos campos dinâmicos acima.
          </p>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col min-h-[500px] bg-white rounded-[2rem] border border-black/5 shadow-sm overflow-hidden">
        <div className="bg-zinc-50/50 border-bottom border-black/5 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="ml-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Editor de Contrato</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-zinc-400 font-medium">{value.length} caracteres</span>
          </div>
        </div>
        
        <div className="flex-1 p-8 sm:p-12 bg-zinc-100/30 overflow-y-auto custom-scrollbar">
          <div className="max-w-[800px] mx-auto bg-white shadow-xl border border-black/5 min-h-[1000px] p-12 sm:p-20 rounded-sm relative">
            {/* Watermark/Guide */}
            {!value && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
                <FileText className="w-64 h-64" />
              </div>
            )}
            
            <textarea
              id="contract-textarea"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Comece a escrever seu contrato aqui... 

Exemplo:
CONTRATO DE PRESTAÇÃO DE SERVIÇOS

CONTRATANTE: {{CLIENTE_NOME}}, com sede em {{CLIENTE_EMPRESA}}...

OBJETO: Prestação dos serviços de {{SERVICOS_LISTA}}...

VALOR: O valor total deste contrato é de {{VALOR_TOTAL}}..."
              className="w-full h-full min-h-[900px] resize-none focus:outline-none text-zinc-800 leading-relaxed font-serif text-base sm:text-lg placeholder:text-zinc-200"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
