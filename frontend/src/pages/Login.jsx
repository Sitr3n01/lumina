import { useEffect, useRef, useState } from 'react';
import { LogIn, UserPlus, Eye, EyeOff } from 'lucide-react';
import { Button, Card, Checkbox, IconButton, Progress, TextField } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
import './Login.css';

/**
 * Entrada da aplicação. Duas telas no mesmo componente: `setup` no primeiro
 * acesso, `login` depois.
 *
 * A tela vive FORA do shell — sem rail, sem app bar. Não há para onde navegar
 * antes de entrar, e oferecer navegação inerte seria mentir sobre o estado.
 */
const Login = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState(null); // null = ainda perguntando ao servidor
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(
    localStorage.getItem('lumina_remember_login') !== 'false',
  );
  const primeiroCampoRef = useRef(null);

  const [form, setForm] = useState({
    username: localStorage.getItem('lumina_last_username') || '',
    email: '',
    password: '',
    full_name: '',
  });

  useEffect(() => {
    authAPI
      .checkSetup()
      .then(({ needs_setup }) => setMode(needs_setup ? 'setup' : 'login'))
      .catch(() => setMode('login'));
  }, []);

  // O foco vai para o primeiro campo assim que a tela existe. `autoFocus` no JSX
  // não serve: o campo só é montado depois da resposta do servidor.
  useEffect(() => {
    if (mode) primeiroCampoRef.current?.focus();
  }, [mode]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleRememberMeChange = (checked) => {
    setRememberMe(checked);
    localStorage.setItem('lumina_remember_login', checked ? 'true' : 'false');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'login') {
        if (rememberMe) localStorage.setItem('lumina_last_username', form.username);
        else localStorage.removeItem('lumina_last_username');
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
      setError(
        Array.isArray(msg)
          ? msg.map((x) => x.msg).join('. ')
          : msg || 'Erro ao processar. Verifique os dados e tente novamente.',
      );
      // Falhou: o foco volta ao primeiro campo, senão fica preso no botão e o
      // usuário de teclado precisa navegar de trás para frente para corrigir.
      primeiroCampoRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  if (mode === null) {
    return (
      <div className="login">
        <Card variant="elevated" className="login__card">
          <p className="login__marca">LUMINA</p>
          <Progress variant="circular" aria-label="Verificando a configuração" />
        </Card>
      </div>
    );
  }

  const isSetup = mode === 'setup';

  return (
    <div className="login">
      <Card variant="elevated" className="login__card" as="section">
        <header className="login__cabecalho">
          <h1 className="login__marca">LUMINA</h1>
          <p className="login__apoio">
            {isSetup
              ? 'Primeiro acesso — crie a conta de administrador'
              : 'Bem-vindo de volta'}
          </p>
        </header>

        <form className="login__form" onSubmit={handleSubmit} noValidate>
          <TextField
            ref={primeiroCampoRef}
            label={isSetup ? 'Nome de usuário' : 'Usuário'}
            name="username"
            value={form.username}
            onChange={handleChange}
            required
            autoComplete="username"
            placeholder={isSetup ? 'Escolha um nome de usuário' : 'Usuário ou e-mail'}
          />

          {isSetup ? (
            <>
              <TextField
                label="E-mail"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
                placeholder="voce@exemplo.com"
              />
              <TextField
                label="Nome completo"
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                help="Opcional. Aparece nos documentos gerados."
                autoComplete="name"
              />
            </>
          ) : null}

          <TextField
            label="Senha"
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            autoComplete={isSetup ? 'new-password' : 'current-password'}
            help={isSetup ? 'Mínimo de 8 caracteres, com 1 maiúscula e 1 número.' : undefined}
            trailingAction={
              // Sem `tabIndex={-1}`. A versão anterior tinha, o que tornava o
              // botão impossível de alcançar por teclado — justamente para quem
              // mais precisa conferir o que digitou.
              <IconButton
                density="compact"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </IconButton>
            }
          />

          {!isSetup ? (
            <Checkbox
              checked={rememberMe}
              onChange={(e) => handleRememberMeChange(e.target.checked)}
            >
              Manter sessão ativa
            </Checkbox>
          ) : null}

          {error ? (
            // `role="alert"` porque a mensagem aparece DEPOIS da ação e precisa
            // ser anunciada sem que o usuário vá procurá-la.
            <p className="login__erro" role="alert">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            fullWidth
            loading={loading}
            icon={isSetup ? <UserPlus /> : <LogIn />}
          >
            {isSetup ? 'Criar conta' : 'Entrar'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default Login;
