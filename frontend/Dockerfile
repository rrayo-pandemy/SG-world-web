FROM node:22-alpine AS frontend-build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY js/hero-3d.js ./js/hero-3d.js
COPY scripts/build-hero-3d.cjs ./scripts/build-hero-3d.cjs
RUN npm run build:hero

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY ./ /usr/share/nginx/html
COPY --from=frontend-build /app/js/hero-3d.bundle.js /usr/share/nginx/html/js/hero-3d.bundle.js
COPY --from=frontend-build /app/vendor/THREE-LICENSE.txt /usr/share/nginx/html/vendor/THREE-LICENSE.txt

EXPOSE 80
