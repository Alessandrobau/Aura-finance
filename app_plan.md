# Plano de Desenvolvimento: Plataforma Financeira com IA

## 1. Stack Tecnológico
* **Frontend:** React, TailwindCSS, Chart.js (ou Recharts).
* **Backend:** Node.js (TypeScript), Fastify ou Express.
* **Banco de Dados:** PostgreSQL com Prisma ORM.
* **Inteligência Artificial:** Google Gemini API (Nuvem) e Ollama (Local).
* **APIs Externas:** Brapi (Ações/B3), CoinGecko (Criptomoedas).

## 2. Modelagem de Dados (Tabelas)
* **Usuarios:** `id`, `nome`, `email`, `senha_hash`.
* **Transacoes:** `id`, `usuario_id`, `tipo` (receita/despesa), `valor`, `categoria`, `data`, `criado_por_ia` (boolean), `prompt_original`.
* **Investimentos:** `id`, `usuario_id`, `tipo` (cripto/acao/renda_fixa), `ticker` (ex: BTC, PETR4), `quantidade`, `preco_medio`.
* **Metas:** `id`, `usuario_id`, `nome`, `valor_alvo`, `valor_atual`, `tipo` (economizar/gasto_maximo).
* **Dividas:** `id`, `usuario_id`, `credor`, `valor_total`, `valor_pago`.

## 3. Arquitetura da REST API
* **`/api/transactions`:** CRUD de receitas e despesas.
* **`/api/investments`:** CRUD de carteira e rota interna para buscar cotações em tempo real.
* **`/api/goals`:** CRUD de objetivos e cálculo de porcentagem.
* **`/api/ai/chat`:** Recebe prompt, executa *Function Calling* e salva transação.
* **`/api/ai/insights`:** Rotas específicas (Consultoria de Metas, Resumo Semanal, Anomalias e Categorização Automática).

## 4. Estrutura do Frontend (React)
* **Dashboard:** Gráfico de pizza mensal (Receitas/Despesas/Dívidas) e Gráfico de linhas (Evolução anual).
* **Tracker de Objetivos:** Cards com gráficos de pizza/progresso circular (% concluído).
* **Carteira de Investimentos:** Painel com atualização em tempo real do patrimônio.
* **Chatbot IA:** Interface de chat persistente para interagir com o assistente financeiro.

## 5. Cronograma de Execução

### Fase 1: Fundação
* Setup do repositório (React + Node.js).
* Configuração do banco de dados (PostgreSQL + Prisma).
* Autenticação básica de usuários (JWT).

### Fase 2: Lógica de Negócios (Backend)
* Criação das rotas REST (Transações, Metas, Dívidas).
* Integração com APIs de mercado financeiro para atualização de ativos.
* Lógica matemática para tracker de metas e rendimentos.

### Fase 3: Motor de IA
* Configuração do SDK do Gemini e conexão com Ollama local.
* Construção da lógica de *Function Calling* para o Chatbot.
* Criação e teste dos prompts de sistema para as análises avançadas (resumos, anomalias).

### Fase 4: Interface e Integração (Frontend)
* Construção da UI e conexão com a API REST.
* Implementação dos gráficos dinâmicos.
* Conexão da interface de chat com as rotas de IA do backend.

### Fase 5: Validação e Deploy
* Testes de fluxo de dados (da inserção via IA até o reflexo nos gráficos).
* Tratamento de erros (respostas inesperadas da IA ou falhas nas APIs de mercado).
* Hospedagem da plataforma.