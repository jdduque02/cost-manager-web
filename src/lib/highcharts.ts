import Highcharts from "highcharts";

// El módulo de accesibilidad viene incluido por defecto y emite un warning en
// consola en cada gráfica. La app no depende de él; se desactiva de forma
// global para quitar el ruido y evitar el overhead de crear árboles ARIA.
Highcharts.setOptions({ accessibility: { enabled: false } });

export default Highcharts;
