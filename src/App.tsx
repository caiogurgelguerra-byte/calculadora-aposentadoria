import { Routes, Route } from 'react-router-dom'
import PublicLayout from './components/PublicLayout'
import Home from './pages/Home'
import AposentadoriaPage from './pages/AposentadoriaPage'
import SalarioPage from './pages/SalarioPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="aposentadoria" element={<AposentadoriaPage />} />
        <Route path="salario" element={<SalarioPage />} />
      </Route>
    </Routes>
  )
}
