import React from 'react'
import ReactDOM from 'react-dom/client'
import { SpeedInsights } from '@vercel/speed-insights/react'
import App from './App.jsx'
import './index.css'
import { bootstrapNativeApp } from './native/bootstrap'
import { isNativeApp } from './native/platform'

const renderApp = () => {
    ReactDOM.createRoot(document.getElementById('root')).render(
        <React.StrictMode>
            <App />
            {/* Vercel 애널리틱스는 웹 배포에만 의미가 있다. */}
            {isNativeApp() ? null : <SpeedInsights />}
        </React.StrictMode>,
    )
}

// 네이티브에서는 저장된 세션 토큰 복원이 끝난 뒤 App을 마운트해야 한다.
// 부트스트랩이 실패해도 앱은 반드시 렌더링한다.
bootstrapNativeApp().finally(renderApp)
