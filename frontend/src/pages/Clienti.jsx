import { useEffect, useState } from "react";
import api from "../api/api";

export default function Clienti() {
  const [clienti, setClienti] = useState([]);

  useEffect(() => {
    api.get("/clienti").then(res => setClienti(res.data));
  }, []);

  return (
    <div>
      <h2>Clienti</h2>
      {clienti.map(c => (
        <div key={c.id}>
          {c.nome} — {c.partita_iva}
        </div>
      ))}
    </div>
  );
}
