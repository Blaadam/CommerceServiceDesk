FROM node:20-slim AS builder
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev --no-audit --progress=false

RUN apt-get update -y \
	&& apt-get install -y --no-install-recommends openssl ca-certificates \
	&& rm -rf /var/lib/apt/lists/*

COPY . .
RUN if npm run build --silent 2>/dev/null; then echo "ts build ran"; else echo "no build script or build skipped"; fi

EXPOSE 3000

CMD ["node","--import","./bin/instrument.js","bin/index.js"]
