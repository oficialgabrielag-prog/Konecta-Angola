import React, { useState } from 'react';
import { ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { d1Client } from '../lib/d1Client';

interface RegisterProps {
  onSuccess: (user: any) => void;
  onNavigateLogin: () => void;
  onBack: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onSuccess, onNavigateLogin, onBack }) => {
  const [fullName, setFullName] = useState('');
  const [province, setProvince] = useState('Luanda');
  const [municipality, setMunicipality] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const provinces = ['Luanda', 'Benguela', 'Huíla', 'Cabinda', 'Huambo', 'Bié', 'Uíge', 'Cuanza Sul', 'Namibe', 'Malanje', 'Zaire', 'Lunda Norte', 'Lunda Sul', 'Moxico', 'Cuando Cubango', 'Cuanza Norte', 'Bengo', 'Cunene'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanFullName = fullName.trim() || cleanEmail.split('@')[0];

    if (!cleanEmail || !password || password.length < 6) {
      setError('Por favor, insira um e-mail válido e uma palavra-passe com pelo menos 6 caracteres.');
      setLoading(false);
      return;
    }

    try {
      console.log('[Auth] Registo oficial Cloudflare D1...');
      const d1Res = await d1Client.auth.register({
        email: cleanEmail,
        password,
        full_name: cleanFullName,
        province,
        municipality
      });

      if (d1Res.data?.user) {
        console.log('[Auth] Conta registada com sucesso no D1');
        onSuccess(d1Res.data.user);
        setLoading(false);
        return;
      }

      if (d1Res.error) {
        if (d1Res.error.status === 409 || d1Res.error.message?.includes('já está registado')) {
          setError('Este e-mail já está registado. Por favor, tente iniciar sessão.');
        } else {
          setError(d1Res.error.message || 'Erro ao realizar registo no Cloudflare D1.');
        }
      } else {
        setError('Não foi possível concluir o registo. Tente novamente.');
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
          <span className="feature-kicker m-0">Adesão Oficial</span>
          <h1 className="text-[32px] font-black tracking-tight leading-none uppercase">KONECTA</h1>
          <p className="editorial-body text-[14px]">Cria o teu perfil com e-mail e palavra-passe para começares a impactar Angola.</p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-700">
            <p className="font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              {error}
            </p>
          </div>
        )}

        {successMessage && (
          <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl text-[13px] text-emerald-900 space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-emerald-950">Conta Criada com Sucesso!</p>
                <p className="text-emerald-800 leading-relaxed text-[12px]">{successMessage}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onNavigateLogin}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              Ir para Iniciar Sessão →
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nome Completo"
            className="w-full bg-white border border-black/10 px-4 py-3 text-[14px] focus:outline-none focus:border-black"
          />

          <div className="grid grid-cols-2 gap-4">
            <select
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className="w-full bg-white border border-black/10 px-4 py-3 text-[14px] focus:outline-none focus:border-black"
            >
              {provinces.map((prov) => (
                <option key={prov} value={prov}>{prov}</option>
              ))}
            </select>
            <input
              type="text"
              value={municipality}
              onChange={(e) => setMunicipality(e.target.value)}
              placeholder="Município"
              className="w-full bg-white border border-black/10 px-4 py-3 text-[14px] focus:outline-none focus:border-black"
            />
          </div>

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
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Palavra-passe (mín. 6 caracteres)"
            className="w-full bg-white border border-black/10 px-4 py-3 text-[14px] focus:outline-none focus:border-black"
          />

          <button
            type="submit"
            disabled={loading}
            className="pill-button-black w-full justify-center py-4"
          >
            {loading ? 'A criar conta...' : 'Concluir Cadastro →'}
          </button>
        </form>

        <div className="text-center">
          <button
            onClick={onNavigateLogin}
            className="text-[12px] font-bold underline decoration-1 underline-offset-4"
          >
            Já possui conta? Iniciar sessão
          </button>
        </div>
      </div>
    </div>
  );
};
