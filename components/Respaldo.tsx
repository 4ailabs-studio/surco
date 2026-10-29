"use client";

import { Component, type ReactNode } from "react";

/** Si algo inesperado truena, muestra una salida en lugar de una pantalla en blanco. */
export default class Respaldo extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  componentDidCatch(e: unknown) { console.error("Surco:", e); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="w-app"><main className="w-pantalla"><section className="w-centro">
        <h1>Algo salió mal.</h1>
        <p className="w-sub">No perdiste nada importante: Surco no guarda tus datos. Puedes empezar de nuevo o usar la versión de tablero.</p>
        <div className="w-acciones-col">
          <button type="button" className="w-primario" onClick={() => location.reload()}>Empezar de nuevo</button>
          <a className="w-secundario" href="/tablero">Usar la versión de tablero</a>
        </div>
      </section></main></div>
    );
  }
}
