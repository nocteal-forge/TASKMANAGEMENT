import styles from './App.module.css'

// 起動確認用の初期画面。タスク管理の機能は、まだ実装しない。
function App() {
  return (
    <main className={styles.container}>
      <h1 className={styles.title}>TASKMANAGEMENT</h1>
      <p className={styles.subtitle}>タスク管理アプリ(開発用の初期画面)</p>
    </main>
  )
}

export default App
