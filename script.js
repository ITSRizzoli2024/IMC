// Variabili globali
let domande = [];
let currentTema = 0;
let risposteDate = {};
let datiRispondente = {
    nome: '',
    cognome: '',
    timestamp: null
};

// Funzione per correggere i caratteri accentati
function fixAccents(text) {
    if (!text) return '';
    return text
        .replace(/ˆ/g, 'à')
        .replace(/ /g, 'à')
        .replace(/˜/g, 'ò')
        .replace(/Ž/g, 'é')
        .replace(/ /g, 'è')
        .replace(/ /g, 'ì')
        .replace(/ /g, 'ù')
        .replace(/ /g, 'ò');
}

// Carica il CSV all'avvio
window.addEventListener('DOMContentLoaded', caricaDomande);

// Carica il CSV
async function caricaDomande() {
    try {
        const response = await fetch('domande_questionario.csv');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        
        Papa.parse(text, {
            header: true,
            delimiter: ';',
            complete: (results) => {
                console.log('Risultati parsing:', results); // Debug
                const domandeGruppate = results.data.reduce((acc, row) => {
                    if (!row.tema) return acc;
                    const tema = fixAccents(row.tema);
                    if (!acc[tema]) {
                        acc[tema] = {
                            tema: tema,
                            opzioni: []
                        };
                    }
                    acc[tema].opzioni.push({
                        testo: fixAccents(row.domande),
                        chiave: row.chiave,
                        punteggio: parseInt(row.punteggio)
                    });
                    return acc;
                }, {});

                domande = Object.values(domandeGruppate);
                console.log('Domande caricate:', domande);
            },
            error: (error) => {
                console.error('Errore nel parsing:', error);
                showError('Errore nel parsing del CSV: ' + error.message);
            }
        });
    } catch (error) {
        console.error('Errore completo:', error);
        showError('Errore nel caricamento del file: ' + error.message);
    }
}

// Gestione del form dati
document.getElementById('formDati').addEventListener('submit', function(e) {
    e.preventDefault();
    const nome = document.getElementById('nome').value.trim();
    const cognome = document.getElementById('cognome').value.trim();
    
    if (!nome || !cognome) {
        showError('Per favore compila tutti i campi');
        return;
    }

    datiRispondente = {
        nome: nome,
        cognome: cognome,
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

// Calcolo dei risultati
function calcolaRisultati() {
    let punteggiCompetenze = {
        pp: 0, il: 0, se: 0, h: 0, r: 0,
        cn: 0, i: 0, cs: 0, it: 0,
        im: 0, cr: 0, cu: 0
    };

    Object.entries(risposteDate).forEach(([tema, risposta]) => {
        const chiave = risposta.chiave.toLowerCase();
        if (chiave in punteggiCompetenze) {
            punteggiCompetenze[chiave] += risposta.punteggio;
        }
    });

    const profiloEmpowered = punteggiCompetenze.pp + punteggiCompetenze.il + 
                           punteggiCompetenze.se + punteggiCompetenze.h + 
                           punteggiCompetenze.r;

    const profiloConsapevole = punteggiCompetenze.cn + punteggiCompetenze.i + 
                             punteggiCompetenze.cs + punteggiCompetenze.se + 
                             punteggiCompetenze.it;

    const profiloTrasformatore = punteggiCompetenze.it + punteggiCompetenze.im + 
                               punteggiCompetenze.cr + punteggiCompetenze.cu + 
                               punteggiCompetenze.i;

    const risultati = {
        'Profilo Empowered': profiloEmpowered,
        'Profilo Consapevole': profiloConsapevole,
        'Profilo Trasformatore': profiloTrasformatore,
        'Punteggio Totale': profiloEmpowered + profiloConsapevole + profiloTrasformatore
    };

    mostraRisultati(risultati);
}

// Visualizzazione dei risultati
function mostraRisultati(risultati) {
    document.getElementById('questionario').style.display = 'none';
    document.getElementById('risultati').style.display = 'block';

    const datiSection = document.getElementById('datiRispondente');
    datiSection.innerHTML = `
        <h3>Dati Rispondente</h3>
        <p>Nome: ${datiRispondente.nome}</p>
        <p>Cognome: ${datiRispondente.cognome}</p>
        <p>Data: ${datiRispondente.timestamp.toLocaleString()}</p>
    `;

    const punteggiSection = document.getElementById('punteggi');
    punteggiSection.innerHTML = Object.entries(risultati)
        .map(([profilo, punteggio]) => `
            <div class="score-item">
                <div>${profilo}</div>
                <div class="score-value">${punteggio}</div>
            </div>
        `).join('');
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
            risultati: document.getElementById('punteggi').innerText
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
                        .score-item { margin: 10px 0; }
                        .score-value { font-size: 24px; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <h1>Report Valutazione Competenze</h1>
                    <div class="section">
                        ${document.getElementById('datiRispondente').innerHTML}
                    </div>
                    <div class="section">
                        <h3>Risultati</h3>
                        ${document.getElementById('punteggi').innerHTML}
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
