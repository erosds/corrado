-- =============================================
-- GESTIONALE FARINA - SCHEMA DATABASE
-- =============================================
-- Eseguire con: psql -U postgres -d corrado -f crea_db.sql
-- Oppure creare prima il db: createdb -U postgres corrado
-- =============================================

-- Elimina tabelle esistenti (in ordine inverso per le FK)
DROP TABLE IF EXISTS storico_prezzi CASCADE;
DROP TABLE IF EXISTS righe_ordine CASCADE;
DROP TABLE IF EXISTS ordini CASCADE;
DROP TABLE IF EXISTS carichi CASCADE;
DROP TABLE IF EXISTS prodotti CASCADE;
DROP TABLE IF EXISTS trasportatori CASCADE;
DROP TABLE IF EXISTS mulini CASCADE;
DROP TABLE IF EXISTS clienti CASCADE;

-- =============================================
-- TABELLE PRINCIPALI
-- =============================================

-- CLIENTI
CREATE TABLE clienti (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    partita_iva VARCHAR(20),
    indirizzo_consegna TEXT,
    telefono_fisso VARCHAR(30),
    cellulare VARCHAR(30),
    email VARCHAR(255),
    referente VARCHAR(255),
    pedana_standard VARCHAR(10),  -- "8", "10", "12.5"
    riba BOOLEAN DEFAULT FALSE,   -- Se TRUE, calcola data incasso automatica
    note TEXT,
    creato_il TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_clienti_nome ON clienti(nome);

-- MULINI
CREATE TABLE mulini (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    indirizzo_ritiro TEXT,
    telefono VARCHAR(30),
    email1 VARCHAR(255),
    email2 VARCHAR(255),
    email3 VARCHAR(255),
    note TEXT
);

CREATE INDEX idx_mulini_nome ON mulini(nome);

-- PRODOTTI
CREATE TABLE prodotti (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    mulino_id INTEGER NOT NULL REFERENCES mulini(id) ON DELETE RESTRICT,
    tipologia VARCHAR(50),        -- "0", "00", "altro"
    tipo_provvigione VARCHAR(20) DEFAULT 'percentuale',  -- "percentuale" o "fisso"
    valore_provvigione NUMERIC(10,2) DEFAULT 3,          -- 3% default o €/quintale
    note TEXT
);

CREATE INDEX idx_prodotti_nome ON prodotti(nome);
CREATE INDEX idx_prodotti_mulino ON prodotti(mulino_id);

-- TRASPORTATORI
CREATE TABLE trasportatori (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    telefono VARCHAR(30),
    note TEXT
);

CREATE INDEX idx_trasportatori_nome ON trasportatori(nome);

-- CARICHI (carico completo di trasporto)
CREATE TABLE carichi (
    id SERIAL PRIMARY KEY,
    trasportatore_id INTEGER REFERENCES trasportatori(id) ON DELETE SET NULL,
    tipo_carico VARCHAR(20) NOT NULL,  -- "pedane" o "sfuso" (mai misto)
    data_carico DATE,
    stato VARCHAR(20) DEFAULT 'aperto',  -- "aperto" o "ritirato"
    note TEXT,
    creato_il TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_carichi_stato ON carichi(stato);
CREATE INDEX idx_carichi_tipo ON carichi(tipo_carico);

-- ORDINI
CREATE TABLE ordini (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES clienti(id) ON DELETE RESTRICT,
    data_ordine DATE NOT NULL,
    data_ritiro DATE,
    data_incasso_mulino DATE,      -- Per calcolo provvigioni trimestrali
    tipo_ordine VARCHAR(20) NOT NULL,  -- "pedane" o "sfuso"
    trasportatore_id INTEGER REFERENCES trasportatori(id) ON DELETE SET NULL,
    carico_id INTEGER REFERENCES carichi(id) ON DELETE SET NULL,
    stato VARCHAR(20) DEFAULT 'inserito',  -- "inserito" o "ritirato"
    note TEXT,
    creato_il TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ordini_cliente ON ordini(cliente_id);
CREATE INDEX idx_ordini_data ON ordini(data_ordine);
CREATE INDEX idx_ordini_stato ON ordini(stato);
CREATE INDEX idx_ordini_carico ON ordini(carico_id);
CREATE INDEX idx_ordini_incasso ON ordini(data_incasso_mulino);

-- RIGHE ORDINE
CREATE TABLE righe_ordine (
    id SERIAL PRIMARY KEY,
    ordine_id INTEGER NOT NULL REFERENCES ordini(id) ON DELETE CASCADE,
    prodotto_id INTEGER NOT NULL REFERENCES prodotti(id) ON DELETE RESTRICT,
    mulino_id INTEGER NOT NULL REFERENCES mulini(id) ON DELETE RESTRICT,
    pedane NUMERIC(10,2),          -- Numero pedane (se ordine a pedane)
    quintali NUMERIC(10,2) NOT NULL,
    prezzo_quintale NUMERIC(10,2) NOT NULL,
    prezzo_totale NUMERIC(12,2) NOT NULL
);

CREATE INDEX idx_righe_ordine ON righe_ordine(ordine_id);
CREATE INDEX idx_righe_prodotto ON righe_ordine(prodotto_id);
CREATE INDEX idx_righe_mulino ON righe_ordine(mulino_id);

-- STORICO PREZZI (per suggerimento e consultazione)
CREATE TABLE storico_prezzi (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES clienti(id) ON DELETE CASCADE,
    prodotto_id INTEGER NOT NULL REFERENCES prodotti(id) ON DELETE CASCADE,
    prezzo NUMERIC(10,2) NOT NULL,
    creato_il TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_storico_cliente ON storico_prezzi(cliente_id);
CREATE INDEX idx_storico_prodotto ON storico_prezzi(prodotto_id);
CREATE INDEX idx_storico_data ON storico_prezzi(creato_il);

-- =============================================
-- DATI DI ESEMPIO (opzionale, decommentare se serve)
-- =============================================

/*
-- Mulini di esempio
INSERT INTO mulini (nome, indirizzo_ritiro, telefono, email1) VALUES
('Molino Rossi', 'Via Roma 1, Milano', '02 1234567', 'info@molinorossi.it'),
('Molino Bianchi', 'Via Verdi 10, Torino', '011 9876543', 'ordini@molinobianchi.it'),
('Molino Verdi', 'Via Dante 5, Bologna', '051 5555555', 'commerciale@molinoverdi.it');

-- Prodotti di esempio
INSERT INTO prodotti (nome, mulino_id, tipologia, tipo_provvigione, valore_provvigione) VALUES
('Farina 00 Classica', 1, '00', 'percentuale', 3),
('Farina 0 Forte', 1, '0', 'percentuale', 3),
('Semola Rimacinata', 2, 'altro', 'percentuale', 4),
('Farina 00 Manitoba', 2, '00', 'fisso', 1),
('Farina Integrale', 3, 'altro', 'percentuale', 3);

-- Trasportatori di esempio
INSERT INTO trasportatori (nome, telefono) VALUES
('Trasporti Veloci SRL', '333 1111111'),
('Logistica Nord', '333 2222222');

-- Clienti di esempio
INSERT INTO clienti (nome, partita_iva, cellulare, pedana_standard, riba) VALUES
('Panificio Da Mario', '12345678901', '333 3333333', '10', FALSE),
('Forno Centrale', '98765432109', '333 4444444', '8', TRUE),
('Pasticceria Dolce Vita', '11122233344', '333 5555555', '12.5', FALSE);
*/

-- =============================================
-- VERIFICA CREAZIONE
-- =============================================
SELECT 'Database creato con successo!' AS messaggio;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;