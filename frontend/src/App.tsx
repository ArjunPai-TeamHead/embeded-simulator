import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { EditorPage } from './pages/EditorPage';
import { ExamplesPage } from './pages/ExamplesPage';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<EditorPage />} />
        <Route path="/examples" element={<ExamplesPage />} />
        <Route path="*" element={<EditorPage />} />
      </Routes>
    </Router>
  );
}

export default App;
