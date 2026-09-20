export interface SampleDxfItem {
  id: string;
  name: string;
  category: string;
  description: string;
  content: string;
}

export const SAMPLE_DXF_FILES: SampleDxfItem[] = [
  {
    id: 'fazenda_gleba',
    name: 'Gleba Rural / Fazenda (Polígono)',
    category: 'Topografia Rural',
    description: 'Polígono com 6 marcos perimétricos (P1 a P6), ideal para demarcação de talhão rural.',
    content: `0
SECTION
2
ENTITIES
0
LWPOLYLINE
8
PERIMETRO_FAZENDA
70
1
90
6
10
-47.8820
20
-15.7940
10
-47.8760
20
-15.7925
10
-47.8710
20
-15.7980
10
-47.8745
20
-15.8050
10
-47.8810
20
-15.8035
10
-47.8850
20
-15.7990
0
LINE
8
DIVISAO_INTERNA
10
-47.8760
20
-15.7925
11
-47.8810
21
-15.8035
0
ENDSEC
0
EOF`
  },
  {
    id: 'lote_urbano',
    name: 'Lote Urbano / Quadra Residencial',
    category: 'Urbanismo',
    description: 'Demarcação de lote urbano com dimensões 20m x 45m com recuo frontal.',
    content: `0
SECTION
2
ENTITIES
0
LWPOLYLINE
8
LIMITE_LOTE
70
1
90
4
10
0.0
20
0.0
10
45.0
20
0.0
10
45.0
20
20.0
10
0.0
20
20.0
0
LWPOLYLINE
8
EDIFICACAO
70
1
90
4
10
5.0
20
2.5
10
35.0
20
2.5
10
35.0
20
17.5
10
5.0
20
17.5
0
ENDSEC
0
EOF`
  },
  {
    id: 'pivo_agricola',
    name: 'Pivô Central de Irrigação & Talhões',
    category: 'Agronomia / GPS',
    description: 'Polígono circular de pivô de irrigação e estradas de acesso.',
    content: `0
SECTION
2
ENTITIES
0
CIRCLE
8
PIVO_IRRIGACAO
10
100.0
20
100.0
40
80.0
0
LWPOLYLINE
8
CONTORNO_TALHAO
70
1
90
5
10
0.0
20
0.0
10
200.0
20
0.0
10
200.0
20
200.0
10
0.0
20
200.0
10
0.0
20
0.0
0
LINE
8
ESTRADA_ACESSO
10
0.0
20
100.0
11
200.0
21
100.0
0
ENDSEC
0
EOF`
  }
];
