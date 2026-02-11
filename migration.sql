-- =============================================
-- MIGRATION: Gestione Carichi Avanzata
-- Data: 2025-02
-- Descrizione: Aggiunge mulino_id, total_quantita, nuovi stati
--              e stato_logistico agli ordini
-- =============================================

-- =============================================
-- BACKUP SUGGERITO PRIMA DI ESEGUIRE
-- =============================================
-- pg_dump -U postgres -d gestionale_corrado > backup_pre_migration.sql


-- =============================================
-- 1. MODIFICA TABELLA CARICHI
-- =============================================

-- Aggiungi colonna mulino_id (sarà NOT NULL dopo il popolamento)
ALTER TABLE carichi 
ADD COLUMN IF NOT EXISTS mulino_id INTEGER;

-- Aggiungi colonna total_quantita cached
ALTER TABLE carichi 
ADD COLUMN IF NOT EXISTS total_quantita NUMERIC(10,2) DEFAULT 0 NOT NULL;

-- Aggiungi colonna aggiornato_il
ALTER TABLE carichi 
ADD COLUMN IF NOT EXISTS aggiornato_il TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Rinomina colonne per coerenza (se esistono con nomi vecchi)
-- tipo_carico -> tipo
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'carichi' AND column_name = 'tipo_carico'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'carichi' AND column_name = 'tipo'
    ) THEN
        ALTER TABLE carichi RENAME COLUMN tipo_carico TO tipo;
    END IF;
END $$;

-- data_carico -> data_ritiro
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'carichi' AND column_name = 'data_carico'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'carichi' AND column_name = 'data_ritiro'
    ) THEN
        ALTER TABLE carichi RENAME COLUMN data_carico TO data_ritiro;
    END IF;
END $$;


-- =============================================
-- 2. POPOLA mulino_id DAI DATI ESISTENTI
-- =============================================

-- Per ogni carico esistente, prendi il mulino dell'ordine con più quintali
UPDATE carichi c
SET mulino_id = (
    SELECT ro.mulino_id
    FROM ordini o
    JOIN righe_ordine ro ON ro.ordine_id = o.id
    WHERE o.carico_id = c.id
    GROUP BY ro.mulino_id
    ORDER BY SUM(ro.quintali) DESC
    LIMIT 1
)
WHERE c.mulino_id IS NULL
AND EXISTS (SELECT 1 FROM ordini WHERE carico_id = c.id);

-- Per carichi senza ordini, assegna un mulino di default (primo disponibile)
-- Questi carichi andrebbero probabilmente eliminati
UPDATE carichi c
SET mulino_id = (SELECT id FROM mulini LIMIT 1)
WHERE c.mulino_id IS NULL;


-- =============================================
-- 3. POPOLA total_quantita DAI DATI ESISTENTI
-- =============================================

UPDATE carichi c
SET total_quantita = COALESCE((
    SELECT SUM(ro.quintali)
    FROM ordini o
    JOIN righe_ordine ro ON ro.ordine_id = o.id
    WHERE o.carico_id = c.id
), 0);


-- =============================================
-- 4. AGGIUNGI CONSTRAINT E FK
-- =============================================

-- Ora che mulino_id è popolato, rendilo NOT NULL
ALTER TABLE carichi 
ALTER COLUMN mulino_id SET NOT NULL;

-- Aggiungi FK a mulini (se non esiste)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'carichi_mulino_id_fkey'
    ) THEN
        ALTER TABLE carichi 
        ADD CONSTRAINT carichi_mulino_id_fkey 
        FOREIGN KEY (mulino_id) REFERENCES mulini(id);
    END IF;
END $$;

-- Check constraint per tipo
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'check_tipo_carico'
    ) THEN
        ALTER TABLE carichi 
        ADD CONSTRAINT check_tipo_carico 
        CHECK (tipo IN ('sfuso', 'pedane'));
    END IF;
END $$;

-- Check constraint per stato (aggiorna con nuovi stati)
-- Prima rimuovi il vecchio se esiste
ALTER TABLE carichi DROP CONSTRAINT IF EXISTS check_stato_carico;
ALTER TABLE carichi DROP CONSTRAINT IF EXISTS carichi_stato_check;

-- Aggiorna stati esistenti al nuovo formato
UPDATE carichi SET stato = 'bozza' WHERE stato = 'aperto';
UPDATE carichi SET stato = 'consegnato' WHERE stato = 'ritirato';

-- Aggiungi nuovo constraint
ALTER TABLE carichi 
ADD CONSTRAINT check_stato_carico 
CHECK (stato IN ('bozza', 'assegnato', 'ritirato', 'consegnato'));

-- Check constraint per max quintali
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'check_max_quantita'
    ) THEN
        ALTER TABLE carichi 
        ADD CONSTRAINT check_max_quantita 
        CHECK (total_quantita <= 300);
    END IF;
END $$;


-- =============================================
-- 5. MODIFICA TABELLA ORDINI
-- =============================================

