"""
Services Layer - Logica di business centralizzata

Questo modulo contiene i service che implementano la logica
di dominio dell'applicazione, separata dai router (controller)
e dai modelli (data layer).
"""

from app.services.carico_service import (
    # Validazione
    validate_load_constraints,
    get_mulino_principale_ordine,
    calcola_totale_quintali_ordine,
    calcola_totale_quintali_carico,
    
    # Creazione
    create_draft_load,
    create_load_from_large_order,
    
    # Assegnazione
    assign_transport,
    
    # Gestione ordini
    add_order_to_load,
    remove_order_from_load,
    
    # Sincronizzazione
    recalculate_load_total,
    
    # Transizioni stato
    mark_load_as_picked_up,
    mark_load_as_delivered,
    
    # Query
    get_carichi_aperti_per_mulino,
    get_ordini_disponibili_per_carico,
    
    # Costanti
    MAX_QUINTALI_CARICO,
    SOGLIA_MINIMA_QUINTALI,
    SOGLIA_ORDINE_SINGOLO,
)

__all__ = [
    # Validazione
    "validate_load_constraints",
    "get_mulino_principale_ordine",
    "calcola_totale_quintali_ordine",
    "calcola_totale_quintali_carico",
    
    # Creazione
    "create_draft_load",
    "create_load_from_large_order",
    
    # Assegnazione
    "assign_transport",
    
    # Gestione ordini
    "add_order_to_load",
    "remove_order_from_load",
    
    # Sincronizzazione
    "recalculate_load_total",
    
    # Transizioni stato
    "mark_load_as_picked_up",
    "mark_load_as_delivered",
    
    # Query
    "get_carichi_aperti_per_mulino",
    "get_ordini_disponibili_per_carico",
    
    # Costanti
    "MAX_QUINTALI_CARICO",
    "SOGLIA_MINIMA_QUINTALI",
    "SOGLIA_ORDINE_SINGOLO",
]