import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {error: string | null}> {
  constructor(props: any) { super(props); this.state = { error: null }; }
  componentDidCatch(error: Error) { console.error('App Error:', error); this.setState({ error: error.message + '\n' + error.stack?.substring(0, 600) }); }
  static getDerivedStateFromError(error: Error) { return { error: error.message }; }
  render() {
    if (this.state.error) {
      return <div style={{color:'red',padding:'20px',fontFamily:'monospace',background:'#111',minHeight:'100vh',whiteSpace:'pre-wrap'}}>
        <h2 style={{color:'#ff6b6b'}}>⚠️ Z12 CFO Suite — Erreur de démarrage</h2>
        <pre style={{fontSize:12,opacity:0.8}}>{this.state.error}</pre>
        <button onClick={()=>window.location.reload()} style={{marginTop:20,padding:'8px 20px',cursor:'pointer'}}>Recharger</button>
      </div>;
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