-- Aggiungi colonna stato_logistico
ALTER TABLE ordini 
ADD COLUMN IF NOT EXISTS stato_logistico VARCHAR(20) DEFAULT 'aperto' NOT NULL;

-- Aggiungi colonna aggiornato_il
ALTER TABLE ordini 
ADD COLUMN IF NOT EXISTS aggiornato_il TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Check constraint per stato_logistico
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'check_stato_logistico'
    ) THEN
        ALTER TABLE ordini 
        ADD CONSTRAINT check_stato_logistico 
        CHECK (stato_logistico IN ('aperto', 'in_cluster', 'in_carico', 'spedito'));
    END IF;
END $$;

-- Check constraint per tipo_ordine
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'check_tipo_ordine'
    ) THEN
        ALTER TABLE ordini 
        ADD CONSTRAINT check_tipo_ordine 
        CHECK (tipo_ordine IN ('sfuso', 'pedane'));
    END IF;
END $$;


-- =============================================
-- 6. POPOLA stato_logistico DAI DATI ESISTENTI
-- =============================================

-- Ordini già in carichi assegnati
UPDATE ordini o
SET stato_logistico = 'in_carico'
WHERE o.carico_id IS NOT NULL
AND EXISTS (
    SELECT 1 FROM carichi c 
    WHERE c.id = o.carico_id 
    AND c.stato = 'assegnato'
);

-- Ordini in carichi bozza
UPDATE ordini o
SET stato_logistico = 'in_cluster'
WHERE o.carico_id IS NOT NULL
AND EXISTS (
    SELECT 1 FROM carichi c 
    WHERE c.id = o.carico_id 
    AND c.stato = 'bozza'
);

-- Ordini già ritirati/consegnati
UPDATE ordini o
SET stato_logistico = 'spedito'
WHERE o.carico_id IS NOT NULL
AND EXISTS (
    SELECT 1 FROM carichi c 
    WHERE c.id = o.carico_id 
    AND c.stato IN ('ritirato', 'consegnato')
);

-- Ordini con stato legacy 'ritirato' senza carico
UPDATE ordini
SET stato_logistico = 'spedito'
WHERE stato = 'ritirato' AND carico_id IS NULL;


-- =============================================
-- 7. INDICI PER PERFORMANCE
-- =============================================

-- Indice su carichi.mulino_id
CREATE INDEX IF NOT EXISTS idx_carichi_mulino_id 
ON carichi(mulino_id);

-- Indice composto carichi per ricerche frequenti
CREATE INDEX IF NOT EXISTS idx_carichi_mulino_tipo_stato 
ON carichi(mulino_id, tipo, stato);

-- Indice carichi per lista aperti
CREATE INDEX IF NOT EXISTS idx_carichi_stato_data 
ON carichi(stato, data_ritiro);

-- Indice su ordini.carico_id (se non esiste già)
CREATE INDEX IF NOT EXISTS idx_ordini_carico_id 
ON ordini(carico_id);

-- Indice composto ordini per carico + stato
CREATE INDEX IF NOT EXISTS idx_ordini_carico_stato 
ON ordini(carico_id, stato_logistico);

-- Indice ordini per composizione carichi
CREATE INDEX IF NOT EXISTS idx_ordini_tipo_stato_logistico 
ON ordini(tipo_ordine, stato_logistico);

-- Indice su righe_ordine per calcolo quintali
CREATE INDEX IF NOT EXISTS idx_righe_ordine_mulino 
ON righe_ordine(ordine_id, mulino_id);


-- =============================================
-- 8. TRIGGER PER aggiornato_il
-- =============================================

-- Funzione per aggiornare timestamp
CREATE OR REPLACE FUNCTION update_aggiornato_il()
RETURNS TRIGGER AS $$
BEGIN
    NEW.aggiornato_il = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger su carichi
DROP TRIGGER IF EXISTS trigger_carichi_aggiornato_il ON carichi;
CREATE TRIGGER trigger_carichi_aggiornato_il
    BEFORE UPDATE ON carichi
    FOR EACH ROW
    EXECUTE FUNCTION update_aggiornato_il();

-- Trigger su ordini
DROP TRIGGER IF EXISTS trigger_ordini_aggiornato_il ON ordini;
CREATE TRIGGER trigger_ordini_aggiornato_il
    BEFORE UPDATE ON ordini
    FOR EACH ROW
    EXECUTE FUNCTION update_aggiornato_il();


-- =============================================
-- 9. VERIFICA MIGRATION
-- =============================================

-- Mostra struttura tabelle aggiornate
SELECT 'CARICHI - Nuove colonne:' AS info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'carichi'
ORDER BY ordinal_position;

SELECT 'ORDINI - Nuove colonne:' AS info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'ordini'
ORDER BY ordinal_position;

SELECT 'INDICI CREATI:' AS info;
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('carichi', 'ordini', 'righe_ordine')
AND indexname LIKE 'idx_%';

SELECT 'Migration completata con successo!' AS status;