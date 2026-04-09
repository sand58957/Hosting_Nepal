import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DockerService {
  private readonly logger = new Logger(DockerService.name);

  // Generate cloud-init script for Docker + Docker Compose
  getDockerInstallScript(): string {
    return [
      '#!/bin/bash',
      'apt-get update -y',
      'apt-get install -y ca-certificates curl gnupg',
      'install -m 0755 -d /etc/apt/keyrings',
      'curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg',
      'chmod a+r /etc/apt/keyrings/docker.gpg',
      'echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null',
      'apt-get update -y',
      'apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin',
      'systemctl enable docker',
      'systemctl start docker',
      'echo "Docker installed successfully" > /root/docker-install.log',
    ].join('\n');
  }

  // Generate cloud-init for Docker + Portainer
  getDockerWithPortainerScript(): string {
    return [
      this.getDockerInstallScript(),
      '',
      '# Install Portainer',
      'docker volume create portainer_data',
      'docker run -d -p 9443:9443 -p 8000:8000 --name portainer --restart=always -v /var/run/docker.sock:/var/run/docker.sock -v portainer_data:/data portainer/portainer-ce:latest',
      'echo "Portainer installed at https://<IP>:9443" >> /root/docker-install.log',
    ].join('\n');
  }

  // Generate cloud-init for k3s (lightweight Kubernetes)
  getK3sInstallScript(): string {
    return [
      '#!/bin/bash',
      'apt-get update -y',
      'curl -sfL https://get.k3s.io | sh -',
      'systemctl enable k3s',
      'echo "k3s installed successfully" > /root/k3s-install.log',
      'echo "Kubeconfig: /etc/rancher/k3s/k3s.yaml" >> /root/k3s-install.log',
      'kubectl get nodes >> /root/k3s-install.log 2>&1',
    ].join('\n');
  }

  // Generate cloud-init for k3s + Portainer
  getK3sWithPortainerScript(): string {
    return [
      this.getK3sInstallScript(),
      '',
      '# Install Portainer on k3s',
      'kubectl apply -n portainer -f https://downloads.portainer.io/ce2-19/portainer.yaml',
      'echo "Portainer for K8s installed" >> /root/k3s-install.log',
    ].join('\n');
  }

  // Generate cloud-init for Docker + k3s + Portainer (full stack)
  getFullContainerStackScript(): string {
    return [
      '#!/bin/bash',
      'apt-get update -y',
      '',
      '# Docker',
      'apt-get install -y ca-certificates curl gnupg',
      'install -m 0755 -d /etc/apt/keyrings',
      'curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg',
      'chmod a+r /etc/apt/keyrings/docker.gpg',
      'echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null',
      'apt-get update -y',
      'apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin',
      'systemctl enable docker && systemctl start docker',
      '',
      '# k3s',
      'curl -sfL https://get.k3s.io | sh -',
      '',
      '# Portainer',
      'docker volume create portainer_data',
      'docker run -d -p 9443:9443 -p 8000:8000 --name portainer --restart=always -v /var/run/docker.sock:/var/run/docker.sock -v portainer_data:/data portainer/portainer-ce:latest',
      '',
      'echo "Full container stack installed" > /root/container-install.log',
      'docker --version >> /root/container-install.log',
      'kubectl get nodes >> /root/container-install.log 2>&1',
    ].join('\n');
  }

  // Get the install script for a given container stack type
  getInstallScriptForType(type: string): string | null {
    switch (type) {
      case 'docker':
        return this.getDockerInstallScript();
      case 'docker-portainer':
        return this.getDockerWithPortainerScript();
      case 'k3s':
        return this.getK3sInstallScript();
      case 'k3s-portainer':
        return this.getK3sWithPortainerScript();
      case 'full-stack':
        return this.getFullContainerStackScript();
      default:
        return null;
    }
  }

  // Docker Compose templates for 1-click apps
  getAppTemplate(appName: string): string {
    const templates: Record<string, string> = {
      wordpress: [
        'version: "3.9"',
        'services:',
        '  wordpress:',
        '    image: wordpress:latest',
        '    ports:',
        '      - "80:80"',
        '    environment:',
        '      WORDPRESS_DB_HOST: db',
        '      WORDPRESS_DB_USER: wordpress',
        '      WORDPRESS_DB_PASSWORD: wordpress_pass',
        '      WORDPRESS_DB_NAME: wordpress',
        '    volumes:',
        '      - wp_data:/var/www/html',
        '    depends_on:',
        '      - db',
        '    restart: always',
        '  db:',
        '    image: mysql:8.0',
        '    environment:',
        '      MYSQL_DATABASE: wordpress',
        '      MYSQL_USER: wordpress',
        '      MYSQL_PASSWORD: wordpress_pass',
        '      MYSQL_ROOT_PASSWORD: root_pass',
        '    volumes:',
        '      - db_data:/var/lib/mysql',
        '    restart: always',
        'volumes:',
        '  wp_data:',
        '  db_data:',
      ].join('\n'),

      mysql: [
        'version: "3.9"',
        'services:',
        '  mysql:',
        '    image: mysql:8.0',
        '    ports:',
        '      - "3306:3306"',
        '    environment:',
        '      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-rootpass}',
        '      MYSQL_DATABASE: ${MYSQL_DATABASE:-mydb}',
        '    volumes:',
        '      - mysql_data:/var/lib/mysql',
        '    restart: always',
        'volumes:',
        '  mysql_data:',
      ].join('\n'),

      redis: [
        'version: "3.9"',
        'services:',
        '  redis:',
        '    image: redis:7-alpine',
        '    ports:',
        '      - "6379:6379"',
        '    volumes:',
        '      - redis_data:/data',
        '    restart: always',
        'volumes:',
        '  redis_data:',
      ].join('\n'),

      nginx: [
        'version: "3.9"',
        'services:',
        '  nginx:',
        '    image: nginx:alpine',
        '    ports:',
        '      - "80:80"',
        '      - "443:443"',
        '    volumes:',
        '      - ./html:/usr/share/nginx/html',
        '      - ./nginx.conf:/etc/nginx/nginx.conf',
        '    restart: always',
      ].join('\n'),

      postgres: [
        'version: "3.9"',
        'services:',
        '  postgres:',
        '    image: postgres:16-alpine',
        '    ports:',
        '      - "5432:5432"',
        '    environment:',
        '      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgrespass}',
        '      POSTGRES_DB: ${POSTGRES_DB:-mydb}',
        '    volumes:',
        '      - pg_data:/var/lib/postgresql/data',
        '    restart: always',
        'volumes:',
        '  pg_data:',
      ].join('\n'),

      mongodb: [
        'version: "3.9"',
        'services:',
        '  mongo:',
        '    image: mongo:7',
        '    ports:',
        '      - "27017:27017"',
        '    environment:',
        '      MONGO_INITDB_ROOT_USERNAME: admin',
        '      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD:-mongopass}',
        '    volumes:',
        '      - mongo_data:/data/db',
        '    restart: always',
        'volumes:',
        '  mongo_data:',
      ].join('\n'),

      'node-app': [
        'version: "3.9"',
        'services:',
        '  app:',
        '    image: node:20-alpine',
        '    ports:',
        '      - "3000:3000"',
        '    working_dir: /app',
        '    volumes:',
        '      - ./app:/app',
        '    command: npm start',
        '    restart: always',
      ].join('\n'),

      'nextjs': [
        'version: "3.9"',
        'services:',
        '  nextjs:',
        '    image: node:20-alpine',
        '    ports:',
        '      - "3000:3000"',
        '    working_dir: /app',
        '    volumes:',
        '      - ./app:/app',
        '    command: sh -c "npm install && npm run build && npm start"',
        '    restart: always',
      ].join('\n'),

      'mern-stack': [
        'version: "3.9"',
        'services:',
        '  frontend:',
        '    image: node:20-alpine',
        '    ports:',
        '      - "3000:3000"',
        '    working_dir: /app',
        '    volumes:',
        '      - ./frontend:/app',
        '    command: npm start',
        '  backend:',
        '    image: node:20-alpine',
        '    ports:',
        '      - "4000:4000"',
        '    working_dir: /app',
        '    volumes:',
        '      - ./backend:/app',
        '    command: npm start',
        '    depends_on:',
        '      - mongo',
        '  mongo:',
        '    image: mongo:7',
        '    volumes:',
        '      - mongo_data:/data/db',
        '    restart: always',
        'volumes:',
        '  mongo_data:',
      ].join('\n'),

      'lamp-stack': [
        'version: "3.9"',
        'services:',
        '  apache:',
        '    image: php:8.2-apache',
        '    ports:',
        '      - "80:80"',
        '    volumes:',
        '      - ./html:/var/www/html',
        '    restart: always',
        '  mysql:',
        '    image: mysql:8.0',
        '    environment:',
        '      MYSQL_ROOT_PASSWORD: rootpass',
        '      MYSQL_DATABASE: app',
        '    volumes:',
        '      - db_data:/var/lib/mysql',
        '    restart: always',
        '  phpmyadmin:',
        '    image: phpmyadmin:latest',
        '    ports:',
        '      - "8080:80"',
        '    environment:',
        '      PMA_HOST: mysql',
        '    depends_on:',
        '      - mysql',
        'volumes:',
        '  db_data:',
      ].join('\n'),
    };

    return templates[appName] || '';
  }

  // Get list of available app templates
  getAvailableTemplates(): Array<{ id: string; name: string; description: string; icon: string; category: string }> {
    return [
      { id: 'wordpress', name: 'WordPress', description: 'WordPress CMS with MySQL database', icon: 'tabler-brand-wordpress', category: 'CMS' },
      { id: 'mysql', name: 'MySQL 8.0', description: 'MySQL relational database server', icon: 'tabler-database', category: 'Database' },
      { id: 'postgres', name: 'PostgreSQL 16', description: 'PostgreSQL advanced database', icon: 'tabler-database', category: 'Database' },
      { id: 'mongodb', name: 'MongoDB 7', description: 'MongoDB NoSQL database', icon: 'tabler-database', category: 'Database' },
      { id: 'redis', name: 'Redis 7', description: 'Redis in-memory data store', icon: 'tabler-database', category: 'Cache' },
      { id: 'nginx', name: 'Nginx', description: 'Nginx web server / reverse proxy', icon: 'tabler-server', category: 'Web Server' },
      { id: 'node-app', name: 'Node.js App', description: 'Node.js application server', icon: 'tabler-brand-nodejs', category: 'Runtime' },
      { id: 'nextjs', name: 'Next.js', description: 'Next.js React framework', icon: 'tabler-brand-nextjs', category: 'Framework' },
      { id: 'mern-stack', name: 'MERN Stack', description: 'MongoDB + Express + React + Node.js', icon: 'tabler-stack-2', category: 'Full Stack' },
      { id: 'lamp-stack', name: 'LAMP Stack', description: 'Linux + Apache + MySQL + PHP + phpMyAdmin', icon: 'tabler-stack-2', category: 'Full Stack' },
    ];
  }
}
