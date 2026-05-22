#!/bin/bash

# Ma Reservation VPS Setup Script
# Run this once on a fresh VPS to prepare for GitHub Actions deployment
# Usage: curl -fsSL https://raw.githubusercontent.com/declared-as-ala/mareservation/main/scripts/setup-vps.sh | bash

set -e

echo "🚀 Ma Reservation VPS Setup"
echo "============================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
   echo "❌ This script must be run as root"
   exit 1
fi

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Git
echo "📥 Installing Git..."
apt install -y git

# Install Docker
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Install Docker Compose
echo "🐳 Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verify installations
echo ""
echo "✅ Verifying installations..."
echo "Docker: $(docker --version)"
echo "Docker Compose: $(docker-compose --version)"
echo "Git: $(git --version)"

# Create app directory
echo ""
echo "📂 Creating app directory..."
mkdir -p /app/mareservation
cd /app/mareservation

# Clone repository (if not already there)
if [ ! -d .git ]; then
  echo "📥 Cloning repository..."
  git clone https://github.com/declared-as-ala/mareservation.git .
else
  echo "✅ Repository already exists"
fi

# Create .env if not exists
if [ ! -f .env ]; then
  echo ""
  echo "⚠️  Creating .env from template..."
  cp .env.example .env
  echo "📝 Please edit .env with your secrets:"
  echo "   nano /app/mareservation/.env"
  echo ""
  echo "Required variables to update:"
  echo "  - JWT_SECRET (generate: openssl rand -base64 64)"
  echo "  - REFRESH_SECRET (generate: openssl rand -base64 64)"
  echo "  - MONGO_USER / MONGO_PASSWORD (change from defaults)"
  echo "  - RESEND_API_KEY (your email service key)"
  echo "  - KONNECT_API_KEY / KONNECT_SECRET_KEY (your payment gateway)"
  echo "  - FRONTEND_URL (your domain)"
  echo "  - NEXT_PUBLIC_API_URL (your API domain)"
fi

echo ""
echo "✅ VPS setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Edit .env with your secrets: nano /app/mareservation/.env"
echo "2. Start services: cd /app/mareservation && docker-compose build && docker-compose up -d"
echo "3. Verify: docker-compose ps"
echo "4. Check logs: docker-compose logs -f"
