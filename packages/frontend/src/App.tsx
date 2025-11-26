import { BrowserRouter, Routes, Route } from 'react-router-dom';

function HomePage(): JSX.Element {
  return (
    <div className="container">
      <header className="header">
        <h1>AI Humanizer</h1>
        <p>Transform AI-generated text into natural, human-like content</p>
      </header>
      <main className="main">
        <section className="hero">
          <h2>Welcome to AI Humanizer</h2>
          <p>
            Our advanced platform helps you transform AI-generated content into authentic,
            human-sounding text that maintains your original meaning while evading AI detection.
          </p>
        </section>
      </main>
    </div>
  );
}

function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
