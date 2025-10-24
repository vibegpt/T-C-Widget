FROM node:18-alpine

ARG SHOPIFY_API_KEY
ENV SHOPIFY_API_KEY=$SHOPIFY_API_KEY
EXPOSE 8081
WORKDIR /app
COPY web .
RUN npm install
WORKDIR /app/frontend
RUN npm install && npm run build
WORKDIR /app
CMD ["npm", "run", "serve"]
