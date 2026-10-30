import React, { useState } from 'react';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { d1Client } from '../lib/d1Client';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError('Por favor, preencha o e-mail e a palavra-passe.');
      setLoading(false);
      return;
    }

    try {
      console.log('[Auth] Autenticação Cloudflare D1...');
      const d1Res = await d1Client.auth.login({ email: cleanEmail, password });
      
      if (d1Res.data?.user) {
        console.log('[Auth] Sessão iniciada com Cloudflare D1');
        onSuccess(d1Res.data.user);
        setLoading(false);
        return;
      }

      if (d1Res.error) {
        setError(d1Res.error.message || 'E-mail ou palavra-passe incorretos.');
      } else {
        setError('Não foi possível autenticar o utilizador. Verifique as suas credenciais.');
      }
    } catch (err: any) {
      setError(err?.message || 'Erro de conexão com o Cloudflare Worker. Tente novamente.');
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
          <div className="p-4 border border-red-200 rounded-lg text-[12px] bg-red-50 text-red-700">
            <p className="font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              {error}
            </p>
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
