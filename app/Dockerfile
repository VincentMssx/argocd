# Build stage
FROM oven/bun:1 as build
WORKDIR /app
COPY package.json bun.lockb* ./
RUN bun install
COPY . .

RUN ls -la  # This will print the file list in the console during build

RUN bun run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]