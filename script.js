// Variabili globali
let domande = [];
let currentTema = 0;
let risposteDate = {};
let datiRispondente = {
    nome: '',
    cognome: '',
    timestamp: null
};

// Carica il CSV all'avvio
window.addEventListener('DOMContentLoaded', caricaDomande);

// Carica il CSV
async function caricaDomande() {
    try {
        const response = await fetch('domande questionario estese.csv');
        const text = await response.text();
        
        Papa.parse(text, {
            header: true,
            delimiter: ';',
            skipEmptyLines: true,
            complete: (results) => {
                const domandeGruppate = results.data.reduce((acc, row) => {
                    if (!row.tema) return acc;
                    
                    const tema = row.tema.trim();
                    if (!acc[tema]) {
                        acc[tema] = {
                            tema: tema,
                            opzioni: []
                        };
                    }

                    acc[tema].opzioni.push({
                        testo: row.domande.trim(),
                        chiave: row.chiave.trim(),
                        punteggio: parseInt(row.punteggio)
                    });
                    return acc;
                }, {});

                domande = Object.values(domandeGruppate);
            }
        });
    } catch (error) {
        console.error('Errore nel caricamento:', error);
        showError('Errore nel caricamento del file: ' + error.message);
    }
}

// Gestione del form dati
document.getElementById('formDati').addEventListener('submit', function(e) {
    e.preventDefault();
    datiRispondente = {
        nome: document.getElementById('nome').value.trim(),
        cognome: document.getElementById('cognome').value.trim(),
        timestamp: new Date()
    };
    document.getElementById('datiForm').style.display = 'none';
    document.getElementById('questionario').style.display = 'block';
    mostraDomanda();
});

// Mostra la domanda corrente
function mostraDomanda() {
    if (currentTema >= domande.length) {
        calcolaRisultati();
        return;
    }

    const temaCorrente = domande[currentTema];
    document.getElementById('temaTitolo').textContent = `Tema: ${temaCorrente.tema}`;
    document.getElementById('domandaCounter').textContent = `Domanda ${currentTema + 1} di ${domande.length}`;
    document.getElementById('progress').style.width = `${(currentTema / domande.length) * 100}%`;

    const opzioniContainer = document.getElementById('opzioni');
    opzioniContainer.innerHTML = '';
    
    temaCorrente.opzioni.forEach((opzione) => {
        const button = document.createElement('button');
        button.className = 'option-button';
        button.textContent = opzione.testo;
        button.onclick = () => handleRisposta(opzione);
        opzioniContainer.appendChild(button);
    });
}

// Gestione delle risposte
function handleRisposta(risposta) {
    risposteDate[domande[currentTema].tema] = risposta;
    currentTema++;
    if (currentTema < domande.length) {
        mostraDomanda();
    } else {
        calcolaRisultati();
    }
}

// Calcola i risultati
function calcolaRisultati() {
    // Calcola il punteggio totale
    const punteggioTotale = Object.values(risposteDate)
        .reduce((sum, risposta) => sum + risposta.punteggio, 0);

    // Determina il messaggio basato sul punteggio
    let messaggio;
    if (punteggioTotale < 24) {
        messaggio = "Il tuo livello di empowerment è basso";
    } else if (punteggioTotale >= 24 && punteggioTotale < 40) {
        messaggio = "Hai un buon livello di empowerment";
    } else {
        messaggio = "Il tuo livello di empowerment è eccellente";
    }

    mostraRisultati(punteggioTotale, messaggio);
}

// Mostra i risultati
function mostraRisultati(punteggio, messaggio) {
    document.getElementById('questionario').style.display = 'none';
    document.getElementById('risultati').style.display = 'block';

    document.getElementById('datiRispondente').innerHTML = `
        <h3>Dati Rispondente</h3>
        <p>Nome: ${datiRispondente.nome}</p>
        <p>Cognome: ${datiRispondente.cognome}</p>
        <p>Data: ${datiRispondente.timestamp.toLocaleString()}</p>
    `;

    document.getElementById('empowermentMessage').textContent = messaggio;
    document.getElementById('punteggio').innerHTML = `
        <h3>Punteggio</h3>
        <p>Totale: ${punteggio}</p>
    `;
}

// Download dei risultati
function downloadResults(format) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${datiRispondente.cognome}_${datiRispondente.nome}_${timestamp}`;
    
    if (format === 'json') {
        const data = {
            datiRispondente: {
                nome: datiRispondente.nome,
                cognome: datiRispondente.cognome,
                dataCompilazione: datiRispondente.timestamp
            },
            risposte: risposteDate,
            punteggio: document.getElementById('punteggio').innerText,
            valutazione: document.getElementById('empowermentMessage').innerText
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        downloadFile(blob, `${filename}.json`);
    } else if (format === 'html') {
        const html = `
            <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: Arial, sans-serif; margin: 40px; }
                        h1 { color: #2c3e50; text-align: center; }
                        .section { margin: 20px 0; padding: 20px; border: 1px solid #eee; border-radius: 5px; }
                        .empowerment-message { font-size: 1.25rem; font-weight: bold; text-align: center; }
                    </style>
                </head>
                <body>
 <h1>Report Valutazione Empowerment</h1>
                    <div class="section">
                        ${document.getElementById('datiRispondente').innerHTML}
                    </div>
                    <div class="section">
                        <h3>Valutazione</h3>
                        <p class="empowerment-message">
                            ${document.getElementById('empowermentMessage').innerText}
                        </p>
                        ${document.getElementById('punteggio').innerHTML}
                    </div>
                </body>
            </html>
        `;
        
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        downloadFile(blob, `${filename}.html`);
    }
}

// Funzione helper per il download dei file
function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Funzione per mostrare errori
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 3000);
}