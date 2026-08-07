import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button, EmptyState } from './ui';

/**
 * Fronteira de erro de renderização.
 *
 * Era o último componente fora do design system: desenhava a si mesmo com dez
 * propriedades `style={{}}`, consumia `var(--warning)` e `var(--text-muted)` — nomes da
 * ponte legada — e usava `className="btn btn-primary"`, as duas últimas classes vivas de
 * `global.css`. Eram elas que seguravam o arquivo inteiro de pé.
 *
 * `EmptyState` é o primitivo certo aqui: uma ausência explicada, com a saída ao lado.
 * É a mesma forma de qualquer outra tela vazia do produto, o que importa justamente num
 * componente que só aparece quando algo já deu errado.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <EmptyState
          icon={<AlertTriangle aria-hidden="true" />}
          title="Algo deu errado"
          description="Ocorreu um erro inesperado nesta seção. Tente carregar de novo."
          action={
            <Button variant="filled" icon={<RefreshCw />} onClick={this.handleReset}>
              Tentar novamente
            </Button>
          }
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
