FROM node:20-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /usr/src/app

# Copy package files
COPY package.json pnpm-lock.yaml ./

ARG HUSKY=0
ENV HUSKY=$HUSKY

# Install dependencies using pnpm
RUN pnpm install --prod --frozen-lockfile

# Copy prisma schema first
COPY prisma ./prisma

# Generate Prisma Client
RUN pnpm exec prisma generate

COPY . .

RUN pnpm run build

ENV PORT=3000
ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/server.js"]
