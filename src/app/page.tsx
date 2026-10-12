import { GameApp } from "./GameApp";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <GameApp />
    </main>
  );
}
