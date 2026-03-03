import { motion, AnimatePresence } from 'motion/react';
import { 
  Target, 
  MapPin, 
  BookOpen, 
  Megaphone, 
  Filter, 
  Database, 
  CheckCircle, 
  ArrowRight, 
  MousePointerClick, 
  BarChart3, 
  PhoneCall,
  ChevronDown,
  Building2,
  Award,
  Home,
  Globe2,
  UserCheck
} from 'lucide-react';
import { useState } from 'react';

const LAVITA_LOGO = "https://lavitaconstrutora.com.br/wp-content/uploads/2025/05/LaVita_LOGO.png";
const TAGGO_LOGO = "https://lp.taggo.com.br/wp-content/uploads/logos-formato-site-6.png";

export default function App() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-red-600 selection:text-white overflow-x-hidden">
      <Navbar />
      <Hero />
      <Stats />
      <Pillars />
      <Timeline />
      <Funnel />
      <CTA />
      <Footer />
    </div>
  );
}

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-red-600 shadow-lg">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <img src={LAVITA_LOGO} alt="LaVita Construtora" className="h-10 object-contain brightness-0 invert" />
        <div className="hidden md:flex items-center gap-4 text-sm font-medium text-white/90">
          <span>Proposta Comercial</span>
          <div className="w-1 h-1 rounded-full bg-white/50" />
          <span>Máquina de Vendas</span>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden bg-zinc-50">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 border border-red-200 text-red-600 text-sm font-bold mb-8 uppercase tracking-wider">
            <Target className="w-4 h-4" />
            <span>Estratégia Digital de Alta Performance</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight text-zinc-900">
            Engenharia de <span className="text-red-600">Conversão</span>
          </h1>
          <p className="text-xl md:text-2xl text-zinc-600 max-w-3xl mx-auto leading-relaxed mb-12">
            Uma máquina de vendas previsível para conectar o conceito de <strong className="text-zinc-900">Novo Urbanismo</strong> da LaVita aos clientes ideais em Cotia e região.
          </p>
          
          <motion.div 
            animate={{ y: [0, 10, 0] }} 
            transition={{ repeat: Infinity, duration: 2 }}
            className="flex justify-center"
          >
            <ChevronDown className="w-8 h-8 text-red-600" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function Stats() {
  const stats = [
    { icon: <Building2 className="w-8 h-8" />, value: "15", label: "Anos de Experiência" },
    { icon: <Home className="w-8 h-8" />, value: "+224", label: "Unidades Entregues" },
    { icon: <CheckCircle className="w-8 h-8" />, value: "100%", label: "Garantia de Entrega" },
    { icon: <Award className="w-8 h-8" />, value: "Nível A", label: "Certificação PBQP-H" },
  ];

  return (
    <section className="py-20 bg-red-600 text-white relative z-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">A Base da Nossa Comunicação</h2>
          <p className="text-red-100 max-w-2xl mx-auto">
            Vamos usar a solidez da LaVita como principal argumento de autoridade nas campanhas.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
                {stat.icon}
              </div>
              <div className="text-4xl font-black mb-2">{stat.value}</div>
              <div className="text-sm font-medium text-red-100 uppercase tracking-wider">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pillars() {
  const pillars = [
    {
      icon: <MapPin className="w-6 h-6" />,
      title: "Estudo de Localidade",
      description: "Mapeamento de Cotia e região. Foco no conceito de Novo Urbanismo, destacando infraestrutura e qualidade de vida."
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Estudo de Mercado",
      description: "Posicionamento dos empreendimentos Nova Granja (Esplêndida, Paradise, Encantada) frente à concorrência."
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: "Dossiê Estratégico",
      description: "Argumentação focada na essência familiar da LaVita, certificação PBQP-H e plantas inteligentes a partir de 47m²."
    },
    {
      icon: <Megaphone className="w-6 h-6" />,
      title: "Gestão de Anúncios",
      description: "Campanhas segmentadas para atrair famílias e investidores buscando imóveis na planta ou em construção."
    }
  ];

  return (
    <section className="py-32 relative bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-16 md:mb-24 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-zinc-900">Fundação Estratégica</h2>
          <p className="text-xl text-zinc-600 max-w-3xl mx-auto">
            Antes de investir em tráfego, construímos a base. Nossa metodologia garante que cada diferencial da LaVita seja comunicado com clareza.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pillars.map((pillar, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative p-8 rounded-3xl bg-zinc-50 border border-zinc-200 hover:border-red-600 hover:shadow-xl transition-all duration-300"
            >
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 mb-6 group-hover:scale-110 group-hover:bg-red-600 group-hover:text-white transition-all duration-300">
                  {pillar.icon}
                </div>
                <h3 className="text-2xl font-bold mb-4 text-zinc-900">{pillar.title}</h3>
                <p className="text-zinc-600 leading-relaxed font-medium">
                  {pillar.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Timeline() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      icon: <MousePointerClick className="w-6 h-6" />,
      title: "1. Atração (Tráfego)",
      content: "Anúncios no Meta e Google Ads segmentados para pessoas buscando imóveis em Cotia. Destacamos o conceito de Novo Urbanismo e a credibilidade de 15 anos da LaVita."
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: "2. Conversão (Landing Pages)",
      content: "Páginas de alta conversão específicas para cada empreendimento (Nova Granja Esplêndida, Paradise, etc.), projetadas para capturar leads qualificados."
    },
    {
      icon: <Database className="w-6 h-6" />,
      title: "3. Relacionamento (CRM)",
      content: "O lead cai automaticamente no CRM. Iniciamos automações de WhatsApp e e-mail para nutrir o contato com informações sobre a certificação PBQP-H e diferenciais."
    },
    {
      icon: <UserCheck className="w-6 h-6" />,
      title: "4. Qualificação (SDR)",
      content: "Filtro rápido para entender o momento de compra, renda e interesse real nos imóveis a partir de 47m²."
    },
    {
      icon: <PhoneCall className="w-6 h-6" />,
      title: "5. Fechamento (Comercial)",
      content: "Corretores recebem apenas oportunidades quentes, munidos do Dossiê Estratégico para contornar objeções e agendar visitas ao decorado."
    }
  ];

  return (
    <section className="py-32 bg-zinc-50 border-y border-zinc-200">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-zinc-900">A Jornada do Cliente</h2>
          <p className="text-xl text-zinc-600 max-w-3xl mx-auto">
            Um ecossistema interativo: clique nas etapas para entender como transformamos cliques em chaves entregues.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-12 items-start">
          {/* Timeline Navigation */}
          <div className="w-full md:w-1/3 flex flex-col relative">
            <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-zinc-200 z-0" />
            {steps.map((step, index) => (
              <button
                key={index}
                onClick={() => setActiveStep(index)}
                className={`relative z-10 flex items-center gap-4 p-4 text-left transition-all ${activeStep === index ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300 ${activeStep === index ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' : 'bg-white border-2 border-zinc-300 text-zinc-500'}`}>
                  {step.icon}
                </div>
                <span className={`font-bold text-lg ${activeStep === index ? 'text-red-600' : 'text-zinc-600'}`}>
                  {step.title}
                </span>
              </button>
            ))}
          </div>

          {/* Timeline Content */}
          <div className="w-full md:w-2/3">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-white p-10 rounded-3xl shadow-xl border border-zinc-100"
              >
                <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-6">
                  {steps[activeStep].icon}
                </div>
                <h3 className="text-3xl font-bold mb-6 text-zinc-900">{steps[activeStep].title}</h3>
                <p className="text-xl text-zinc-600 leading-relaxed">
                  {steps[activeStep].content}
                </p>
                
                {activeStep === 1 && (
                  <div className="mt-8 p-6 bg-zinc-50 rounded-2xl border border-zinc-200">
                    <h4 className="font-bold text-zinc-900 mb-2">Foco nos Empreendimentos:</h4>
                    <ul className="list-disc list-inside text-zinc-600 space-y-1">
                      <li>Nova Granja Esplêndida (Lançamento)</li>
                      <li>Nova Granja Paradise (Em Construção)</li>
                      <li>Nova Granja Encantada (Últimas Unidades)</li>
                    </ul>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

function Funnel() {
  const [activeStage, setActiveStage] = useState(0);

  const stages = [
    {
      name: "Visitantes",
      metric: "100%",
      color: "bg-zinc-100 text-zinc-900",
      activeColor: "ring-red-600 bg-white shadow-lg",
      width: "w-full",
      desc: "Pessoas impactadas pelos anúncios que acessaram a Landing Page.",
      details: "Foco em CTR (Taxa de Clique) e Custo por Clique. O Estudo de Localidade garante que estamos atraindo pessoas da região certa."
    },
    {
      name: "Leads",
      metric: "15%",
      color: "bg-red-50 text-red-900",
      activeColor: "ring-red-600 bg-red-50 shadow-lg",
      width: "w-[85%]",
      desc: "Visitantes que deixaram nome, e-mail e telefone.",
      details: "A Landing Page otimizada converte o tráfego em contatos reais. Aqui entra a automação inicial do CRM."
    },
    {
      name: "Leads Qualificados",
      metric: "5%",
      color: "bg-red-100 text-red-900",
      activeColor: "ring-red-600 bg-red-100 shadow-lg",
      width: "w-[70%]",
      desc: "Contatos filtrados (têm perfil, renda e interesse).",
      details: "Onde a mágica acontece. Filtramos curiosos e passamos para a equipe de vendas apenas quem tem potencial real de compra."
    },
    {
      name: "Oportunidades",
      metric: "2%",
      color: "bg-red-500 text-white",
      activeColor: "ring-red-600 bg-red-500 shadow-lg shadow-red-500/30",
      width: "w-[55%]",
      desc: "Agendamento de visita ao decorado ou reunião.",
      details: "O corretor utiliza o Dossiê Estratégico de Vendas para contornar objeções e apresentar o valor real do empreendimento."
    },
    {
      name: "Vendas",
      metric: "0.5%",
      color: "bg-red-700 text-white",
      activeColor: "ring-red-800 bg-red-700 shadow-lg shadow-red-700/40",
      width: "w-[40%]",
      desc: "Assinatura do contrato.",
      details: "O objetivo final. Os dados dessa venda voltam para as plataformas de anúncios para otimizar e encontrar mais pessoas com esse mesmo perfil."
    }
  ];

  return (
    <section className="py-32 relative bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-16 md:mb-24 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-zinc-900">Funil de Dados & Conversão</h2>
          <p className="text-xl text-zinc-600 max-w-2xl mx-auto">
            Não queremos apenas volume de leads, queremos previsibilidade de vendas para a LaVita.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Funnel Visualization */}
          <div className="flex flex-col items-center gap-3">
            {stages.map((stage, index) => (
              <motion.div
                key={index}
                className={`${stage.width} h-20 ${stage.color} ${activeStage === index ? `ring-2 ring-offset-4 ring-offset-white ${stage.activeColor}` : 'opacity-80 border border-zinc-200'} rounded-2xl flex items-center justify-between px-6 cursor-pointer transition-all duration-300 hover:opacity-100`}
                onClick={() => setActiveStage(index)}
                whileHover={{ scale: 1.02 }}
              >
                <span className="font-bold text-lg">{stage.name}</span>
                <span className="font-mono font-bold opacity-80">{stage.metric}</span>
              </motion.div>
            ))}
          </div>

          {/* Active Stage Details */}
          <div className="h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStage}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="p-10 rounded-3xl bg-zinc-50 border border-zinc-200 h-full flex flex-col justify-center shadow-xl"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-100 text-red-600 mb-6">
                  <Filter className="w-7 h-7" />
                </div>
                <h3 className="text-3xl font-bold mb-4 text-zinc-900">{stages[activeStage].name}</h3>
                <p className="text-xl text-zinc-600 mb-8 font-medium">
                  {stages[activeStage].desc}
                </p>
                <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm">
                  <h4 className="text-sm font-bold text-red-600 uppercase tracking-wider mb-3">Estratégia Aplicada</h4>
                  <p className="text-zinc-700 leading-relaxed font-medium">
                    {stages[activeStage].details}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-32 relative bg-zinc-900 text-white overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-600/20 rounded-full blur-[120px]" />
      </div>
      
      <div className="relative z-10 max-w-5xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">Pronto para escalar as vendas da LaVita?</h2>
          <p className="text-xl text-zinc-300 max-w-3xl mx-auto">
            O custo de não ter uma máquina de vendas previsível é muito maior do que o investimento para construí-la. Transforme sua presença digital em um ativo de conversão.
          </p>
        </div>

        <div className="max-w-lg mx-auto bg-white rounded-3xl p-8 md:p-12 text-zinc-900 shadow-2xl relative">
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-2 rounded-full text-sm font-bold uppercase tracking-wider shadow-lg whitespace-nowrap">
            Proposta Exclusiva
          </div>
          
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold mb-2">Assessoria Estratégica</h3>
            <p className="text-zinc-600 font-medium">Gestão de Tráfego + Inteligência de CRM</p>
          </div>

          <div className="flex justify-center items-baseline gap-1 mb-8">
            <span className="text-2xl font-bold text-zinc-400">R$</span>
            <span className="text-6xl font-black text-zinc-900 tracking-tighter">1.600</span>
            <span className="text-xl font-bold text-zinc-400">,00</span>
            <span className="text-zinc-500 font-medium ml-1">/mês</span>
          </div>

          <p className="text-center text-xs text-zinc-500 -mt-4 mb-8 font-medium">
            Comissão de 0,5% por venda de imóvel após a 6ª venda.
          </p>

          <ul className="space-y-4 mb-10">
            {[
              "Estudo de Localidade e Mercado",
              "Dossiê Estratégico de Vendas",
              "Gestão de Campanhas (Meta & Google Ads)",
              "Otimização de Landing Pages",
              "Integração e Automação de CRM",
              "Acompanhamento direto com Vinicius (CEO)"
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-red-600 shrink-0" />
                <span className="font-medium text-zinc-700 leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
          
          <a 
            href="https://wa.me/5511947755815?text=Olá%20Vinicius!%20Gostaria%20de%20iniciar%20a%20parceria%20para%20a%20LaVita%20Construtora."
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-lg transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-red-600/30 flex items-center justify-center gap-3"
          >
            Iniciar Parceria Agora
            <ArrowRight className="w-6 h-6" />
          </a>
          
          <p className="text-center text-sm text-zinc-500 mt-6 font-medium">
            *O valor de investimento nas plataformas de anúncios (budget) é definido separadamente pela construtora.
          </p>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-red-700 text-white py-12 border-t border-red-800">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center md:items-start gap-2">
          <span className="text-red-200 text-sm font-medium uppercase tracking-wider">Proposta desenvolvida por</span>
          <img src={TAGGO_LOGO} alt="Taggo" className="h-8 object-contain brightness-0 invert" />
        </div>
        
        <div className="text-center md:text-right">
          <p className="font-bold text-lg">Vinicius</p>
          <p className="text-red-200 text-sm">CEO & Representante do Projeto</p>
        </div>
      </div>
    </footer>
  );
}

