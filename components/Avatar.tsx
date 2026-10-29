/** Avatar de Surco: un brote de milpa sobre surcos, dentro de un círculo. */
export default function Avatar({ size = 72, hablando = false }: { size?: number; hablando?: boolean }) {
  return (
    <svg className={`avatar${hablando ? " hablando" : ""}`} width={size} height={size} viewBox="0 0 96 96" role="img" aria-label="Surco">
      <defs>
        <clipPath id="circ"><circle cx="48" cy="48" r="46" /></clipPath>
      </defs>
      <circle cx="48" cy="48" r="46" fill="var(--w-cielo-fuerte)" />
      <g clipPath="url(#circ)">
        <path d="M-4 70 Q48 58 100 70 L100 100 L-4 100 Z" fill="var(--w-tierra)" />
        <path d="M-4 78 Q48 66 100 78" stroke="var(--w-tierra-clara)" strokeWidth="3" fill="none" />
        <path d="M-4 87 Q48 75 100 87" stroke="var(--w-tierra-clara)" strokeWidth="3" fill="none" />
      </g>
      <path d="M48 66 V34" stroke="var(--w-milpa)" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M48 50 C38 48 31 41 30 31 C40 32 46 39 48 50 Z" fill="var(--w-milpa)" />
      <path d="M48 42 C58 40 65 33 66 23 C56 24 50 31 48 42 Z" fill="var(--w-milpa-clara)" />
      <ellipse cx="48" cy="29" rx="5" ry="8" fill="var(--w-elote)" />
    </svg>
  );
}
