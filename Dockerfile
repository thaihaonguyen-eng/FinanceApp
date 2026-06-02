# Bước 1: Build ứng dụng Web
FROM node:18-alpine AS build
WORKDIR /app

# Copy các file quản lý package
COPY package.json package-lock.json ./
RUN npm ci

# Copy toàn bộ mã nguồn
COPY . .

# Build ra phiên bản Web
RUN npx expo export -p web

# Bước 2: Chạy ứng dụng bằng Nginx
FROM nginx:alpine
# Copy code đã build sang thư mục tĩnh của Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80 cho web server
EXPOSE 80

# Chạy Nginx
CMD ["nginx", "-g", "daemon off;"]
