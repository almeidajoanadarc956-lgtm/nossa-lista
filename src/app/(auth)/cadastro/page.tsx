'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff, Mail, Lock, User, Loader2 } from 'lucide-react';

export default function CadastroPage() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem.');
      return;
    }

    if (senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setCarregando(true);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: { nome },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        setErro('Este e-mail já está cadastrado. Faça login.');
      } else {
        setErro('Erro ao criar conta. Tente novamente.');
      }
      setCarregando(false);
      return;
    }

    // Criar perfil
    if (data.user) {
      await supabase.from('perfis').upsert({
        id: data.user.id,
        nome,
        email,
      });
    }

    // Se email confirmation está desativado, redirecionar direto
    if (data.session) {
      router.push('/lista/configurar');
      router.refresh();
    } else {
      setSucesso(true);
    }
    setCarregando(false);
  };

  if (sucesso) {
    return (
      <div className="bg-white rounded-3xl shadow-xl p-8 text-center animate-slide-up">
        <div className="text-5xl mb-4">📧</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Verifique seu e-mail</h2>
        <p className="text-gray-500 text-sm">
          Enviamos um link de confirmação para <strong>{email}</strong>.
          Clique no link para ativar sua conta.
        </p>
        <Link href="/login" className="mt-6 inline-block text-green-600 font-medium text-sm hover:text-green-700">
          Voltar ao login
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl p-8 animate-slide-up">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Criar conta</h2>

      <form onSubmit={handleCadastro} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Como você se chama?
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome"
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              required
              autoComplete="name"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            E-mail
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              required
              autoComplete="email"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Senha
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type={verSenha ? 'text' : 'password'}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setVerSenha(!verSenha)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
            >
              {verSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Confirmar senha
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type={verSenha ? 'text' : 'password'}
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              placeholder="Repita a senha"
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              required
              autoComplete="new-password"
            />
          </div>
        </div>

        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 animate-fade-in">
            {erro}
          </div>
        )}

        <button
          type="submit"
          disabled={carregando}
          className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
        >
          {carregando ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Criando conta...
            </>
          ) : (
            'Criar conta'
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          Já tem conta?{' '}
          <Link href="/login" className="text-green-600 font-medium hover:text-green-700">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
}
