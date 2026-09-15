# Panduan Deployment TOR Online di Server Ubuntu (via Docker)

Panduan ini berisi langkah-langkah lengkap untuk melakukan *deployment* aplikasi **TOR Online** di lingkungan sistem operasi **Ubuntu Server** menggunakan **Docker** dan **Docker Compose**, terkoneksi dengan database PostgreSQL terpusat di `10.8.140.69:5432`.

---

## 🛠️ 1. Prasyarat System & Paket Utama

Jalankan perintah berikut di terminal Ubuntu untuk memperbarui paket dan menginstal Docker beserta Git:

```bash
# Update repository paket
sudo apt update && sudo apt upgrade -y

# Instal Docker, Docker Compose, Git, dan Netcat/Ping
sudo apt install -y docker.io docker-compose-v2 git curl netcat-openbsd

# Aktifkan service Docker
sudo systemctl enable --now docker

# Tambahkan user saat ini ke grup docker (agar dapat menjalankan docker tanpa sudo)
sudo usermod -aG docker $USER

# Terapkan perubahan grup user (atau jalankan 'su - $USER' / logout & login kembali)
newgrp docker
```

---

## 🌐 2. Verifikasi Koneksi Database PostgreSQL Target

Pastikan server Ubuntu dapat terhubung ke server database PostgreSQL target di `10.8.140.69:5432`:

```bash
# Tes konektivitas port 5432 ke PostgreSQL server
nc -zv 10.8.140.69 5432
```
*Pastikan output menunjukkan `Connection to 10.8.140.69 5432 port [tcp/postgresql] succeeded!`*

---

## 📥 3. Kloning Repositori & Konfigurasi File Environment (`.env`)

```bash
# 1. Kloning repositori dari GitHub
git clone https://github.com/whatwouldciwdo/tos.git tor-online
cd tor-online

# 2. Buat file .env dari template .env.example
cp .env.example .env

# 3. Edit file .env jika perlu menyesuaikan IP Server Ubuntu
nano .env
```

Isi default file `.env`:
```env
# Database Connection (PostgreSQL Terpusat)
DATABASE_URL="postgresql://postgres:Cilego2026.@10.8.140.69:5432/tor_db?schema=public"

# Auth & Security
JWT_SECRET="ini-rahasia-yang-agak-panjang-dikit"

# External API Keys
NEXT_PUBLIC_TINYMCE_API_KEY="ffkk71r09jwdb56vpn73og6apiid5u69g6xgjnbhd9ig9p4p"

# SMTP Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="sispltguclg@gmail.com"
SMTP_PASS="qnol jzfw nnky rrov"

# URL Aplikasi (Ganti IP dengan IP Server Ubuntu tempat aplikasi berjalan)
NEXT_PUBLIC_APP_URL="http://10.8.140.67:3120"
```

---

## 🚀 4. Build & Jalankan Container via Docker Compose

Jalankan perintah berikut untuk melakukan build image Docker dan mengaktifkan service di latar belakang (*detached mode*):

```bash
# Build dan jalankan seluruh container
docker compose up -d --build
```

Setelah perintah selesai, periksa status container yang berjalan:

```bash
docker compose ps
```

Container yang akan berjalan:
1. `tor-online-app` — Next.js Application (Port `3120`)
2. `tor-online-ws` — WebSocket Collaboration Server (Port `3001`)

---

## 🔒 5. Konfigurasi Firewall Ubuntu (UFW)

Buka port `3120` (Web App) dan `3001` (WebSocket Server) pada firewall Ubuntu agar dapat diakses dari jaringan lokal:

```bash
# Buka port 3120 dan 3001
sudo ufw allow 3120/tcp comment 'TOR Online Web App'
sudo ufw allow 3001/tcp comment 'TOR Online WebSocket Collaboration'

# Cek status firewall
sudo ufw status verbose
```

---

## 📊 6. Monitoring & Perintah Manajemen Operasional

### 🔍 Melihat Log Container
```bash
# Log gabungan aplikasi
docker compose logs -f

# Log khusus aplikasi Next.js Web App
docker logs -f tor-online-app

# Log khusus WebSocket Collaboration Server
docker logs -f tor-online-ws
```

### 🔄 Restart Service
```bash
docker compose restart
```

### 🆙 Update Aplikasi dari GitHub (Redeploy)
Setiap kali ada pembaruan kode di GitHub (`main` branch):
```bash
git pull origin main
docker compose up -d --build
```

### ⏹️ Menghentikan Service
```bash
docker compose down
```

---

## ✅ 7. Akses Aplikasi
- **Web App**: `http://10.8.140.67:3120`
- **WebSocket Server**: `ws://<IP_SERVER_UBUNTU>:3001`
- **Health Check WebSocket**: `http://<IP_SERVER_UBUNTU>:3001`
