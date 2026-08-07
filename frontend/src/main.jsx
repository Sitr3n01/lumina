import React from 'react'
import ReactDOM from 'react-dom/client'

/* Ordem da cascata — ver docs/design-system/07-implementacao.md §2.
   `layers.css` vem primeiro porque registra a ordem das camadas antes de
   qualquer regra chegar; a partir daí a ordem dos imports deixa de decidir
   quem vence. O CSS de página ainda é importado pelos componentes e continua
   fora de camada — sem camada vence todas as camadas, que é o que uma folha
   específica de página deve fazer. Cada página migrada passa a declarar
   `@layer lm.overrides` e entra na ordem. */
import './styles/layers.css'
import './styles/tokens/primitives.css'
import './styles/tokens/semantic.css'
import './styles/tokens/components.css'
import './styles/reset.css'
import './styles/base.css'

import App from './App.jsx'
import { AppearanceProvider } from './contexts/AppearanceContext'

const root = ReactDOM.createRoot(document.getElementById('root'))

/* Bancadas de desenvolvimento: #ui (primitivos), #shell (navegação) e #pages
   (as dez telas com a API dublada).

   Carregadas por `import()` DINÂMICO, e não por import estático. A diferença não
   é de estilo: com import estático o Rollup mantém os módulos no pacote mesmo com
   `import.meta.env.DEV` valendo `false`, porque a referência existe. O resultado
   medido foi que os dados falsos ("Ana Ribeiro", "proprietaria@exemplo.com")
   apareciam no bundle de produção — e, como `PageSandbox` chama `instalarDubles()`
   no escopo do módulo, a API REAL seria substituída pelos dublês no aplicativo
   publicado. Com import dinâmico dentro de um ramo estaticamente falso, o Rollup
   descarta os três módulos inteiros. */
const BANCADAS = {
  '#ui': () => import('./dev/UISandbox.jsx'),
  '#shell': () => import('./dev/ShellSandbox.jsx'),
  '#pages': () => import('./dev/PageSandbox.jsx'),
}

const carregarBancada = import.meta.env.DEV ? BANCADAS[window.location.hash] : undefined

if (carregarBancada) {
  carregarBancada().then(({ default: Bancada }) => {
    root.render(
      <React.StrictMode>
        <AppearanceProvider>
          <Bancada />
        </AppearanceProvider>
      </React.StrictMode>,
    )
  })
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}
