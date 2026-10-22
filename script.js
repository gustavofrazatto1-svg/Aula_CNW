// Função para simular o pressionar de uma tecla no teclado
function simularTecla(codigoTecla, tipoEvento) {
    const evento = new KeyboardEvent(tipoEvento, {
        key: codigoTecla,
        code: codigoTecla,
        bubbles: true
    });
    document.dispatchEvent(evento);
}

// Mapear botões da ecrã tátil para teclas
function ligarBotao(idBotao, tecla) {
    const btn = document.getElementById(idBotao);

    if (!btn) return;

    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        simularTecla(tecla, 'keydown');
    });

    btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        simularTecla(tecla, 'keyup');
    });

    // Suporte também para clique com o rato no PC
    btn.addEventListener('mousedown', () => simularTecla(tecla, 'keydown'));
    btn.addEventListener('mouseup', () => simularTecla(tecla, 'keyup'));
}

// Configurar escuta dos controlo mobile
document.addEventListener('DOMContentLoaded', () => {
    ligarBotao('btn-esquerda', 'ArrowLeft');
    ligarBotao('btn-direita', 'ArrowRight');
    ligarBotao('btn-cima', 'ArrowUp');
    ligarBotao('btn-baixo', 'ArrowDown');
    ligarBotao('btn-acao', 'Space');

    // Exemplo de escuta de teclas no jogo
    document.addEventListener('keydown', (e) => {
        const status = document.getElementById('game-status');
        if (status) {
            status.innerText = `Tecla pressionada: ${e.key}`;
        }
    });
});
