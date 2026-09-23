import { useEffect, useMemo, useState } from "react";
import { COLOMBIA_DEPARTMENTS, getCitiesByDepartment } from "@/lib/data/colombia-divipola";

const STREET_TYPES = [
  { value: "Cl", label: "Calle" },
  { value: "Cra", label: "Carrera" },
  { value: "Av", label: "Avenida" },
  { value: "Dg", label: "Diagonal" },
  { value: "Tv", label: "Transversal" },
  { value: "Cir", label: "Circular" },
];

const CONTROL =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary disabled:opacity-60";

/** Serializa los campos a "Cl 97A # 76-5, Medellín, Antioquia". Devuelve "" si no hay datos. */
export function buildAddress(parts: {
  streetType: string;
  road: string;
  cross: string;
  number: string;
  city: string;
  departmentName: string;
}): string {
  const road = parts.road.trim();
  const cross = parts.cross.trim();
  const num = parts.number.trim();
  let street = "";
  if (road) {
    street = `${parts.streetType} ${road}`;
    if (cross || num) street += ` # ${cross}${num ? `-${num}` : ""}`;
  }
  return [street, parts.city, parts.departmentName].filter(Boolean).join(", ");
}

interface AddressFieldsProps {
  onChange: (address: string) => void;
  disabled?: boolean;
}

export function AddressFields({ onChange, disabled }: AddressFieldsProps) {
  const [streetType, setStreetType] = useState("Cl");
  const [road, setRoad] = useState("");
  const [cross, setCross] = useState("");
  const [number, setNumber] = useState("");
  const [departmentCode, setDepartmentCode] = useState("");
  const [city, setCity] = useState("");

  const cities = useMemo(() => getCitiesByDepartment(departmentCode), [departmentCode]);
  const departmentName = COLOMBIA_DEPARTMENTS.find((d) => d.code === departmentCode)?.name ?? "";

  useEffect(() => {
    onChange(buildAddress({ streetType, road, cross, number, city, departmentName }));
    // onChange es estable en el padre (setState); solo reaccionamos a los campos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streetType, road, cross, number, city, departmentName]);

  const label = "mb-1.5 block text-sm font-medium text-foreground";

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className={label}>Direccion</legend>
      <div className="grid grid-cols-[5.5rem_1fr] gap-2">
        <select
          aria-label="Tipo de via"
          value={streetType}
          onChange={(e) => setStreetType(e.target.value)}
          className={CONTROL}
        >
          {STREET_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1.5">
          <input
            aria-label="Numero de via"
            value={road}
            onChange={(e) => setRoad(e.target.value)}
            className={CONTROL}
            placeholder="97A"
            maxLength={8}
          />
          <span className="text-muted-foreground">#</span>
          <input
            aria-label="Numero de cruce"
            value={cross}
            onChange={(e) => setCross(e.target.value)}
            className={CONTROL}
            placeholder="76"
            maxLength={8}
          />
          <span className="text-muted-foreground">-</span>
          <input
            aria-label="Numero de placa"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            className={CONTROL}
            placeholder="5"
            maxLength={8}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Ej: Cl 97A # 76-5</p>
      <div className="grid grid-cols-2 gap-2">
        <select
          aria-label="Departamento"
          value={departmentCode}
          onChange={(e) => {
            setDepartmentCode(e.target.value);
            setCity("");
          }}
          className={CONTROL}
        >
          <option value="">Departamento</option>
          {COLOMBIA_DEPARTMENTS.map((d) => (
            <option key={d.code} value={d.code}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Ciudad"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          disabled={!departmentCode}
          className={CONTROL}
        >
          <option value="">Ciudad</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
    </fieldset>
  );
}
