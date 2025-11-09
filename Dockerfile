# Stage 1: Instalar todas as dependências (incluindo devDeps para o Prisma)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

# Stage 2: Construir a aplicação e gerar o cliente Prisma
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate

# Stage 3: Imagem final de produção
FROM node:20-alpine
WORKDIR /app

# Instalar APENAS dependências de produção
COPY package.json package-lock.json ./
RUN npm install --production

# Copiar o código-fonte da aplicação
COPY --from=builder /app/src ./src
COPY --from=builder /app/server.js .
COPY --from=builder /app/prisma ./prisma

# Copiar o cliente Prisma já gerado para a imagem final
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Expor a porta interna que o server.js usa (que virá do .env)
EXPOSE ${PORT}

ENV NODE_ENV=production

# Comando para iniciar a aplicação
CMD ["node", "server.js"]