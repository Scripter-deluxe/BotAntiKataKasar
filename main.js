const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const qrcodeTerminal = require('qrcode-terminal');

const kataKasar = [
  'geblk', 'gblk', 'gubluk', 'goblok', 'g0b0lk', 'anj', 'anjing', 'ajg',
  'tolol', 'tholol', 'thulul', 'tulul', 'bego', 'bgo', 'th0l0l', 't0l0l',
  'beg0', 'bg0', 'dakjal', 'dkjl', 'dkjal', 'kontol', 'k0nt0l', 'kntl',
  'memek', 'mmk', 'pler', 'plr', 'pl,r'
];

const dataPath = './data';
const logPath = `${dataPath}/log.json`;
const ownerNumber = '6281389284543@s.whatsapp.net'; // Ganti dengan nomor Arkaan ya

if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath);
if (!fs.existsSync(logPath)) fs.writeFileSync(logPath, '{}', 'utf8');

function logKataKasar(jid) {
  const log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  log[jid] = (log[jid] || 0) + 1;
  fs.writeFileSync(logPath, JSON.stringify(log, null, 2), 'utf8');
  return log[jid];
}

function tampilkanLaporan() {
  const log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  const laporan = Object.entries(log)
    .map(([user, jumlah]) => `👤 ${user}: ${jumlah}x`)
    .join('\n') || 'Tidak ada yang berkata kasar hari ini! 🎉';
  return `🧾 *Laporan Dewa Sensor*\n\n${laporan}`;
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./session');
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    browser: ['Ubuntu', 'Chrome', '22.04.4']
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('\nScan QR ini dengan WhatsApp kamu:\n');
      qrcodeTerminal.generate(qr, { small: true });
    }
    if (connection === 'open') {
      console.log('✅ Terhubung ke WhatsApp!');
    } else if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      console.log('❌ Koneksi terputus. Alasan:', reason);
      if (reason !== 401) {
        startBot();
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    const dari = msg.key.remoteJid;
    const pengirimJid = msg.key.participant || msg.key.remoteJid;
    const pengirim = msg.pushName || 'Orang Tidak Dikenal';
    const pesan = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

    // Jangan balas pesan dari bot sendiri (kecuali owner boleh kirim perintah)
if (msg.key.fromMe && pengirimJid !== ownerNumber) return;

    // Cegah sensor pada pesan milik owner

 

    // Perintah !ping
    if (pesan.toLowerCase() === '!ping') {
      await sock.sendMessage(dari, {
        text: '📡 Dewa-Sensor-Bot aktif dan berjaga 24 jam nonstop! ⚔️'
      });
      return;
    }
// Jika ada yang ketik !menu
if (pesan.toLowerCase() === '!menu') {
  await sock.sendMessage(dari, {
    text: `📋 *Menu Dewa-Sensor-Bot*\n
✅ !ping - Cek apakah bot aktif
✅ !test - Cek apakah bot berjalan (khusus Owner)
✅ laporan! - Lihat laporan kata-kata kasar
⚠️ Otomatis menegur yang berkata kasar
👢 Kick otomatis jika melebihi 3x (kecuali Owner)\n
Bot aktif 24 jam untuk menjaga grup ini! 💂‍♂️`
  });
  return;
}
    // Perintah !test (khusus owner)
    if (pesan.toLowerCase() === '!test' && pengirimJid === ownerNumber) {
      await sock.sendMessage(dari, {
        text: '✅ Dewa-Sensor-Bot sedang aktif dan bekerja di grup ini! Siap menjaga kata-kata! 💪⚔️'
      });
      return;
    }

    // Perintah laporan!
    if (pesan.toLowerCase() === 'laporan!') {
      const laporan = tampilkanLaporan();
      await sock.sendMessage(dari, { text: laporan });
      return;
    }

    // Deteksi kata kasar
if (kataKasar.some(kata => pesan.toLowerCase().includes(kata))) {
  // TAMENG: Abaikan sensor dan teguran untuk Owner
  if (pengirimJid === ownerNumber) {
    console.log(`⚠️ Owner (${pengirim}) berkata kasar tapi dilindungi. Tidak dihitung.`);
    return;
  }

  console.log(`🚨 Kata kasar dari ${pengirim}: ${pesan}`);
  const jumlah = logKataKasar(pengirimJid);

      // Kirim teguran
      await sock.sendMessage(dari, {
        text: `⚠️ *${pengirim}*, tolong jangan berkata kasar ya!\n(Teguran ke-${jumlah}) 😤`
      });

      // Kick jika sudah 3x dan bukan owner
      if (jumlah >= 3) {
        try {
          await sock.groupParticipantsUpdate(dari, [pengirimJid], 'remove');
          await sock.sendMessage(dari, {
            text: `👢 *${pengirim}* telah dikick karena melebihi batas kata kasar!`
          });
        } catch (err) {
          console.log('❌ Gagal kick:', err);
          await sock.sendMessage(dari, {
            text: `⚠️ Gagal kick ${pengirim}, mungkin saya bukan admin atau ada error.`
          });
        }
      }
    }
  });
}

startBot();
