import React from "react";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="pg-footer">
      <div className="pg-footer-inner">
        <span>© {year} Pokeguess 41</span>
        <small className="pg-footer-sub">Thank God — Catch 'em all</small>
      </div>
    </footer>
  );
}
