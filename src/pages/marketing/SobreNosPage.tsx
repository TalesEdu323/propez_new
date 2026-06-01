import { Link } from 'react-router-dom';
import {
  Target,
  Rocket,
  Sparkles,
  Zap,
  Users,
  Heart,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Award,
  Code2,
  CheckCircle2,
} from 'lucide-react';
import { MarketingLayout } from '../../marketing/MarketingLayout';
import { PageMeta } from '../../marketing/PageMeta';
import { TAGGO_COMPANY } from '../../marketing/company';
import { organizationJsonLdForPage } from '../../marketing/OrganizationJsonLd';
import { FounderPhoto } from '../../marketing/FounderPhoto';
import { ImageWithFallback } from '../../marketing/ImageWithFallback';
import { PropezLogo } from '../../components/PropezLogo';

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border-2 border-zinc-900/10 ${className}`}>{children}</div>
  );
}

export default function SobreNosPage() {
  return (
    <MarketingLayout>
      <PageMeta
        title="Quem somos — Propez"
        description={`Conheça o Propez, produto ${TAGGO_COMPANY.brandName} (${TAGGO_COMPANY.legalName}). Plataforma brasileira de propostas comerciais.`}
        path="/sobre-nos"
        jsonLd={organizationJsonLdForPage('/sobre-nos')}
      />

      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-100 text-zinc-900 text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            <span>Conheça nossa história</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">Sobre nós</h1>
          <p className="text-lg sm:text-xl text-zinc-500 max-w-2xl mx-auto leading-relaxed">
            O <strong className="text-zinc-900">Propez</strong> é um produto da{' '}
            <strong className="text-zinc-900">{TAGGO_COMPANY.brandName}</strong> ({TAGGO_COMPANY.legalName}), dedicado a transformar a
            forma como profissionais e empresas criam, enviam e fecham propostas comerciais.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-6 lg:gap-8">
          <Card className="hover:border-zinc-900/30 transition-colors">
            <div className="p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg bg-zinc-100 flex items-center justify-center">
                  <Target className="w-6 h-6 text-zinc-900" />
                </div>
                <h2 className="text-2xl font-bold">Nossa Missão</h2>
              </div>
              <p className="text-zinc-500 leading-relaxed">
                Simplificar e modernizar a criação e o fechamento de propostas comerciais, oferecendo uma solução
                completa e intuitiva para profissionais e empresas de todos os tamanhos.
              </p>
            </div>
          </Card>
          <Card className="hover:border-zinc-900/30 transition-colors">
            <div className="p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg bg-zinc-100 flex items-center justify-center">
                  <Rocket className="w-6 h-6 text-zinc-900" />
                </div>
                <h2 className="text-2xl font-bold">Nossa Visão</h2>
              </div>
              <p className="text-zinc-500 leading-relaxed">
                Ser a plataforma de referência em propostas digitais no Brasil, reconhecida pela inovação, eficiência e
                resultados entregues aos nossos clientes.
              </p>
            </div>
          </Card>
        </div>
      </section>

      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 bg-zinc-50">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold">O Propez</h2>
            <p className="text-lg text-zinc-500 max-w-2xl mx-auto">
              Produto da <strong>{TAGGO_COMPANY.legalName}</strong> ({TAGGO_COMPANY.brandName}), plataforma brasileira criada em{' '}
              <strong>São Paulo, Brasil</strong> com foco em <strong>inovação, eficiência e resultados</strong> para quem
              vende serviços.
            </p>
          </div>
          <div className="space-y-6">
            <Card>
              <div className="p-6 lg:p-8">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5" /> O que fazemos
                </h3>
                <p className="text-zinc-500 leading-relaxed mb-4">
                  O <strong>Propez</strong> integra <strong>builder visual, link público, assinatura digital e
                  pagamentos</strong> em um único lugar. Desenvolvido pela Taggo Software, elimina a necessidade de PDFs
                  desconectados, planilhas e follow-ups perdidos.
                </p>
                <p className="text-zinc-500 leading-relaxed">
                  A {TAGGO_COMPANY.brandName} atua com visão de longo prazo e compromisso com a evolução contínua da plataforma,
                  sempre orientados pelas necessidades reais de quem vende serviços no dia a dia.
                </p>
              </div>
            </Card>
            <Card>
              <div className="p-6 lg:p-8">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" /> Por que o Propez existe
                </h3>
                <p className="text-zinc-500 leading-relaxed mb-4">
                  A <strong>{TAGGO_COMPANY.brandName}</strong> nasceu a partir de <strong>análise prática do cenário brasileiro</strong>{' '}
                  e identificação de lacunas nas soluções disponíveis — especialmente em{' '}
                  <strong>usabilidade, adaptação ao contexto local e velocidade de melhoria do produto</strong>.
                </p>
                <p className="text-zinc-500 leading-relaxed">
                  O <strong>Propez</strong> foi criado para <strong>reduzir fricções</strong>,{' '}
                  <strong>modernizar rotinas comerciais</strong> e trazer mais eficiência para quem precisa apresentar,
                  negociar e cobrar propostas com clareza e profissionalismo.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold">Quem somos</h2>
            <p className="text-lg text-zinc-500 max-w-2xl mx-auto">Conheça a empresa por trás do Propez</p>
          </div>
          <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            <Card className="hover:shadow-lg transition-all">
              <div className="p-8 flex flex-col items-center text-center space-y-6">
                <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-zinc-200 shadow-xl bg-zinc-100">
                  <FounderPhoto />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold">Fundador e CTO</h3>
                  <a
                    href="https://www.linkedin.com/in/eduardo-gomes-tgs/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg font-semibold text-zinc-900 hover:underline inline-block"
                  >
                    Eduardo Gomes
                  </a>
                  <p className="text-zinc-500 leading-relaxed">
                    Lidera a visão técnica e o desenvolvimento do Propez. Com foco em inovação, excelência operacional e
                    soluções que transformam a gestão comercial de empresas e profissionais.
                  </p>
                </div>
              </div>
            </Card>
            <Card className="hover:shadow-lg transition-all">
              <div className="p-8 flex flex-col items-center text-center space-y-6">
                <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-zinc-200 shadow-xl bg-zinc-900 flex items-center justify-center p-6">
                  <PropezLogo height="lg" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold">{TAGGO_COMPANY.legalName}</h3>
                  <p className="text-zinc-500 leading-relaxed">
                    {TAGGO_COMPANY.legalName} — empresa brasileira de desenvolvimento de software especializada em soluções inovadoras para gestão,
                    automação de processos e transformação digital — incluindo o <strong>Propez</strong>.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Credenciais Google — igual Prosync */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 bg-zinc-50">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-100 text-sm font-medium mb-2">
              <Award className="w-4 h-4" />
              <span>Certificações e Credenciais</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold">
              <a
                href="https://www.linkedin.com/in/eduardo-gomes-tgs/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-zinc-600 transition-colors"
              >
                Eduardo Gomes
              </a>
            </h2>
            <p className="text-lg text-zinc-500 max-w-2xl mx-auto">
              Desenvolvedor certificado pelo programa Google Developers e membro ativo da comunidade GDG
            </p>
          </div>

          <Card className="bg-gradient-to-br from-blue-50 to-green-50">
            <div className="p-8">
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <Code2 className="w-6 h-6" />
                    <h3 className="text-2xl font-bold">Desenvolvedor Certificado Google</h3>
                  </div>
                  <p className="text-zinc-500 leading-relaxed">
                    Especialização em desenvolvimento de soluções tecnológicas com certificações oficiais do Google
                    Developers Program. Membro ativo da comunidade GDG, participante do Google I/O e inovador certificado
                    Google Cloud.
                  </p>
                  <div className="flex flex-wrap gap-3 pt-2">
                    {['Google Developer', 'GDG Member', 'Google I/O', 'Google Cloud'].map((label, i) => (
                      <div
                        key={label}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                          i === 0 ? 'bg-zinc-100' : i === 1 ? 'bg-green-100 text-green-700' : i === 2 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  <a href="https://g.dev/edugomes323" target="_blank" rel="noopener noreferrer" className="group">
                    <div className="w-32 h-32 rounded-xl bg-white border-4 border-blue-500 p-3 shadow-lg hover:scale-105 transition-transform flex items-center justify-center">
                      <ImageWithFallback
                        src="https://res.cloudinary.com/startup-grind/image/upload/c_fill,w_500,h_500,g_center/c_fill,dpr_2.0,f_auto,g_center,q_auto:good/v1/gcs/platform-data-goog/events/blob_DlcE1z0"
                        alt="Google Developer Profile"
                        className="w-full h-full object-contain rounded-lg"
                        fallbackContent={
                          <div className="text-center">
                            <div className="text-4xl font-bold text-blue-500">G</div>
                            <div className="text-xs text-zinc-400">Google Dev</div>
                          </div>
                        }
                      />
                    </div>
                    <p className="text-xs text-center text-zinc-400 mt-2 group-hover:text-zinc-900">Perfil Google Developer</p>
                  </a>
                  <a href="https://gdg.community.dev/u/mn8sjr/" target="_blank" rel="noopener noreferrer" className="group">
                    <div className="w-32 h-32 rounded-xl bg-white border-4 border-green-500 p-3 shadow-lg hover:scale-105 transition-transform flex items-center justify-center">
                      <ImageWithFallback
                        src="https://www.inovex.de/wp-content/uploads/2020/12/communities-gdg.png"
                        alt="GDG Community"
                        className="w-full h-full object-contain rounded-lg"
                        fallbackContent={
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">GDG</div>
                            <div className="text-xs text-zinc-400">Community</div>
                          </div>
                        }
                      />
                    </div>
                    <p className="text-xs text-center text-zinc-400 mt-2 group-hover:text-zinc-900">Perfil GDG Community</p>
                  </a>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'Google Developer', border: 'border-l-blue-500', icon: Code2, color: 'text-blue-500', desc: 'Desenvolvedor certificado pelo programa oficial Google Developers' },
              { title: 'GDG Member', border: 'border-l-green-500', icon: Users, color: 'text-green-500', desc: 'Membro ativo da comunidade Google Developers Group' },
              { title: 'Google I/O', border: 'border-l-red-500', icon: Award, color: 'text-red-500', desc: 'Participante oficial do evento anual Google I/O' },
              { title: 'Google Cloud', border: 'border-l-yellow-500', icon: Sparkles, color: 'text-yellow-600', desc: 'Inovador certificado em soluções Google Cloud' },
            ].map((c) => (
              <Card key={c.title} className={`border-l-4 ${c.border}`}>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg bg-zinc-50 flex items-center justify-center`}>
                      <c.icon className={`w-5 h-5 ${c.color}`} />
                    </div>
                    <h4 className="font-bold">{c.title}</h4>
                  </div>
                  <p className="text-sm text-zinc-500">{c.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 bg-zinc-50">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold">Nossa jornada</h2>
            <p className="text-lg text-zinc-500">Marcos importantes da nossa história</p>
          </div>
          <div className="relative space-y-8 pl-4 md:pl-0">
            <div className="hidden md:block absolute left-8 top-0 bottom-0 w-0.5 bg-zinc-200" />
            {[
              { year: '2024', label: 'Início', icon: Calendar, text: 'Início do projeto e definição do produto. Pesquisa de mercado e desenvolvimento das bases da plataforma.' },
              { year: '2025', label: 'Crescimento', icon: Rocket, text: 'Desenvolvimento e consolidação da plataforma. Lançamento de funcionalidades essenciais e primeiros clientes.' },
              { year: '2026', label: 'Expansão', icon: Sparkles, text: 'Expansão contínua com novas funcionalidades, melhorias de performance e crescimento da base de usuários.' },
            ].map((item) => (
              <div key={item.year} className="relative flex gap-6 md:gap-8">
                <div className="shrink-0 hidden md:flex w-16 h-16 rounded-full bg-zinc-100 border-4 border-zinc-200 items-center justify-center z-10">
                  <item.icon className="w-6 h-6 text-zinc-900" />
                </div>
                <Card className="flex-1">
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl font-bold text-zinc-900">{item.year}</span>
                      <span className="text-sm text-zinc-400 font-medium">{item.label}</span>
                    </div>
                    <p className="text-zinc-500 leading-relaxed">{item.text}</p>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Valores */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold">Nossos valores</h2>
            <p className="text-lg text-zinc-500 max-w-2xl mx-auto">Princípios que guiam nosso trabalho</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Rocket, title: 'Inovação', desc: 'Sempre buscando novas formas de melhorar propostas e conversão' },
              { icon: Target, title: 'Foco no Cliente', desc: 'Soluções pensadas para necessidades reais e resultados mensuráveis' },
              { icon: Users, title: 'Colaboração', desc: 'Parcerias duradouras baseadas em confiança' },
              { icon: Heart, title: 'Compromisso', desc: 'Dedicação constante à evolução da plataforma' },
            ].map((v) => (
              <Card key={v.title} className="hover:shadow-lg transition-all">
                <div className="p-6 flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center">
                    <v.icon className="w-8 h-8 text-zinc-900" />
                  </div>
                  <h3 className="text-lg font-bold">{v.title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">{v.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contato */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 bg-zinc-50">
        <div className="max-w-4xl mx-auto">
          <Card>
            <div className="p-8 lg:p-12 text-center space-y-8">
              <h2 className="text-3xl sm:text-4xl font-bold">Entre em contato</h2>
              <p className="text-lg text-zinc-500">Estamos prontos para ajudar você a vender com propostas profissionais</p>
              <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
                <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-zinc-50 border border-black/5">
                  <Mail className="w-6 h-6 text-zinc-900" />
                  <p className="text-sm text-zinc-400">Email</p>
                  <a href={`mailto:${TAGGO_COMPANY.email}`} className="text-zinc-900 hover:underline font-medium text-center text-sm">
                    {TAGGO_COMPANY.email}
                  </a>
                </div>
                <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-zinc-50 border border-black/5">
                  <Phone className="w-6 h-6 text-zinc-900" />
                  <p className="text-sm text-zinc-400">Telefone</p>
                  <a href={`tel:${TAGGO_COMPANY.phoneTel}`} className="text-zinc-900 hover:underline font-medium">
                    {TAGGO_COMPANY.phone}
                  </a>
                </div>
                <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-zinc-50 border border-black/5 sm:col-span-1">
                  <MapPin className="w-6 h-6 text-zinc-900" />
                  <p className="text-sm text-zinc-400">Endereço</p>
                  <p className="font-medium text-sm text-center leading-relaxed">{TAGGO_COMPANY.address.formatted}</p>
                </div>
              </div>
              <Link to="/cadastro" className="btn-primary inline-flex">
                Experimentar o Propez
                <Rocket className="w-4 h-4" />
              </Link>
            </div>
          </Card>
        </div>
      </section>
    </MarketingLayout>
  );
}
