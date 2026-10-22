// Teclas que o jogo usa: "key" é o valor real que o navegador manda,
// "code" é o código físico da tecla (ex.: a barra de espaço tem key ' ' e code 'Space')
const TECLAS = {
    ArrowLeft:  { key: 'ArrowLeft',  code: 'ArrowLeft'  },
    ArrowRight: { key: 'ArrowRight', code: 'ArrowRight' },
    ArrowUp:    { key: 'ArrowUp',    code: 'ArrowUp'    },
    ArrowDown:  { key: 'ArrowDown',  code: 'ArrowDown'  },
    Space:      { key: ' ',          code: 'Space'      }
};

// Simula o pressionar/soltar de uma tecla do teclado
function simularTecla(nomeTecla, tipoEvento) {
    const tecla = TECLAS[nomeTecla];
    const evento = new KeyboardEvent(tipoEvento, {
        key: tecla.key,
        code: tecla.code,
        bubbles: true,
        cancelable: true
    });
    document.dispatchEvent(evento);
}

// Liga um botão da tela a uma tecla.
// Usa "pointer events": funciona igual para toque, mouse e caneta,
// e evita o bug de a tecla ficar "presa" se o dedo/mouse sair do botão.
function ligarBotao(idBotao, nomeTecla) {
    const btn = document.getElementById(idBotao);
    if (!btn) return;

    let pressionado = false;

    function apertar(e) {
        e.preventDefault();
        if (pressionado) return;
        pressionado = true;
        btn.setPointerCapture(e.pointerId); // continua recebendo o "soltar" mesmo se o dedo sair do botão
        simularTecla(nomeTecla, 'keydown');
    }

    function soltar(e) {
        if (!pressionado) return;
        pressionado = false;
        simularTecla(nomeTecla, 'keyup');
    }

    btn.addEventListener('pointerdown', apertar);
    btn.addEventListener('pointerup', soltar);
    btn.addEventListener('pointercancel', soltar);
    btn.addEventListener('lostpointercapture', soltar);

    // Bloqueia o menu que aparece ao segurar o dedo no botão
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
}

document.addEventListener('DOMContentLoaded', () => {
    ligarBotao('btn-esquerda', 'ArrowLeft');
    ligarBotao('btn-direita', 'ArrowRight');
    ligarBotao('btn-cima', 'ArrowUp');
    ligarBotao('btn-baixo', 'ArrowDown');
    ligarBotao('btn-acao', 'Space');

    const status = document.getElementById('game-status');

    // Evita que setas e espaço rolem a página enquanto joga
    window.addEventListener('keydown', (e) => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
            e.preventDefault();
        }
    });

    // Exemplo de escuta de teclas no jogo (teclado real ou botões da tela)
    document.addEventListener('keydown', (e) => {
        if (!status) return;
        const nome = e.key === ' ' ? 'Espaço' : e.key;
        status.textContent = `Tecla pressionada: ${nome}`;
    });
});
