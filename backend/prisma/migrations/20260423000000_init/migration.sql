-- CreateEnum
CREATE TYPE "TipoTransacao" AS ENUM ('receita', 'despesa');

-- CreateEnum
CREATE TYPE "TipoInvestimento" AS ENUM ('cripto', 'acao', 'renda_fixa', 'fii');

-- CreateEnum
CREATE TYPE "TipoMeta" AS ENUM ('economizar', 'gasto_maximo');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transacoes" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "tipo" "TipoTransacao" NOT NULL,
    "valor" DECIMAL(15,2) NOT NULL,
    "categoria" TEXT NOT NULL,
    "descricao" TEXT,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criado_por_ia" BOOLEAN NOT NULL DEFAULT false,
    "prompt_original" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investimentos" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "tipo" "TipoInvestimento" NOT NULL,
    "ticker" TEXT NOT NULL,
    "quantidade" DECIMAL(15,8) NOT NULL,
    "preco_medio" DECIMAL(15,2) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metas" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "valor_alvo" DECIMAL(15,2) NOT NULL,
    "valor_atual" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tipo" "TipoMeta" NOT NULL,
    "prazo" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dividas" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "credor" TEXT NOT NULL,
    "valor_total" DECIMAL(15,2) NOT NULL,
    "valor_pago" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "taxa_juros" DECIMAL(5,2),
    "vencimento" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dividas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "investimentos_usuario_id_ticker_key" ON "investimentos"("usuario_id", "ticker");

-- AddForeignKey
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investimentos" ADD CONSTRAINT "investimentos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metas" ADD CONSTRAINT "metas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dividas" ADD CONSTRAINT "dividas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
