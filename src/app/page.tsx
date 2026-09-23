import { GameCanvas } from "./GameCanvas";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <GameCanvas />
    </main>
  );
}
