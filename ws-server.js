/**
 * TOR Online — WebSocket Collaboration Server
 * Menggunakan y-protocols untuk sinkronisasi Yjs CRDT antar browser.
 * Jalankan: node ws-server.js
 * Port default: 3001 (set env PORT_WS untuk mengubah)
 */

'use strict'

const http = require('http')
const WebSocket = require('ws')
const Y = require('yjs')
const syncProtocol = require('y-protocols/sync')
const awarenessProtocol = require('y-protocols/awareness')
const encoding = require('lib0/encoding')
const decoding = require('lib0/decoding')
const map = require('lib0/map')

const HOST = process.env.HOST || '0.0.0.0'
const PORT = parseInt(process.env.PORT_WS || '3001')

// Konstanta tipe pesan (sesuai y-protocols)
const messageSync = 0
const messageAwareness = 1
const messageQueryAwareness = 3

// In-memory store: roomName → { ydoc, awareness, conns }
const rooms = new Map()

/**
 * Encode pesan Uint8Array menjadi Buffer untuk dikirim via WebSocket
 */
function send(ws, msg) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(msg, (err) => {
      if (err) console.error('Error sending message:', err.message)
    })
  }
}

/**
 * Dapatkan (atau buat) room untuk sebuah TOR
 */
function getRoom(roomName) {
  return map.setIfUndefined(rooms, roomName, () => {
    const ydoc = new Y.Doc()
    const awareness = new awarenessProtocol.Awareness(ydoc)
    const conns = new Set()

    // ─── Broadcast update ydoc ke semua koneksi lain ───────────────────
    // Ini adalah inti dari sinkronisasi: setiap kali ydoc berubah (karena
    // ada pesan masuk dari salah satu klien), kita broadcast ke yang lain.
    ydoc.on('update', (update, origin) => {
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, messageSync)
      syncProtocol.writeUpdate(encoder, update)
      const msg = encoding.toUint8Array(encoder)

      conns.forEach((conn) => {
        // Jangan kirim balik ke pengirim asli
        if (conn !== origin && conn.readyState === WebSocket.OPEN) {
          send(conn, msg)
        }
      })
    })

    // ─── Broadcast awareness ke semua koneksi ──────────────────────────
    awareness.on('update', ({ added, updated, removed }) => {
      const changedClients = added.concat(updated, removed)
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, messageAwareness)
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
      )
      const msg = encoding.toUint8Array(encoder)

      conns.forEach((conn) => {
        if (conn.readyState === WebSocket.OPEN) {
          send(conn, msg)
        }
      })
    })

    return { ydoc, awareness, conns }
  })
}

/**
 * Handle koneksi WebSocket baru
 */
