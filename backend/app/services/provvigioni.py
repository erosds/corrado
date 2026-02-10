def calcola_provvigione(prodotto, quintali, prezzo_q):
    
    if prodotto.tipo_provvigione == "percentuale":
        return quintali * prezzo_q * (prodotto.valore_provvigione / 100)

    if prodotto.tipo_provvigione == "fisso":
        return quintali * prodotto.valore_provvigione

    return 0
