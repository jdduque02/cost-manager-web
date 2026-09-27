/**
 * Departamentos de Colombia (codigos DIVIPOLA del DANE) con capital y municipios principales.
 * Lista local y curada (sin API externa): no incluye los ~1.100 municipios.
 */
export interface Department {
  code: string;
  name: string;
  cities: string[];
}

export const COLOMBIA_DEPARTMENTS: Department[] = [
  {
    code: "91",
    name: "Amazonas",
    cities: ["Leticia", "Puerto Nariño"],
  },
  {
    code: "05",
    name: "Antioquia",
    cities: [
      "Medellín",
      "Bello",
      "Itagüí",
      "Envigado",
      "Sabaneta",
      "Rionegro",
      "Apartadó",
      "Turbo",
      "Caldas",
      "La Estrella",
      "Copacabana",
      "Girardota",
      "Marinilla",
      "Santa Fe de Antioquia",
      "Caucasia",
    ],
  },
  { code: "81", name: "Arauca", cities: ["Arauca", "Arauquita", "Saravena", "Tame"] },
  {
    code: "08",
    name: "Atlántico",
    cities: ["Barranquilla", "Soledad", "Malambo", "Sabanalarga", "Puerto Colombia", "Baranoa"],
  },
  {
    code: "11",
    name: "Bogotá D.C.",
    cities: ["Bogotá"],
  },
  {
    code: "13",
    name: "Bolívar",
    cities: ["Cartagena", "Magangué", "Turbaco", "Arjona", "El Carmen de Bolívar", "Mompós"],
  },
  {
    code: "15",
    name: "Boyacá",
    cities: ["Tunja", "Duitama", "Sogamoso", "Chiquinquirá", "Paipa", "Villa de Leyva"],
  },
  {
    code: "17",
    name: "Caldas",
    cities: ["Manizales", "La Dorada", "Chinchiná", "Villamaría", "Riosucio"],
  },
  { code: "18", name: "Caquetá", cities: ["Florencia", "San Vicente del Caguán", "Puerto Rico"] },
  { code: "85", name: "Casanare", cities: ["Yopal", "Aguazul", "Villanueva", "Paz de Ariporo"] },
  {
    code: "19",
    name: "Cauca",
    cities: ["Popayán", "Santander de Quilichao", "Puerto Tejada", "Patía"],
  },
  {
    code: "20",
    name: "Cesar",
    cities: ["Valledupar", "Aguachica", "Codazzi", "Bosconia", "Chimichagua"],
  },
  { code: "27", name: "Chocó", cities: ["Quibdó", "Istmina", "Tadó", "Bahía Solano"] },
  {
    code: "23",
    name: "Córdoba",
    cities: ["Montería", "Cereté", "Lorica", "Sahagún", "Montelíbano", "Planeta Rica"],
  },
  {
    code: "25",
    name: "Cundinamarca",
    cities: [
      "Soacha",
      "Fusagasugá",
      "Chía",
      "Zipaquirá",
      "Facatativá",
      "Girardot",
      "Mosquera",
      "Madrid",
      "Cajicá",
      "Funza",
      "Sopó",
    ],
  },
  { code: "94", name: "Guainía", cities: ["Inírida"] },
  { code: "95", name: "Guaviare", cities: ["San José del Guaviare", "Calamar"] },
  {
    code: "41",
    name: "Huila",
    cities: ["Neiva", "Pitalito", "Garzón", "La Plata"],
  },
  { code: "44", name: "La Guajira", cities: ["Riohacha", "Maicao", "Uribia", "Fonseca"] },
  {
    code: "47",
    name: "Magdalena",
    cities: ["Santa Marta", "Ciénaga", "Fundación", "El Banco", "Zona Bananera"],
  },
  {
    code: "50",
    name: "Meta",
    cities: ["Villavicencio", "Acacías", "Granada", "Puerto López", "Restrepo"],
  },
  {
    code: "52",
    name: "Nariño",
    cities: ["Pasto", "Tumaco", "Ipiales", "Túquerres"],
  },
  {
    code: "54",
    name: "Norte de Santander",
    cities: ["Cúcuta", "Ocaña", "Pamplona", "Villa del Rosario", "Los Patios"],
  },
  { code: "86", name: "Putumayo", cities: ["Mocoa", "Puerto Asís", "Orito", "Valle del Guamuez"] },
  {
    code: "63",
    name: "Quindío",
    cities: ["Armenia", "Calarcá", "Montenegro", "La Tebaida", "Quimbaya", "Salento"],
  },
  {
    code: "66",
    name: "Risaralda",
    cities: ["Pereira", "Dosquebradas", "La Virginia", "Santa Rosa de Cabal"],
  },
  {
    code: "88",
    name: "San Andrés y Providencia",
    cities: ["San Andrés", "Providencia"],
  },
  {
    code: "68",
    name: "Santander",
    cities: [
      "Bucaramanga",
      "Floridablanca",
      "Girón",
      "Piedecuesta",
      "Barrancabermeja",
      "San Gil",
      "Socorro",
    ],
  },
  { code: "70", name: "Sucre", cities: ["Sincelejo", "Corozal", "Sampués", "San Marcos"] },
  {
    code: "73",
    name: "Tolima",
    cities: ["Ibagué", "Espinal", "Melgar", "Honda", "Chaparral", "Líbano"],
  },
  {
    code: "76",
    name: "Valle del Cauca",
    cities: [
      "Cali",
      "Palmira",
      "Buenaventura",
      "Tuluá",
      "Buga",
      "Cartago",
      "Jamundí",
      "Yumbo",
      "Candelaria",
    ],
  },
  { code: "97", name: "Vaupés", cities: ["Mitú"] },
  { code: "99", name: "Vichada", cities: ["Puerto Carreño", "La Primavera"] },
];

export function getCitiesByDepartment(departmentCode: string): string[] {
  return COLOMBIA_DEPARTMENTS.find((d) => d.code === departmentCode)?.cities ?? [];
}
