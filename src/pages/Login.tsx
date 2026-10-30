import React, { useState } from 'react';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LoginProps {
  onSuccess: (user: any) => void;
  onNavigateRegister: () => void;
  onBack: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess, onNavigateRegister, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResend, setShowResend] = useState(false);

  const resendConfirmation = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });
      if (error) throw error;
      setError('Email de confirmação reenviado com sucesso.');
      setShowResend(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao reenviar email.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setShowResend(false);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError('Por favor, preencha o e-mail e a palavra-passe.');
      setLoading(false);
      return;
    }

    try {
      // 1. Try Supabase auth with 3.5s timeout for network resilience (HTTP 504 protection)
      const signInPromise = supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) => 
        setTimeout(() => resolve({ 
          data: { user: null }, 
          error: { status: 504, message: '504 Gateway Timeout' } 
        }), 3500)
      );

      const { data, error: signInError } = await Promise.race([signInPromise, timeoutPromise]);

      if (signInError) {
        if (signInError.message?.includes('Email not confirmed')) {
          setError('A sua conta ainda não foi confirmada. Verifique o seu email.');
          setShowResend(true);
        } else if (signInError.message?.includes('Invalid login credentials') || signInError.message?.includes('invalid')) {
          setError('E-mail ou palavra-passe incorretos.');
        } else {
          setError(signInError.message || 'Erro ao realizar login.');
        }
        setLoading(false);
        return;
      }

      if (data?.user) {
        onSuccess(data.user);
      } else {
        setError('Erro desconhecido ao autenticar.');
      }
    } catch (err: any) {
      setError('Erro de conexão com o servidor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 sm:p-20">
      <div className="max-w-[400px] w-full space-y-12">
        
        <button
          onClick={onBack}
          className="text-[12px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
        >
          ← Voltar
        </button>

        <div className="space-y-4">
          <span className="feature-kicker m-0">Acesso Restrito</span>
          <h1 className="text-[32px] font-black tracking-tight leading-none uppercase">KONECTA</h1>
          <p className="editorial-body text-[14px]">Insira as suas credenciais para aceder à rede de inovação.</p>
        </div>

        {error && (
          <div className={`p-4 border border-black/10 rounded-lg text-[12px] ${showResend ? 'bg-amber-50' : 'bg-red-50 text-red-700'}`}>
            <p className="font-bold mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </p>
            {showResend && (
              <button onClick={resendConfirmation} className="underline font-black">Reenviar email de confirmação</button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            className="w-full bg-white border border-black/10 px-4 py-3 text-[14px] focus:outline-none focus:border-black"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Palavra-passe"
            className="w-full bg-white border border-black/10 px-4 py-3 text-[14px] focus:outline-none focus:border-black"
          />

          <button
            type="submit"
            disabled={loading}
            className="pill-button-black w-full justify-center py-4"
          >
            {loading ? 'A verificar credenciais...' : 'Entrar na conta →'}
          </button>
        </form>

        <div className="text-center">
          <button
            onClick={onNavigateRegister}
            className="text-[12px] font-bold underline decoration-1 underline-offset-4"
          >
            Ainda não tem conta? Criar conta gratuita
          </button>
        </div>
      </div>
    </div>
  );
};
