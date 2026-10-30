import React, { useState } from 'react';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

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

  const provinces = ['Luanda', 'Benguela', 'Huíla', 'Cabinda', 'Huambo', 'Bié', 'Uíge', 'Cuanza Sul', 'Namibe', 'Malanje', 'Zaire', 'Lunda Norte', 'Lunda Sul', 'Moxico', 'Cuando Cubango', 'Cuanza Norte', 'Bengo', 'Cunene'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanFullName = fullName.trim() || cleanEmail.split('@')[0];

    if (!cleanEmail || !password || password.length < 6) {
      setError('Por favor, insira um e-mail válido e uma palavra-passe com pelo menos 6 caracteres.');
      setLoading(false);
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanFullName,
            province,
            municipality,
          }
        }
      });

      if (signUpError) {
        setError(signUpError.message || 'Erro ao realizar registo.');
        setLoading(false);
        return;
      }

      if (data?.user) {
        if (data.user.identities?.length === 0) {
          setError('Este e-mail já está registado.');
        } else {
          setError('Registo realizado com sucesso! Verifique o seu e-mail para confirmar a conta.');
        }
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
          <span className="feature-kicker m-0">Adesão Oficial</span>
          <h1 className="text-[32px] font-black tracking-tight leading-none uppercase">KONECTA</h1>
          <p className="editorial-body text-[14px]">Cria o teu perfil com e-mail e palavra-passe para começares a impactar Angola.</p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-black/10 rounded-lg text-[12px] text-red-700">
            <p className="font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </p>
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
