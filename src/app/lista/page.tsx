'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Produto, Categoria, FiltroCategoria } from '@/types';
import { CATEGORIAS } from '@/lib/utils';
import {
  Plus, Mic, MicOff, ShoppingCart, CheckCircle2, Trash2,
  Filter, RefreshCw, Wifi, WifiOff, Share2, LogOut,
  ChevronDown, ChevronUp, Pencil, X, Check, Loader2
} from 'lucide-react';
import clsx from 'clsx';

interface ListaState {
  listaId: string;
  listaInfo: { nome: string; codigo_convite: string } | null;
  produtos: Produto[];
  userId: string;
  userName: string;
}

export default function ListaPage() {
  const supabase = createClient();

  // Estado principal
  const [state, setState] = useState<ListaState | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  // Estado do formulário de adição
  const [nomeProduto, setNomeProduto] = useState('');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<Categoria>('supermercado');
  const [adicionando, setAdicionando] = useState(false);

  // Estado de filtros e UI
  const [filtro, setFiltro] = useState<FiltroCategoria>('todos');
  const [verComprados, setVerComprados] = useState(false);
  const [limpando, setLimpando] = useState(false);
  const [confirmarLimpar, setConfirmarLimpar] = useState(false);

  // Estado de edição
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nomeEditado, setNomeEditado] = useState('');
  const [categoriaEditada, setCategoriaEditada] = useState<Categoria>('supermercado');

  // Estado de voz
  const [ouvindo, setOuvindo] = useState(false);
  const [suportaVoz, setSuportaVoz] = useState(false);
  const reconhecimentoRef = useRef<SpeechRecognition | null>(null);

  // Estado de conexão
  const [online, setOnline] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);

  // Estado do menu compartilhar
  const [mostrarCompartilhar, setMostrarCompartilhar] = useState(false);
  const [copiado, setCopiado] = useState(false);

  // Verificar suporte a reconhecimento de voz
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      setSuportaVoz(!!SpeechRecognition);
    }
  }, []);

  // Monitor de conexão
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setOnline(navigator.onLine);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Carregar dados iniciais
  const carregarDados = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: perfil } = await supabase
      .from('perfis')
      .select('lista_id, nome')
      .eq('id', user.id)
      .single();

    if (!perfil?.lista_id) {
      window.location.href = '/lista/configurar';
      return;
    }

    const { data: listaInfo } = await supabase
      .from('listas')
      .select('nome, codigo_convite')
      .eq('id', perfil.lista_id)
      .single();

    const { data: produtos } = await supabase
      .from('produtos')
      .select('*')
      .eq('lista_id', perfil.lista_id)
      .order('criado_em', { ascending: false });

    setState({
      listaId: perfil.lista_id,
      listaInfo,
      produtos: produtos || [],
      userId: user.id,
      userName: perfil.nome || user.email || 'Você',
    });
    setCarregando(false);
  }, [supabase]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Realtime subscription
  useEffect(() => {
    if (!state?.listaId) return;

    const channel = supabase
      .channel(`lista-${state.listaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'produtos',
          filter: `lista_id=eq.${state.listaId}`,
        },
        (payload) => {
          setSincronizando(true);
          setTimeout(() => setSincronizando(false), 1000);

          if (payload.eventType === 'INSERT') {
            setState(prev => prev ? {
              ...prev,
              produtos: [payload.new as Produto, ...prev.produtos],
            } : prev);
          } else if (payload.eventType === 'UPDATE') {
            setState(prev => prev ? {
              ...prev,
              produtos: prev.produtos.map(p =>
                p.id === payload.new.id ? payload.new as Produto : p
              ),
            } : prev);
          } else if (payload.eventType === 'DELETE') {
            setState(prev => prev ? {
              ...prev,
              produtos: prev.produtos.filter(p => p.id !== payload.old.id),
            } : prev);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [state?.listaId, supabase]);

  // Adicionar produto
  const adicionarProduto = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!nomeProduto.trim() || !state) return;

    setAdicionando(true);
    const { error } = await supabase.from('produtos').insert({
      lista_id: state.listaId,
      nome: nomeProduto.trim(),
      categoria: categoriaSelecionada,
      comprado: false,
      criado_por: state.userId,
      criado_por_nome: state.userName,
    });

    if (!error) {
      setNomeProduto('');
    }
    setAdicionando(false);
  };

  // Marcar/desmarcar comprado
  const toggleComprado = async (produto: Produto) => {
    await supabase
      .from('produtos')
      .update({ comprado: !produto.comprado, atualizado_em: new Date().toISOString() })
      .eq('id', produto.id);
  };

  // Deletar produto
  const deletarProduto = async (id: string) => {
    await supabase.from('produtos').delete().eq('id', id);
  };

  // Iniciar edição
  const iniciarEdicao = (produto: Produto) => {
    setEditandoId(produto.id);
    setNomeEditado(produto.nome);
    setCategoriaEditada(produto.categoria);
  };

  // Salvar edição
  const salvarEdicao = async () => {
    if (!nomeEditado.trim() || !editandoId) return;
    await supabase
      .from('produtos')
      .update({
        nome: nomeEditado.trim(),
        categoria: categoriaEditada,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', editandoId);
    setEditandoId(null);
  };

  // Limpar comprados
  const limparComprados = async () => {
    if (!state) return;
    setLimpando(true);
    const comprados = state.produtos.filter(p => p.comprado).map(p => p.id);
    for (const id of comprados) {
      await supabase.from('produtos').delete().eq('id', id);
    }
    setConfirmarLimpar(false);
    setLimpando(false);
  };

  // Reconhecimento de voz
  const toggleVoz = () => {
    if (!suportaVoz) return;

    if (ouvindo) {
      reconhecimentoRef.current?.stop();
      setOuvindo(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.lang = 'pt-BR';
    rec.continuous = false;
    rec.interimResults = false;

    rec.onresult = (event) => {
      const texto = event.results[0][0].transcript.toLowerCase();
      // Remover "adicionar" do início se presente
      const nomeLimpo = texto
        .replace(/^(adicionar|adicione|incluir|inclua)\s+/i, '')
        .trim();

      // Detectar categoria por voz
      if (nomeLimpo.includes('supermercado') || nomeLimpo.includes('mercado')) {
        setCategoriaSelecionada('supermercado');
      } else if (nomeLimpo.includes('depósito') || nomeLimpo.includes('deposito') || nomeLimpo.includes('construção')) {
        setCategoriaSelecionada('deposito');
      } else if (nomeLimpo.includes('outros') || nomeLimpo.includes('outro')) {
        setCategoriaSelecionada('outros');
      }

      const nomeFinal = nomeLimpo
        .replace(/(no\s+)?(supermercado|mercado|depósito|deposito|construção|outros?)/gi, '')
        .trim();

      if (nomeFinal) {
        setNomeProduto(nomeFinal.charAt(0).toUpperCase() + nomeFinal.slice(1));
      }
      setOuvindo(false);
    };

    rec.onerror = () => setOuvindo(false);
    rec.onend = () => setOuvindo(false);

    reconhecimentoRef.current = rec;
    rec.start();
    setOuvindo(true);
  };

  // Copiar código de convite
  const copiarCodigo = () => {
    if (!state?.listaInfo) return;
    const texto = `Código de convite para nossa lista: ${state.listaInfo.codigo_convite}`;
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  // Logout
  const sair = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  // Filtrar e agrupar produtos
  const produtosPendentes = (state?.produtos || [])
    .filter(p => !p.comprado)
    .filter(p => filtro === 'todos' || p.categoria === filtro);

  const produtosComprados = (state?.produtos || [])
    .filter(p => p.comprado)
    .filter(p => filtro === 'todos' || p.categoria === filtro);

  const totalPendentes = (state?.produtos || []).filter(p => !p.comprado).length;
  const totalComprados = (state?.produtos || []).filter(p => p.comprado).length;

  const produtosPorCategoria = (['supermercado', 'deposito', 'outros'] as Categoria[])
    .map(cat => ({
      categoria: cat,
      info: CATEGORIAS[cat],
      items: produtosPendentes.filter(p => p.categoria === cat),
    }))
    .filter(g => g.items.length > 0);

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-4">
            <ShoppingCart className="w-8 h-8 text-green-500 animate-pulse" />
          </div>
          <p className="text-gray-500">Carregando lista...</p>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <p className="text-red-600 mb-4">{erro}</p>
          <button onClick={carregarDados} className="bg-green-500 text-white px-6 py-3 rounded-xl">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 safe-top shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛒</span>
            <div>
              <h1 className="font-bold text-gray-900 leading-none text-lg">
                {state?.listaInfo?.nome || 'Nossa Lista'}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                {/* Indicador de conexão */}
                {!online ? (
                  <span className="flex items-center gap-1 text-xs text-red-500">
                    <WifiOff className="w-3 h-3" />
                    Offline
                  </span>
                ) : sincronizando ? (
                  <span className="flex items-center gap-1 text-xs text-green-500">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Sincronizando
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-green-500">
                    <Wifi className="w-3 h-3" />
                    Online
                  </span>
                )}

                {/* Contadores */}
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500">
                  {totalPendentes} pendente{totalPendentes !== 1 ? 's' : ''}
                </span>
                {totalComprados > 0 && (
                  <>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-500">
                      {totalComprados} comprado{totalComprados !== 1 ? 's' : ''}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Botão compartilhar */}
            <div className="relative">
              <button
                onClick={() => setMostrarCompartilhar(!mostrarCompartilhar)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                title="Compartilhar lista"
              >
                <Share2 className="w-5 h-5" />
              </button>

              {mostrarCompartilhar && (
                <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-64 z-50 animate-fade-in">
                  <p className="text-sm font-medium text-gray-700 mb-1">Código de convite</p>
                  <p className="text-xs text-gray-500 mb-3">
                    Compartilhe este código com seu parceiro(a)
                  </p>
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center mb-3">
                    <span className="text-2xl font-bold font-mono tracking-widest text-green-700">
                      {state?.listaInfo?.codigo_convite}
                    </span>
                  </div>
                  <button
                    onClick={copiarCodigo}
                    className="w-full bg-green-500 text-white text-sm py-2.5 rounded-xl font-medium hover:bg-green-600 transition-colors"
                  >
                    {copiado ? '✓ Copiado!' : 'Copiar código'}
                  </button>
                </div>
              )}
            </div>

            {/* Botão sair */}
            <button
              onClick={sair}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Formulário de adicionar */}
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <form onSubmit={adicionarProduto} className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={nomeProduto}
                onChange={(e) => setNomeProduto(e.target.value)}
                placeholder={ouvindo ? '🎙️ Ouvindo...' : 'Adicionar produto...'}
                className={clsx(
                  "w-full pl-4 pr-10 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-400 text-sm transition-colors",
                  ouvindo ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"
                )}
                disabled={ouvindo}
              />
              {suportaVoz && (
                <button
                  type="button"
                  onClick={toggleVoz}
                  className={clsx(
                    "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors",
                    ouvindo
                      ? "text-red-500 bg-red-100 animate-pulse-soft"
                      : "text-gray-400 hover:text-green-500 hover:bg-green-50"
                  )}
                >
                  {ouvindo ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              )}
            </div>

            {/* Selector de categoria */}
            <select
              value={categoriaSelecionada}
              onChange={(e) => setCategoriaSelecionada(e.target.value as Categoria)}
              className="border border-gray-200 rounded-xl px-3 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-700"
            >
              <option value="supermercado">🛒 Super</option>
              <option value="deposito">🏗️ Depósito</option>
              <option value="outros">📦 Outros</option>
            </select>

            <button
              type="submit"
              disabled={!nomeProduto.trim() || adicionando}
              className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white p-3 rounded-xl transition-colors flex items-center justify-center min-w-[48px]"
            >
              {adicionando ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
            </button>
          </form>
        </div>

        {/* Filtros */}
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setFiltro('todos')}
              className={clsx(
                "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                filtro === 'todos'
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              Todos
            </button>
            {(['supermercado', 'deposito', 'outros'] as Categoria[]).map(cat => (
              <button
                key={cat}
                onClick={() => setFiltro(cat)}
                className={clsx(
                  "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  filtro === cat
                    ? "text-white"
                    : "text-gray-600 hover:bg-gray-200",
                  filtro === cat && cat === 'supermercado' && "bg-emerald-500",
                  filtro === cat && cat === 'deposito' && "bg-amber-500",
                  filtro === cat && cat === 'outros' && "bg-violet-500",
                  filtro !== cat && "bg-gray-100"
                )}
              >
                {CATEGORIAS[cat].emoji} {CATEGORIAS[cat].label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="max-w-2xl mx-auto px-4 pt-4">
        {/* Overlay para fechar dropdown */}
        {mostrarCompartilhar && (
          <div className="fixed inset-0 z-20" onClick={() => setMostrarCompartilhar(false)} />
        )}

        {/* Lista vazia */}
        {produtosPendentes.length === 0 && produtosComprados.length === 0 && (
          <div className="text-center py-16 animate-fade-in">
            <div className="text-5xl mb-4">🛍️</div>
            <h3 className="text-gray-600 font-medium mb-1">Lista vazia</h3>
            <p className="text-gray-400 text-sm">
              Adicione o primeiro produto acima!
            </p>
          </div>
        )}

        {/* Produtos pendentes por categoria */}
        {produtosPorCategoria.length > 0 && (
          <div className="space-y-4">
            {produtosPorCategoria.map(({ categoria, info, items }) => (
              <div key={categoria} className="animate-fade-in">
                {/* Cabeçalho da categoria */}
                <div className={clsx(
                  "flex items-center gap-2 px-3 py-2 rounded-xl mb-2 border",
                  info.bgClass
                )}>
                  <span>{info.emoji}</span>
                  <span className={clsx("text-xs font-bold uppercase tracking-wide", info.textClass)}>
                    {info.label}
                  </span>
                  <span className={clsx("ml-auto text-xs font-medium px-2 py-0.5 rounded-full border", info.badgeClass)}>
                    {items.length}
                  </span>
                </div>

                {/* Itens */}
                <div className="space-y-1.5">
                  {items.map(produto => (
                    <ItemProduto
                      key={produto.id}
                      produto={produto}
                      editandoId={editandoId}
                      nomeEditado={nomeEditado}
                      categoriaEditada={categoriaEditada}
                      onToggle={() => toggleComprado(produto)}
                      onDelete={() => deletarProduto(produto.id)}
                      onIniciarEdicao={() => iniciarEdicao(produto)}
                      onCancelarEdicao={() => setEditandoId(null)}
                      onSalvarEdicao={salvarEdicao}
                      onNomeEditadoChange={setNomeEditado}
                      onCategoriaEditadaChange={setCategoriaEditada}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Produtos sem categoria mostrada */}
        {produtosPendentes.length > 0 && produtosPorCategoria.length === 0 && filtro !== 'todos' && (
          <div className="text-center py-8 text-gray-400 text-sm">
            Nenhum item pendente em "{CATEGORIAS[filtro as Categoria]?.label}"
          </div>
        )}

        {/* Seção comprados */}
        {produtosComprados.length > 0 && (
          <div className="mt-6 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setVerComprados(!verComprados)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 font-medium"
              >
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Comprados ({produtosComprados.length})
                {verComprados ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {verComprados && (
                <button
                  onClick={() => setConfirmarLimpar(true)}
                  className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 font-medium"
                >
                  <Trash2 className="w-3 h-3" />
                  Limpar
                </button>
              )}
            </div>

            {verComprados && (
              <div className="space-y-1.5 opacity-70">
                {produtosComprados.map(produto => (
                  <ItemProduto
                    key={produto.id}
                    produto={produto}
                    editandoId={editandoId}
                    nomeEditado={nomeEditado}
                    categoriaEditada={categoriaEditada}
                    onToggle={() => toggleComprado(produto)}
                    onDelete={() => deletarProduto(produto.id)}
                    onIniciarEdicao={() => iniciarEdicao(produto)}
                    onCancelarEdicao={() => setEditandoId(null)}
                    onSalvarEdicao={salvarEdicao}
                    onNomeEditadoChange={setNomeEditado}
                    onCategoriaEditadaChange={setCategoriaEditada}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal confirmar limpar */}
      {confirmarLimpar && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm animate-slide-up">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🗑️</div>
              <h3 className="font-semibold text-gray-900 text-lg">Limpar itens comprados?</h3>
              <p className="text-gray-500 text-sm mt-1">
                {produtosComprados.length} iten{produtosComprados.length !== 1 ? 's' : ''} será{produtosComprados.length !== 1 ? 'ão' : ''} removido{produtosComprados.length !== 1 ? 's' : ''} permanentemente.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmarLimpar(false)}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={limparComprados}
                disabled={limpando}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium flex items-center justify-center gap-2"
              >
                {limpando ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Limpar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente de item de produto
interface ItemProdutoProps {
  produto: Produto;
  editandoId: string | null;
  nomeEditado: string;
  categoriaEditada: Categoria;
  onToggle: () => void;
  onDelete: () => void;
  onIniciarEdicao: () => void;
  onCancelarEdicao: () => void;
  onSalvarEdicao: () => void;
  onNomeEditadoChange: (v: string) => void;
  onCategoriaEditadaChange: (v: Categoria) => void;
}

function ItemProduto({
  produto,
  editandoId,
  nomeEditado,
  categoriaEditada,
  onToggle,
  onDelete,
  onIniciarEdicao,
  onCancelarEdicao,
  onSalvarEdicao,
  onNomeEditadoChange,
  onCategoriaEditadaChange,
}: ItemProdutoProps) {
  const estaEditando = editandoId === produto.id;
  const catInfo = CATEGORIAS[produto.categoria];

  const formatarData = (dataISO: string): string => {
    const data = new Date(dataISO);
    const agora = new Date();
    const diff = agora.getTime() - data.getTime();
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(diff / 3600000);
    const dias = Math.floor(diff / 86400000);
    if (minutos < 1) return 'agora';
    if (minutos < 60) return `há ${minutos}min`;
    if (horas < 24) return `há ${horas}h`;
    if (dias < 7) return `há ${dias}d`;
    return data.toLocaleDateString('pt-BR');
  };

  if (estaEditando) {
    return (
      <div className="bg-white border-2 border-green-300 rounded-xl p-3 animate-fade-in">
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={nomeEditado}
            onChange={(e) => onNomeEditadoChange(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm text-gray-900"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSalvarEdicao();
              if (e.key === 'Escape') onCancelarEdicao();
            }}
          />
          <select
            value={categoriaEditada}
            onChange={(e) => onCategoriaEditadaChange(e.target.value as Categoria)}
            className="border border-gray-200 rounded-lg px-2 py-2 text-xs bg-white focus:outline-none"
          >
            <option value="supermercado">🛒</option>
            <option value="deposito">🏗️</option>
            <option value="outros">📦</option>
          </select>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancelarEdicao} className="text-xs text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-100 flex items-center gap-1">
            <X className="w-3 h-3" /> Cancelar
          </button>
          <button onClick={onSalvarEdicao} className="text-xs text-green-600 font-medium px-3 py-1.5 rounded-lg hover:bg-green-50 flex items-center gap-1">
            <Check className="w-3 h-3" /> Salvar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx(
      "bg-white border border-gray-100 rounded-xl px-3 py-3 flex items-center gap-3 group hover:border-gray-200 transition-colors animate-fade-in",
      produto.comprado && "opacity-60"
    )}>
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={clsx(
          "w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors",
          produto.comprado
            ? "bg-green-500 border-green-500 text-white"
            : "border-gray-300 hover:border-green-400"
        )}
      >
        {produto.comprado && <Check className="w-3.5 h-3.5" />}
      </button>

      {/* Nome e info */}
      <div className="flex-1 min-w-0">
        <span className={clsx(
          "text-gray-900 text-sm font-medium block truncate",
          produto.comprado && "line-through text-gray-400"
        )}>
          {produto.nome}
        </span>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={clsx("text-xs px-1.5 py-0.5 rounded border", catInfo.badgeClass)}>
            {catInfo.emoji} {catInfo.label}
          </span>
          <span className="text-xs text-gray-400">
            {produto.criado_por_nome} · {formatarData(produto.criado_em)}
          </span>
        </div>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!produto.comprado && (
          <button
            onClick={onIniciarEdicao}
            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={onDelete}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
