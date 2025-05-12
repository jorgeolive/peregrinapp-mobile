import { MapStyle } from '../types/map';

export const mapStyle: MapStyle = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    'ign-base': {
      type: 'raster',
      tiles: [
        'https://www.ign.es/wmts/ign-base?' +
        'SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0' +
        '&LAYER=IGNBaseTodo-nofondo' +
        '&STYLE=default' +
        '&TILEMATRIXSET=EPSG:3857' +
        '&TILEMATRIX={z}' +
        '&TILEROW={y}' +
        '&TILECOL={x}' +
        '&FORMAT=image/png'
      ],
      attribution: '© Instituto Geográfico Nacional de España'
    },
    'camino-norte': {
      type: 'vector',
      tiles: ['http://10.0.2.2:8080/geoserver/peregrinapp/gwc/service/wmts?REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&LAYER=peregrinapp:camino_norte&STYLE=&TILEMATRIX=EPSG:900913:{z}&TILEMATRIXSET=EPSG:900913&FORMAT=application/vnd.mapbox-vector-tile&TILECOL={x}&TILEROW={y}'],
      tms: true
    },
    'albergues': {
      type: 'vector',
      tiles: ['http://10.0.2.2:8080/geoserver/peregrinapp/gwc/service/wmts?REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&LAYER=peregrinapp:camino_norte_albergues&STYLE=&TILEMATRIX=EPSG:900913:{z}&TILEMATRIXSET=EPSG:900913&FORMAT=application/vnd.mapbox-vector-tile&TILECOL={x}&TILEROW={y}'],
      tms: true
    }
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#E0F7FA'
      }
    },
    {
      id: 'ign-base-layer',
      type: 'raster',
      source: 'ign-base',
      minzoom: 0,
      maxzoom: 19
    },
    {
      id: 'camino-norte-line',
      type: 'line',
      source: 'camino-norte',
      'source-layer': 'camino_norte',
      minzoom: 8,
      paint: {
        'line-color': [
          'match',
          ['get', 'id_etapa'],
          '13a', '#e6194b',
          '11c', '#3cb44b',
          '08a', '#ffe119',
          '26b', '#4363d8',
          '11a', '#f58231',
          '01d', '#911eb4',
          '27a', '#46f0f0',
          '17a', '#f032e6',
          '18b', '#bcf60c',
          '01b', '#fabebe',
          '31a', '#008080',
          '04b', '#e6beff',
          '05a', '#9a6324',
          '12a', '#fffac8',
          '01c', '#800000',
          '14a', '#aaffc3',
          '24a', '#808000',
          '09a', '#ffd8b1',
          '22a', '#000075',
          '21a', '#808080',
          '03b', '#ffffff',
          '07a', '#000000',
          '10a', '#a9a9a9',
          '12b', '#b0e0e6',
          '18a', '#ffb347',
          '12c', '#c0c0c0',
          '31b', '#bada55',
          '23b', '#ff69b4',
          '11d', '#cd5c5c',
          '28a', '#40e0d0',
          '02a', '#ff6347',
          '03a', '#4682b4',
          '29a', '#daa520',
          '23a', '#7fffd4',
          '26a', '#dc143c',
          '04a', '#00ced1',
          '30a', '#ff00ff',
          '06a', '#1e90ff',
          '16a', '#deb887',
          '19a', '#00fa9a',
          '21b', '#b22222',
          '01e', '#adff2f',
          '20a', '#f0e68c',
          '11b', '#dda0dd',
          '15a', '#f5deb3',
          '14b', '#b0c4de',
          '25a', '#ffdead',
          '#888888'
        ],
        'line-width': 4,
        'line-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          5, 0,
          6, 1
        ]
      }
    },
    {
      id: 'camino-norte-labels',
      type: 'symbol',
      source: 'camino-norte',
      'source-layer': 'camino_norte',
      minzoom: 10,
      layout: {
        'text-field': ['get', 'etapa'],
        'symbol-placement': 'line',
        'text-size': 16,
        'text-font': ['Noto Sans Regular']
      },
      paint: {
        'text-color': '#1E88E5',
        'text-halo-color': '#fff',
        'text-halo-width': 2
      }
    },
    {
      id: 'albergues-points',
      type: 'circle',
      source: 'albergues',
      'source-layer': 'camino_norte_albergues',
      minzoom: 8,
      paint: {
        'circle-radius': 6,
        'circle-color': '#4CAF50',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          5, 0,
          6, 1
        ],
        'circle-stroke-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          5, 0,
          6, 1
        ]
      }
    },
    {
      id: 'albergues-labels',
      type: 'symbol',
      source: 'albergues',
      'source-layer': 'camino_norte_albergues',
      minzoom: 10,
      layout: {
        'text-field': ['get', 'name'],
        'text-anchor': 'left',
        'text-offset': [0.7, 0],
        'text-size': 14,
        'text-font': ['Noto Sans Regular']
      },
      paint: {
        'text-color': '#1B5E20',
        'text-halo-color': '#fff',
        'text-halo-width': 2,
        'text-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          5, 0,
          6, 1
        ]
      }
    }
  ],
  center: [-8.5463, 42.8805],
  zoom: 9,
  minzoom: 5,
  maxzoom: 18,
  maxBounds: [
    [-9.4, 36.0],
    [4.4, 43.8]
  ]
}; 