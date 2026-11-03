"use client";

import { useMemo } from "react";
import { KeyboardMenu } from "./KeyboardMenu";
import styles from "./Menu.module.css";

interface PlaceholderSectionProps {
  testId: string;
  title: string;
  onBack: () => void;
}

/** Sección del menú principal que todavía no tiene contenido (Puntajes: incremento 28; Opciones: 29). */
export function PlaceholderSection({ testId, title, onBack }: PlaceholderSectionProps) {
  const options = useMemo(() => [{ label: "Volver", action: onBack, testId: `${testId}-back` }], [testId, onBack]);
  return (
    <KeyboardMenu
      testId={testId}
      title={title}
      subtitle={<p className={styles.hint}>Próximamente</p>}
      options={options}
      onEscape={onBack}
    />
  );
}
