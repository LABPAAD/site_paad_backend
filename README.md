# Backend API - Site Dinâmico PAAD

Este projeto contém o código-fonte do backend para o novo site dinâmico do Laboratório PAAD.

## 🎯 Objetivo do Projeto

O objetivo principal é criar um sistema de gerenciamento de conteúdo acadêmico que dê visibilidade às pesquisas, projetos, membros e produções do laboratório. O sistema visa reduzir a dependência técnica, permitindo que docentes e discentes atualizem informações diretamente, além de preservar o histórico acadêmico do laboratório.

## ✨ Features Principais (MVP)

Conforme o [Documento de Requisitos](docs/documento-de-requisitos.pdf):

* **Gerenciamento de Entidades:** CRUD completo para Pessoas, Projetos e Publicações.
* **Controle de Acesso (RBAC):** Sistema de permissões baseado em papéis (Coordenador, Administrador/Professor, Monitor, Discente, Visitante).
* **Segurança:** Autenticação com 2FA (mínimo para MVP).
* **Conformidade:** Responsividade, Acessibilidade (WCAG) e LGPD.

## 🛠️ Tecnologias Utilizadas

* **Backend:** Node.js, Express.js
* **Banco de Dados:** PostgreSQL
* **ORM:** Prisma
* **Containerização:** Docker, Docker Compose

---

## 🚀 Como Executar (Ambiente de Desenvolvimento)

Este projeto é totalmente containerizado com Docker. Você não precisa instalar Node.js ou PostgreSQL na sua máquina, apenas o Docker.

### 1. Pré-requisitos

* [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado.

### 2. Configuração do Ambiente

Clone o repositório e, na raiz do projeto (`site_paad_backend/`), crie um arquivo chamado `.env`. Ele **NUNCA** deve ser enviado ao Git.

Copie o conteúdo abaixo para o seu `.env`:

```env
# ---------------------------------
# Configuração do Banco de Dados (PostgreSQL)
# ---------------------------------
POSTGRES_USER=paad_user
POSTGRES_PASSWORD=paad_pass
POSTGRES_DB=paad_db

# ---------------------------------
# Configuração da API (Node.js)
# ---------------------------------
# Porta INTERNA que o Node.js vai escutar (dentro do container)
PORT=3000

# Porta EXTERNA que você acessará no seu navegador (localhost:3500)
API_EXTERNAL_PORT=3500
```

### 3. Subir os Containers

No terminal, na raiz do projeto, execute:

```bash
docker-compose up --build
```
Este comando irá:
1.  Construir a imagem da API (Node.js).
2.  Baixar a imagem do PostgreSQL.
3.  Iniciar os dois containers e conectá-los.

A API estará acessível em `http://localhost:3500`.

### 4. Aplicar as Migrações do Banco

Com os containers rodando, abra um **novo terminal** e execute o comando abaixo para criar as tabelas no banco de dados:

```bash
docker-compose exec api npx prisma migrate deploy
```

Seu ambiente está pronto!

---

## 🔄 Banco de Dados (Prisma)

* **Schema:** O schema do banco de dados está em `prisma/schema.prisma`.
* **Migrações:** Os arquivos SQL de migração estão em `prisma/migrations/`.

Para **criar uma nova migração** após alterar o `schema.prisma`:

```bash
# Rode este comando DENTRO do container
docker-compose exec api npx prisma migrate dev --name nome-da-sua-migration
```



- Schema: A "planta" do banco de dados está em prisma/schema.prisma.
- Migrações: Os arquivos SQL de migração estão em prisma/migrations/.

### ⚠️ Alterando o Schema (Workflow de Migração)
Quando você alterar o arquivo prisma/schema.prisma, o processo de migração é mais complexo e requer os seguintes passos:

1. Garanta o Volume no docker-compose.yml

O prisma migrate dev precisa escrever o novo arquivo de migração na sua pasta prisma/migrations. Para que isso funcione, seu docker-compose.yml precisa ter um volume para a pasta prisma:

```bash
services:
  api:
    # ... (outras configurações)
    volumes:
      - ./prisma:/app/prisma
  # ...
```

2. Pare os containers antigos (se estiverem rodando):
```bash
docker-compose down
```

3. Suba os containers em modo "detached" (-d):

É crucial usar --build para que o container execute o npx prisma generate no Dockerfile e reconheça o novo schema.
```bash
docker-compose up --build -d
```

4. Crie e Aplique a Migração:

Rode o comando migrate dev dentro do container da api. Dê um nome que descreva a mudança.
```bash
docker-compose exec api npx prisma migrate dev --name "nome-descritivo-da-mudanca"
```

O Prisma irá comparar o schema com o banco, criar o novo arquivo SQL de migração e aplicá-lo. Confirme (y) se ele avisar sobre perda de dados (em ambiente de dev, isso é esperado ao alterar tipos de colunas).

5. Reinicie a API:

Para garantir que o servidor Node.js carregue o novo Prisma Client gerado:
```bash
docker-compose restart api
```