function handleConnection(ws, req) {
  // Ambil room name dari URL: "/tor-123" → "tor-123"
  const roomName = decodeURIComponent(req.url.slice(1).split('?')[0]) || 'default'
  const room = getRoom(roomName)
  const { ydoc, awareness, conns } = room

  conns.add(ws)
  console.log(`[${new Date().toLocaleTimeString('id-ID')}] ✅ JOIN "${roomName}" — aktif: ${conns.size}`)

  // ─── Kirim state dokumen saat ini ke klien baru (Sync Step 1) ─────────
  {
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, messageSync)
    syncProtocol.writeSyncStep1(encoder, ydoc)
    send(ws, encoding.toUint8Array(encoder))
  }

  // ─── Kirim awareness semua pengguna aktif ke klien baru ───────────────
  {
    const awarenessStates = awareness.getStates()
    if (awarenessStates.size > 0) {
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, messageAwareness)
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(
          awareness,
          Array.from(awarenessStates.keys())
        )
      )
      send(ws, encoding.toUint8Array(encoder))
    }
  }

  // ─── Handle pesan masuk dari klien ────────────────────────────────────
  ws.on('message', (rawMessage) => {
    try {
      const data = rawMessage instanceof Buffer ? new Uint8Array(rawMessage) : rawMessage
      const decoder = decoding.createDecoder(data)
      const msgType = decoding.readVarUint(decoder)

      switch (msgType) {
        case messageSync: {
          // Buat encoder untuk respons (jika perlu)
          const encoder = encoding.createEncoder()
          encoding.writeVarUint(encoder, messageSync)

          // readSyncMessage menangani:
          // - SyncStep1 (state vector) → kirim SyncStep2 (update) sebagai respons
          // - SyncStep2 (update) → terapkan ke ydoc → ydoc.on('update') broadcast ke lain
          // - Update → terapkan ke ydoc → ydoc.on('update') broadcast ke lain
          // Origin = ws supaya ydoc.on('update') bisa mengecualikan pengirim
          syncProtocol.readSyncMessage(decoder, encoder, ydoc, ws)

          // Kirim respons jika ada (SyncStep2)
          if (encoding.length(encoder) > 1) {
            send(ws, encoding.toUint8Array(encoder))
          }
          break
        }

        case messageQueryAwareness: {
          // Klien meminta state awareness semua pengguna
          const encoder = encoding.createEncoder()
          encoding.writeVarUint(encoder, messageAwareness)
          encoding.writeVarUint8Array(
            encoder,
            awarenessProtocol.encodeAwarenessUpdate(
              awareness,
              Array.from(awareness.getStates().keys())
            )
          )
          send(ws, encoding.toUint8Array(encoder))
          break
        }

        case messageAwareness: {
          // Update awareness (posisi kursor, tab aktif, dll.)
          // awareness.on('update') akan broadcast ke semua koneksi
          awarenessProtocol.applyAwarenessUpdate(
            awareness,
            decoding.readVarUint8Array(decoder),
            ws
          )
          break
        }

        default:
          console.warn(`[${roomName}] Unknown message type: ${msgType}`)
      }
    } catch (err) {
      console.error(`[${roomName}] Error processing message:`, err.message)
    }
  })

  // ─── Handle disconnect ─────────────────────────────────────────────────
  ws.on('close', () => {
    conns.delete(ws)
    console.log(`[${new Date().toLocaleTimeString('id-ID')}] ❌ LEAVE "${roomName}" — sisa: ${conns.size}`)

    // Hapus awareness state pengguna yang disconnect
    awarenessProtocol.removeAwarenessStates(
      awareness,
      Array.from(awareness.getStates().keys()).filter(
        (clientId) => awareness.getStates().get(clientId)?.['ws'] === ws
      ),
      ws
    )

    // Bersihkan room jika sudah kosong
    if (conns.size === 0) {
      rooms.delete(roomName)
      console.log(`[${new Date().toLocaleTimeString('id-ID')}] 🗑  Room "${roomName}" dibersihkan`)
    }
  })

  ws.on('error', (err) => {
    console.error(`[${roomName}] WebSocket error:`, err.message)
  })
}

// ─── HTTP Server (health check) ────────────────────────────────────────────
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({
    status: 'ok',
    service: 'TOR Online - WebSocket Collaboration Server',
    activeRooms: rooms.size,
    rooms: Array.from(rooms.keys()),
    timestamp: new Date().toISOString(),
  }))
})

// ─── WebSocket Server ──────────────────────────────────────────────────────
const wss = new WebSocket.WebSocketServer({ server })
wss.on('connection', handleConnection)

server.listen(PORT, HOST, () => {
  console.log('═══════════════════════════════════════')
  console.log('  TOR Online — Collaboration Server')
  console.log(`  WebSocket : ws://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`)
  console.log(`  Health    : http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`)
  console.log('═══════════════════════════════════════')
})

// ─── Graceful shutdown ──────────────────────────────────────────────────────
process.on('SIGINT', () => {
  console.log('\n⏹  Shutting down...')
  wss.close(() => server.close(() => process.exit(0)))
})

process.on('SIGTERM', () => {
  wss.close(() => server.close(() => process.exit(0)))
})
