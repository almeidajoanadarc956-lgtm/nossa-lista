'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Plus, Hash, Loader2, Users, ArrowRight } from 'lucide-react';

export default function ConfigurarListaPage() {
  const router = useRouter();
  const [aba, setAba] = useState<'criar' | 'entrar'>('criar');
  const [nomeLista, setNomeLista] = useState('Nossa Lista');
  const [codigoConvite, setCodigoConvite] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const criarLista = async () => {
    setCarregando(true);
    setErro('');
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Gerar código de convite
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const codigo = Array.from({ length: 6 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');

    // Criar lista
    const { data: lista, error: errLista } = await supabase
      .from('listas')
      .insert({ nome: nomeLista, codigo_convite: codigo, criado_por: user.id })
      .select()
      .single();

    if (errLista || !lista) {
      setErro('Erro ao criar lista. Tente novamente.');
      setCarregando(false);
      return;
    }

    // Adicionar como participante
    await supabase.from('participantes').insert({
      lista_id: lista.id,
      user_id: user.id,
    });

    // Atualizar perfil com lista_id
    await supabase
      .from('perfis')
      .update({ lista_id: lista.id })
      .eq('id', user.id);

    router.push('/lista');
    router.refresh();
  };

  const entrarNaLista = async () => {
    if (codigoConvite.trim().length !== 6) {
      setErro('O código deve ter 6 caracteres.');
      return;
    }

    setCarregando(true);
    setErro('');
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Buscar lista pelo código
    const { data: lista, error } = await supabase
      .from('listas')
      .select('*')
      .eq('codigo_convite', codigoConvite.toUpperCase().trim())
      .single();

    if (error || !lista) {
      setErro('Código inválido. Verifique e tente novamente.');
      setCarregando(false);
      return;
    }

    // Verificar se já é participante
    const { data: jaParticipante } = await supabase
      .from('participantes')
      .select('id')
      .eq('lista_id', lista.id)
      .eq('user_id', user.id)
      .single();

    if (!jaParticipante) {
      // Adicionar como participante
      const { error: errPart } = await supabase.from('participantes').insert({
        lista_id: lista.id,
        user_id: user.id,
      });

      if (errPart) {
        setErro('Erro ao entrar na lista. Tente novamente.');
        setCarregando(false);
        return;
      }
    }

    // Atualizar perfil com lista_id
    await supabase
      .from('perfis')
      .update({ lista_id: lista.id })
      .eq('id', user.id);

    router.push('/lista');
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-2xl shadow-lg mb-4">
            <span className="text-3xl">🛒</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Configurar Lista</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Crie uma lista nova ou entre em uma existente
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden animate-slide-up">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => { setAba('criar'); setErro(''); }}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                aba === 'criar'
                  ? 'text-green-600 border-b-2 border-green-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Plus className="w-4 h-4 inline mr-1" />
              Criar nova lista
            </button>
            <button
              onClick={() => { setAba('entrar'); setErro(''); }}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                aba === 'entrar'
                  ? 'text-green-600 border-b-2 border-green-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="w-4 h-4 inline mr-1" />
              Entrar com código
            </button>
          </div>

          <div className="p-6">
            {aba === 'criar' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nome da lista
                  </label>
                  <input
                    type="text"
                    value={nomeLista}
                    onChange={(e) => setNomeLista(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                    placeholder="Ex: Nossa Lista de Compras"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Um código de convite será gerado automaticamente para você compartilhar com seu parceiro(a).
                </p>
                {erro && (
                  <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3">
                    {erro}
                  </div>
                )}
                <button
                  onClick={criarLista}
                  disabled={carregando || !nomeLista.trim()}
                  className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {carregando ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Criar lista
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Código de convite
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={codigoConvite}
                      onChange={(e) => setCodigoConvite(e.target.value.toUpperCase())}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 tracking-widest font-mono text-lg"
                      placeholder="XXXXXX"
                      maxLength={6}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Peça o código de 6 letras para a pessoa que criou a lista.
                </p>
                {erro && (
                  <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3">
                    {erro}
                  </div>
                )}
                <button
                  onClick={entrarNaLista}
                  disabled={carregando || codigoConvite.length !== 6}
                  className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {carregando ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Entrar na lista
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
