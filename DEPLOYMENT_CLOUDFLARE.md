# Deployment Instance Online dengan Cloudflare Tunnel

Dokumen ini menjalankan instance kedua untuk akses internet tanpa mengubah
instance lokal. Kedua instance memakai PostgreSQL yang sama.

## Arsitektur

```text
Internet -> Cloudflare -> cloudflared (service Ubuntu)
                         |-> localhost:3120 (Next.js container)
                         `-> localhost:3121 (WebSocket container)

Server A (lokal) -------> PostgreSQL 10.8.140.69:5432
Server B (online) ------> PostgreSQL 10.8.140.69:5432
```

Tidak ada port inbound yang perlu dibuka pada Server B. `cloudflared` membuat
koneksi keluar menuju Cloudflare.

## 1. Prasyarat

- Domain `arxenovasocial.com` aktif di Cloudflare.
- Server B dapat mengakses `10.8.140.69:5432`.
- Docker Engine, Docker Compose v2, dan Git tersedia.
- DNS keluar dan HTTPS keluar (`443/tcp`) diizinkan. Cloudflare Tunnel juga
  dapat menggunakan QUIC (`7844/udp`) bila firewall mengizinkan.

Verifikasi database dari Server B:

```bash
nc -zv 10.8.140.69 5432
```

Jangan membuka PostgreSQL port 5432 ke internet.

## 2. Buat Cloudflare Tunnel

Di Cloudflare Zero Trust Dashboard:

1. Buka **Networks > Tunnels**.
2. Pilih **Create a tunnel > Cloudflared**.
3. Beri nama, misalnya `tor-online`.
4. Salin token tunnel dari perintah instalasi yang ditampilkan.
5. Tambahkan dua **Public Hostname** berikut:

| Public hostname | Type | Service |
|---|---|---|
| `tos.arxenovasocial.com` | HTTP | `http://localhost:3120` |
| `ws-tos.arxenovasocial.com` | HTTP | `http://localhost:3121` |

Untuk WebSocket tetap pilih tipe **HTTP** pada origin. Cloudflare akan
melakukan upgrade koneksi dan browser mengaksesnya melalui `wss://`.

## 3. Siapkan aplikasi

```bash
git clone https://github.com/whatwouldciwdo/tos.git tor-online
cd tor-online
cp online.env.example online.env
nano online.env
```

Ganti seluruh nilai `CHANGE_ME`. Gunakan password
database yang sudah dirotasi dan user aplikasi dengan hak minimum. Buat secret
JWT acak, misalnya:

```bash
openssl rand -base64 48
```

`NEXT_PUBLIC_APP_URL` dan `NEXT_PUBLIC_WS_URL` sudah diarahkan ke hostname
publik. Nilai tersebut diterapkan saat image dibangun.

## 4. Validasi dan jalankan

```bash
docker compose --env-file online.env -f docker-compose.online.yml config
docker compose --env-file online.env -f docker-compose.online.yml up -d --build
docker compose --env-file online.env -f docker-compose.online.yml ps
```

Untuk memvalidasi template sebelum `online.env` dibuat:

```bash
APP_ENV_FILE=online.env.example docker compose --env-file online.env.example -f docker-compose.online.yml config --quiet
```

Pantau log pertama kali:

```bash
docker compose --env-file online.env -f docker-compose.online.yml logs -f
```

Container aplikasi menjalankan `prisma migrate deploy` saat startup. Backup
database sebelum deployment yang membawa migration baru dan jangan menjalankan
migration manual secara bersamaan dari dua server.

## 5. Pengujian

```bash
curl -I https://tos.arxenovasocial.com
curl https://ws-tos.arxenovasocial.com
```

Endpoint kedua seharusnya mengembalikan JSON health check WebSocket. Setelah
itu uji melalui browser: login, logout, membuat TOR, upload lampiran, menyimpan,
submit, approval, ekspor, dan kolaborasi realtime.

## 6. Update

```bash
git pull origin main
docker compose --env-file online.env -f docker-compose.online.yml up -d --build
```

## 7. Persistensi dan batasan dua instance

Volume `online_uploads` membuat file upload Server B tetap ada saat container
dibuat ulang. Namun folder upload Server A dan Server B **belum tersinkronisasi**.
Data TOR ada pada database bersama, tetapi lampiran yang di-upload pada satu
server dapat tidak tersedia pada server lainnya.

Untuk penggunaan aktif dari kedua instance, pindahkan upload ke shared object
storage (Cloudflare R2, S3, atau MinIO). Jangan memakai sinkronisasi dua arah
folder sebagai solusi jangka panjang karena berisiko konflik dan kehilangan
file.

Server WebSocket juga menyimpan room di memory. Pengguna lokal dan online yang
masuk melalui endpoint WebSocket berbeda tidak berada dalam room realtime yang
sama. Gunakan satu endpoint WebSocket bersama atau tambahkan backend pub/sub
sebelum mengandalkan kolaborasi lintas instance.

## 8. Keamanan

- Rotasi password database, SMTP app password, API key, dan JWT secret yang
  pernah tertulis di repository atau dokumentasi.
- Jangan commit `online.env`.
- Batasi PostgreSQL agar hanya menerima koneksi dari IP Server A dan Server B.
- Pertimbangkan Cloudflare Access untuk membatasi aplikasi hanya bagi pengguna
  organisasi, ditambah WAF dan rate limiting.
- Lakukan backup PostgreSQL terjadwal dan uji proses restore.