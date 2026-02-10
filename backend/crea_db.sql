CREATE TABLE clienti (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    partita_iva TEXT,
    indirizzo_consegna TEXT,
    telefono_fisso TEXT,
    cellulare TEXT,
    email TEXT,
    referente TEXT,
    pedana_standard TEXT,
    riba BOOLEAN DEFAULT FALSE,
    note TEXT,
    creato_il TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mulini (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    indirizzo_ritiro TEXT,
    telefono TEXT,
    email1 TEXT,
    email2 TEXT,
    email3 TEXT,
    note TEXT
);

CREATE TABLE prodotti (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    mulino_id INTEGER REFERENCES mulini(id),
    tipologia TEXT,
    tipo_provvigione TEXT DEFAULT 'percentuale',
    valore_provvigione NUMERIC DEFAULT 3,
    note TEXT
);

CREATE TABLE trasportatori (
    id SERIAL PRIMARY KEY,
    nome TEXT,
    note TEXT
);

CREATE TABLE ordini (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES clienti(id),
    data_ordine DATE,
    data_ritiro DATE,
    data_incasso_mulino DATE,
    tipo_ordine TEXT,
    trasportatore_id INTEGER REFERENCES trasportatori(id),
    stato TEXT DEFAULT 'inserito',
    note TEXT
);

CREATE TABLE righe_ordine (
    id SERIAL PRIMARY KEY,
    ordine_id INTEGER REFERENCES ordini(id),
    prodotto_id INTEGER REFERENCES prodotti(id),
    mulino_id INTEGER REFERENCES mulini(id),
    pedane NUMERIC,
    quintali NUMERIC,
    prezzo_quintale NUMERIC,
    prezzo_totale NUMERIC
);

CREATE TABLE storico_prezzi (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES clienti(id),
    prodotto_id INTEGER REFERENCES prodotti(id),
    prezzo NUMERIC,
    creato_il TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
