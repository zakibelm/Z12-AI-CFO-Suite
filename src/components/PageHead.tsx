import React from "react";

export const PageHead = ({title, sub, actions}: any) => (
  <header className="page-head">
    <div><div className="page-title serif">{title}</div><div className="page-sub">{sub}</div></div>
    <div className="page-actions">{actions}</div>
  </header>
);

export const Spark = ({color="var(--accent)"}: any) => (
  <svg className="tile-spark" width="80" height="32" viewBox="0 0 80 32"><polyline fill="none" stroke={color} strokeWidth="1.5" points="0,24 12,20 24,22 36,14 48,16 60,8 72,10 80,4"/></svg>
);
