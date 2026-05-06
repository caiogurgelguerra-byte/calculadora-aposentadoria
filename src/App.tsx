import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import AposentadoriaPage from './pages/AposentadoriaPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="aposentadoria" element={<AposentadoriaPage />} />
      </Route>
    </Routes>
  )
}
