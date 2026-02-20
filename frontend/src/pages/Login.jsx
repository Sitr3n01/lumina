import { useState, useEffect } from 'react';
import { LogIn, UserPlus, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';

const Login = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState(null); // null = carregando, 'login' | 'setup'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
  });

  // Verificar se e primeiro acesso ao montar
  useEffect(() => {
    authAPI.checkSetup()
      .then(({ needs_setup }) => setMode(needs_setup ? 'setup' : 'login'))
      .catch(() => setMode('login')); // fallback para login em caso de erro
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'login') {
        await login({ username: form.username, password: form.password });
      } else {
        await register({
          username: form.username,
          email: form.email,
          password: form.password,
          full_name: form.full_name || undefined,
        });
      }
    } catch (err) {
      const msg = err.response?.data?.detail;
      if (Array.isArray(msg)) {
        setError(msg.map((e) => e.msg).join('. '));
      } else {
        setError(msg || 'Erro ao processar. Verifique os dados e tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Tela de carregamento inicial (verificando setup-status)
  if (mode === null) {
    return (
      <div className="login-screen">
        <RefreshCw size={28} className="spin" style={{ color: 'var(--primary)' }} />
      </div>
    );
  }

  const isSetup = mode === 'setup';

  return (
    <div className="login-screen">
      <div className="login-card glass-card">
        <div className="login-header">
          <h1 className="login-title">LUMINA</h1>
          <p className="subtitle">
            {isSetup
              ? 'Primeiro acesso — crie sua conta de administrador'
              : 'Bem-vindo de volta'}
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label className="label">Username</label>
            <input
              className="input"
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder={isSetup ? 'Escolha um username' : 'Username ou email'}
              required
              autoComplete="username"
              autoFocus
            />
          </div>

          {isSetup && (
            <>
              <div className="form-field">
                <label className="label">Email</label>
                <input
                  className="input"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="seu@email.com"
                  required
                />
              </div>

              <div className="form-field">
                <label className="label">Nome completo <span style={{ color: 'var(--text-disable)' }}>(opcional)</span></label>
                <input
                  className="input"
                  type="text"
                  name="full_name"
                  value={form.full_name}
                  onChange={handleChange}
                  placeholder="Seu nome"
                />
              </div>
            </>
          )}

          <div className="form-field">
            <label className="label">Senha</label>
            <div style={{ position: 'relative' }}>
              <input
                className="input"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder={isSetup ? 'Mín. 8 chars, 1 maiúscula, 1 número' : 'Sua senha'}
                required
                autoComplete={isSetup ? 'new-password' : 'current-password'}
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: 'absolute', right: '10px', top: '50%',
                  transform: 'translateY(-50%)', background: 'none',
                  border: 'none', cursor: 'pointer', color: 'var(--text-disable)',
                  padding: 0, display: 'flex',
                }}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="message message-error" style={{ margin: 0 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: '4px' }}
          >
            {loading
              ? <RefreshCw size={16} className="spin" />
              : isSetup
                ? <><UserPlus size={16} /> Criar conta</>
                : <><LogIn size={16} /> Entrar</>
            }
          </button>
        </form>
      </div>

      <style>{`
        .login-screen {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--background, #f8fafc);
          padding: 24px;
        }
        .login-card {
          width: 100%;
          max-width: 400px;
        }
        .login-header {
          text-align: center;
          margin-bottom: 28px;
        }
        .login-title {
          font-size: 28px;
          font-weight: 800;
          color: var(--primary);
          letter-spacing: 3px;
          margin: 0 0 8px;
        }
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
      `}</style>
    </div>
  );
};

export default Login;
