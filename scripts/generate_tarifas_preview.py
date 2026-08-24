import sys, os, re, json

# Read prices from tarifas-data.ts
with open('/home/z/my-project/src/lib/tarifas-data.ts', 'r') as f:
    ts_content = f.read()

def parse_price_map(section_text):
    prices = {}
    for m in re.finditer(r"'([^']+)':\s*\{\s*normal:\s*([0-9.]+),\s*media:\s*([0-9.]+)\s*\}", section_text):
        parada, normal, media = m.group(1), float(m.group(2)), float(m.group(3))
        prices[parada] = [normal, media]
    return prices

ida_match = re.search(r'const preciosIda.*?=(\s*\{.*?\n\});', ts_content, re.DOTALL)
precios_ida = parse_price_map(ida_match.group(1)) if ida_match else {}

vuelta_match = re.search(r'const preciosVuelta.*?=(\s*\{.*?\n\});', ts_content, re.DOTALL)
precios_vuelta = parse_price_map(vuelta_match.group(1)) if vuelta_match else {}

vuelta_maps = {}
for name in ['preciosVueltaElTambo', 'preciosVueltaYangana', 'preciosVueltaVilcabamba', 'preciosVueltaLaElvira']:
    m = re.search(rf'const {name}.*?=(\s*\{{.*?\n\}});', ts_content, re.DOTALL)
    if m:
        vuelta_maps[name] = parse_price_map(m.group(1))

# Parse PARADA_ZONA
zona_match = re.search(r'const PARADA_ZONA.*?=(\s*\{.*?\n\});', ts_content, re.DOTALL)
parada_zona = {}
if zona_match:
    for m in re.finditer(r"'([^']+)':\s*'([^']+)'", zona_match.group(1)):
        parada_zona[m.group(1)] = m.group(2)

# Routes - keys MUST match exactly what's in tarifas-data.ts (with accents and →)
RUTAS = {
    'Loja - Vilcabamba': {
        'ida': [
            'Capul\u00ed', 'Dos Puentes', 'Caj\u00e1numa', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
            'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Pe\u00f1a', 'Malacatos',
            'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba',
            'Pe\u00f1a\u2192Mal', 'Land\u2192Mal', 'Chorri\u2192Mal', 'Nango\u2192Mal', 'Porv\u2192Mal', 'Gran\u2192Mal', 'Yamba\u2192Mal',
            'Rumi\u2192Mal', 'T.Leguas\u2192Mal', 'P.Nuevo\u2192Mal', 'Caja\u2192Mal', 'D.Puen\u2192Mal', 'Capul\u00ed\u2192Mal',
            'S.Pedro\u2192Vilc', 'Carar\u2192Vilc', 'Cavian\u2192Vilc', 'Taxich\u2192Vilc', 'Mal\u2192Vilc', 'Land\u2192Vilc', 'Pe\u00f1a\u2192Vilc',
            'Chorri\u2192Vilc', 'Nango\u2192Vilc', 'Porv\u2192Vilc', 'Gran\u2192Vilc', 'Yamba\u2192Vilc', 'Rumi\u2192Vilc', 'T.Leguas\u2192Vilc',
            'P.Nuevo\u2192Vilc', 'Caja\u2192Vilc', 'D.Puen\u2192Vilc', 'Capul\u00ed\u2192Vilc',
        ],
        'vuelta': [
            'San Pedro', 'Cararango', 'Cavianga', 'Taxiche', 'Malacatos', 'La Pe\u00f1a', 'Landangui',
            'Chorrillos', 'Nangora', 'Porvenir', 'Granadillo', 'Yamba', 'Rumizhitana', 'Tres Leguas',
            'Pueblo Nuevo', 'Caj\u00e1numa', 'Dos Puentes', 'Capul\u00ed', 'Loja',
            'Mal\u2192Pe\u00f1a', 'Mal\u2192Land', 'Mal\u2192Chorri', 'Mal\u2192Nango', 'Mal\u2192Porv',
            'Mal\u2192Gran', 'Mal\u2192Yamba', 'Mal\u2192Rumi', 'Mal\u2192T.Leguas', 'Mal\u2192P.Nuevo',
            'Mal\u2192Caja', 'Mal\u2192D.Puen', 'Mal\u2192Capul\u00ed',
            'D.Puen\u2192Loja', 'Caja\u2192Loja', 'P.Nuevo\u2192Loja', 'T.Leguas\u2192Loja',
            'Rumi\u2192Loja', 'Yamba\u2192Loja', 'Gran\u2192Loja', 'Porv\u2192Loja',
            'Nango\u2192Loja', 'Chorri\u2192Loja', 'Land\u2192Loja', 'Pe\u00f1a\u2192Loja',
            'Mal\u2192Loja', 'Taxich\u2192Loja', 'Cavian\u2192Loja', 'Carar\u2192Loja', 'S.Pedro\u2192Loja',
        ],
    },
    'Loja - Zahuayco': {
        'ida': [
            'Capul\u00ed', 'Dos Puentes', 'Caj\u00e1numa', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
            'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Pe\u00f1a', 'Malacatos',
            'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba', 'Masanamaca', 'Quinara',
            'Chumberos', 'Palmira', 'Zahuayco',
            'Vilc\u2192Masan', 'Vilc\u2192Quina', 'Vilc\u2192Chumb', 'Vilc\u2192Palm', 'Vilc\u2192Zahua',
            'Mal\u2192Masan', 'Mal\u2192Quina', 'Mal\u2192Chumb', 'Mal\u2192Palm', 'Mal\u2192Zahua',
        ],
        'vuelta': [
            'Zahuayco', 'Palmira', 'Quinara', 'Masanamaca', 'Vilcabamba', 'San Pedro', 'Cararango',
            'Cavianga', 'Taxiche', 'Malacatos', 'La Pe\u00f1a', 'Landangui', 'Chorrillos', 'Nangora',
            'Porvenir', 'Granadillo', 'Yamba', 'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo',
            'Caj\u00e1numa', 'Dos Puentes', 'Capul\u00ed',
        ],
    },
    'Loja - El Tambo': {
        'ida': [
            'Capul\u00ed', 'Dos Puentes', 'Caj\u00e1numa', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
            'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Pe\u00f1a', 'Malacatos',
            'Ceibopamba', 'Trinidad', 'San Jos\u00e9', 'Santo Domingo', 'Naranjo Dulce', 'Zhotahuayco',
            'La Merced', 'San Agust\u00edn', 'La Era', 'La Capilla', 'San Bernaved', 'El Tambo',
            'Mal\u2192Ceibop', 'Mal\u2192Trinidad', 'Mal\u2192S.Jose', 'Mal\u2192StoDom', 'Mal\u2192N.Dulce', 'Mal\u2192Zhotahu',
            'Mal\u2192LaMerc', 'Mal\u2192S.Agust', 'Mal\u2192LaEra', 'Mal\u2192LaCap', 'Mal\u2192S.Bern', 'Mal\u2192ElTambo',
            'Caja\u2192ElTambo', 'P.Nuevo\u2192ElTambo', 'T.Leguas\u2192ElTambo',
            'Rumi\u2192ElTambo', 'Yamba\u2192ElTambo', 'Gran\u2192ElTambo', 'Porv\u2192ElTambo',
            'Nango\u2192ElTambo', 'Chorri\u2192ElTambo', 'Land\u2192ElTambo', 'Pe\u00f1a\u2192ElTambo',
        ],
        'vuelta': [
            'El Tambo', 'San Bernaved', 'La Capilla', 'La Era', 'San Agust\u00edn', 'La Merced', 'Zhotahuayco',
            'Naranjo Dulce', 'Santo Domingo', 'San Jos\u00e9', 'Ceibopamba', 'Trinidad', 'Malacatos',
            'La Pe\u00f1a', 'Landangui', 'Chorrillos', 'Nangora', 'Porvenir', 'Granadillo', 'Yamba',
            'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo', 'Caj\u00e1numa', 'Dos Puentes', 'Capul\u00ed',
    'Loja',
            'Mal\u2192Pe\u00f1a', 'Mal\u2192Land', 'Mal\u2192Chorri', 'Mal\u2192Nango', 'Mal\u2192Porv',
            'Mal\u2192Gran', 'Mal\u2192Yamba', 'Mal\u2192Rumi', 'Mal\u2192T.Leguas', 'Mal\u2192P.Nuevo',
            'Mal\u2192Caja', 'Mal\u2192D.Puen', 'Mal\u2192Capul\u00ed',
            'D.Puen\u2192Loja', 'Caja\u2192Loja', 'P.Nuevo\u2192Loja', 'T.Leguas\u2192Loja',
            'Rumi\u2192Loja', 'Yamba\u2192Loja', 'Gran\u2192Loja', 'Porv\u2192Loja',
            'Nango\u2192Loja', 'Chorri\u2192Loja', 'Land\u2192Loja', 'Pe\u00f1a\u2192Loja', 'Mal\u2192Loja',
        ],
    },
    'Loja - La Elvira': {
        'ida': [
            'Capul\u00ed', 'Dos Puentes', 'Caj\u00e1numa', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
            'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Pe\u00f1a', 'Malacatos',
            'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba', 'Cucanama', 'Linderos',
            'Santorum', 'Solanda', 'Moyococha', 'Tumianuma', 'Quinara', 'Comunidades', 'La Elvira',
            'Mal\u2192Cucan', 'Mal\u2192Lind', 'Mal\u2192Santo', 'Mal\u2192Solan', 'Mal\u2192Moyoc', 'Mal\u2192Tumia', 'Mal\u2192Quina',
            'Mal\u2192Comun', 'Mal\u2192Elvira',
            'Vilc\u2192Cucan', 'Vilc\u2192Lind', 'Vilc\u2192Santo', 'Vilc\u2192Solan',
            'Vilc\u2192Moyoc', 'Vilc\u2192Tumia', 'Vilc\u2192Quina', 'Vilc\u2192Comun', 'Vilc\u2192Elvira',
        ],
        'vuelta': [
            'La Elvira', 'Comunidades', 'Quinara', 'Tumianuma', 'Moyococha', 'Solanda', 'Santorum',
            'Linderos', 'Cucanama', 'Vilcabamba', 'San Pedro', 'Cararango', 'Cavianga', 'Taxiche',
            'Malacatos', 'La Pe\u00f1a', 'Landangui', 'Chorrillos', 'Nangora', 'Porvenir', 'Granadillo',
            'Yamba', 'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo', 'Caj\u00e1numa', 'Dos Puentes', 'Capul\u00ed',
            'Mal\u2192Pe\u00f1a', 'Mal\u2192Land', 'Mal\u2192Chorri', 'Mal\u2192Nango', 'Mal\u2192Porv',
            'Mal\u2192Gran', 'Mal\u2192Yamba', 'Mal\u2192Rumi', 'Mal\u2192T.Leguas', 'Mal\u2192P.Nuevo',
            'Mal\u2192Caja', 'Mal\u2192D.Puen', 'Mal\u2192Capul\u00ed',
            'D.Puen\u2192Loja', 'Caja\u2192Loja', 'P.Nuevo\u2192Loja', 'T.Leguas\u2192Loja',
            'Rumi\u2192Loja', 'Yamba\u2192Loja', 'Gran\u2192Loja', 'Porv\u2192Loja',
            'Nango\u2192Loja', 'Chorri\u2192Loja', 'Land\u2192Loja', 'Pe\u00f1a\u2192Loja',
            'Mal\u2192Loja', 'Taxich\u2192Loja', 'Cavian\u2192Loja', 'Carar\u2192Loja', 'S.Pedro\u2192Loja',
        ],
    },
    'Loja - Yangana': {
        'ida': [
            'Capul\u00ed', 'Dos Puentes', 'Caj\u00e1numa', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
            'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Pe\u00f1a', 'Malacatos',
            'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba', 'Masanamaca', 'Suro',
            'Yangana', 'Vilc\u2192Masan', 'Vilc\u2192Suro', 'Vilc\u2192Yangana', 'Mal\u2192Masan', 'Mal\u2192Suro', 'Mal\u2192Yangana',
        ],
        'vuelta': [
            'Yangana', 'Suro', 'Masanamaca', 'Vilcabamba', 'San Pedro', 'Cararango', 'Cavianga',
            'Taxiche', 'Malacatos', 'La Pe\u00f1a', 'Landangui', 'Chorrillos', 'Nangora', 'Porvenir',
            'Granadillo', 'Yamba', 'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo', 'Caj\u00e1numa',
            'Dos Puentes', 'Capul\u00ed',
        ],
    },
}

# Build the JSON data files separately
json_data = json.dumps(RUTAS, ensure_ascii=False)
json_ida = json.dumps(precios_ida, ensure_ascii=False)
json_vuelta = json.dumps(precios_vuelta, ensure_ascii=False)
json_vmaps = json.dumps(vuelta_maps, ensure_ascii=False)
json_zona = json.dumps(parada_zona, ensure_ascii=False)

html_template = r'''<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>RutaGo - Vista Previa de Tarifas</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6; display: flex; justify-content: center; padding: 16px; }

.phone-frame {
    width: 390px; min-height: 700px; background: #f9fafb; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3); display: flex; flex-direction: column;
}
.route-tabs { display: flex; overflow-x: auto; background: #1e3a5f; }
.route-tabs button { flex-shrink: 0; padding: 10px 14px; background: none; border: none; color: rgba(255,255,255,0.5); font-size: 11px; font-weight: 700; cursor: pointer; border-bottom: 3px solid transparent; white-space: nowrap; }
.route-tabs button.active { color: white; border-bottom-color: #16a34a; }

.dir-bar { display: flex; }
.dir-bar button { flex: 1; padding: 8px; border: none; font-size: 12px; font-weight: 700; cursor: pointer; color: white; transition: all 0.15s; }
.dir-bar button.ida { background: #912D26; }
.dir-bar button.ida.off { background: #d1d5db; color: #9ca3af; }
.dir-bar button.vuelta { background: #3A3A3A; }
.dir-bar button.vuelta.off { background: #d1d5db; color: #9ca3af; }

tipo-bar { display: flex; gap: 8px; padding: 8px 12px; background: white; border-bottom: 1px solid #f3f4f6; }
tipo-bar button { flex: 1; padding: 8px; border-radius: 12px; border: none; font-size: 13px; font-weight: 700; cursor: pointer; }
tipo-bar button.on { background: #912D26; color: white; box-shadow: 0 4px 12px rgba(145,45,38,0.3); }
tipo-bar button:not(.on) { background: #f3f4f6; color: #3A3A3A; }

tab-bar { display: flex; background: white; border-bottom: 1px solid #e5e7eb; }
tab-bar button { flex: 1; padding: 8px; border: none; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; cursor: pointer; border-bottom: 2px solid transparent; color: #9ca3af; background: none; }
tab-bar button.on { border-bottom-color: #912D26; color: #912D26; }

.grid-area { flex: 1; padding: 8px; overflow-y: auto; max-height: 480px; }
.grid-area::-webkit-scrollbar { width: 3px; }
.grid-area::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }

.zone-label { display: flex; align-items: center; gap: 4px; margin: 8px 0 4px; }
.zone-label:first-child { margin-top: 0; }
.zone-dot { width: 6px; height: 6px; border-radius: 50%; }
.zone-label span { font-size: 9px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.04em; }

.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; }
.btn { border-radius: 12px; padding: 7px 8px; min-height: 50px; display: flex; flex-direction: column; justify-content: center; cursor: default; }
.btn .name { font-size: 10px; font-weight: 700; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.btn .price { font-size: 14px; font-weight: 900; margin-top: 1px; }
.btn.zero { opacity: 0.4; }

.stats-bar { background: white; border-top: 2px solid #f3f4f6; padding: 6px 12px; text-align: center; font-size: 11px; color: #6b7280; }
.legend { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; padding: 10px; background: white; border-top: 1px solid #e5e7eb; }
.legend-item { display: flex; align-items: center; gap: 3px; font-size: 9px; color: #6b7280; }
.legend-dot { width: 7px; height: 7px; border-radius: 50%; }
h1 { text-align: center; padding: 16px; color: #1e3a5f; font-size: 16px; width: 390px; }
</style>
</head>
<body>
<h1>RutaGo - Tarifas en la App</h1>
<div class="phone-frame" id="app">
  <div class="route-tabs" id="routeTabs"></div>
  <div class="dir-bar" id="dirBar"></div>
  <div class="tipo-bar" id="tipoBar"></div>
  <div class="tab-bar" id="tabBar"></div>
  <div class="grid-area" id="gridArea"></div>
  <div class="stats-bar" id="statsBar"></div>
  <div class="legend">
    <div class="legend-item"><div class="legend-dot" style="background:#22c55e"></div>Cerca de Loja</div>
    <div class="legend-item"><div class="legend-dot" style="background:#f59e0b"></div>Zona media</div>
    <div class="legend-item"><div class="legend-dot" style="background:#3b82f6"></div>Cerca de dest.</div>
    <div class="legend-item"><div class="legend-dot" style="background:#f97316"></div>Intermed. Mal.</div>
    <div class="legend-item"><div class="legend-dot" style="background:#a855f7"></div>Intermed. Vilc.</div>
  </div>
</div>
<script>
// __JSON_DATA_PLACEHOLDER__
// __JSON_IDA_PLACEHOLDER__
// __JSON_VUELTA_PLACEHOLDER__
// __JSON_VMAPS_PLACEHOLDER__
// __JSON_ZONA_PLACEHOLDER__

const ARROW = '\u2192';
const ZC = {
  green:  {bg:'#f0fdf4',text:'#14532d',border:'#bbf7d0',price:'#15803d'},
  yellow: {bg:'#fffbeb',text:'#78350f',border:'#fde68a',price:'#b45309'},
  blue:   {bg:'#eff6ff',text:'#1e3a8a',border:'#bfdbfe',price:'#1d4ed8'},
  orange: {bg:'#fff7ed',text:'#7c2d12',border:'#fed7aa',price:'#c2410c'},
  purple: {bg:'#faf5ff',text:'#581c87',border:'#e9d5ff',price:'#7e22ce'},
};
const ZDots = {green:'#22c55e',yellow:'#f59e0b',blue:'#3b82f6',orange:'#f97316',purple:'#a855f7'};
const ZNames = {green:'Cerca de Loja',yellow:'Zona media',blue:'Cerca de destino',orange:'Intermedios Malacatos',purple:'Intermedios Vilcabamba',loja:'Hacia Loja'};
const ZOrder = ['green','yellow','blue','orange','purple','loja'];

let cR=Object.keys(DATA)[0], cD='ida', cT='normal', cTab='principal';

function gz(p){
  if(PARADA_ZONA[p])return PARADA_ZONA[p];
  if(p.includes(ARROW+'Mal')||p.startsWith('Mal'+ARROW))return 'orange';
  if(p.includes(ARROW+'Vilc')||p.startsWith('Vilc'+ARROW))return 'purple';
  if(p.includes(ARROW+'Loja'))return 'loja';
  return 'yellow';
}
function isPr(p){return !p.includes(ARROW); }
function gp(p,d,r){
  if(d==='ida')return PRECIOS_IDA[p]||[0,0];
  var rm={'Loja - Vilcabamba':'preciosVueltaVilcabamba','Loja - El Tambo':'preciosVueltaElTambo','Loja - Yangana':'preciosVueltaYangana','Loja - La Elvira':'preciosVueltaLaElvira'};
  if(r&&rm[r]&&VUELTA_MAPS[rm[r]]&&VUELTA_MAPS[rm[r]][p]){var v=VUELTA_MAPS[rm[r]][p];if(v[0]>0||v[1]>0)return v;}
  if(PRECIOS_VUELTA[p])return PRECIOS_VUELTA[p];
  for(const k of Object.keys(VUELTA_MAPS)){var v2=VUELTA_MAPS[k][p];if(v2&&(v2[0]>0||v2[1]>0))return v2;}
  return [0,0];
}

function esc(s){return s.replace(/'/g, "&#39;").replace(/</g, '&lt;');}

function render(){
  document.getElementById('routeTabs').innerHTML=Object.keys(DATA).map(r=>
    '<button class="'+(r===cR?'active':'')+'" onclick="cR=\''+r+'\';render()">'+r.split(' - ')[1]+'</button>'
  ).join('');

  document.getElementById('dirBar').innerHTML=
    '<button class="ida'+(cD!=='ida'?' off':'')+'" onclick="cD=\'ida\';render()">IDA</button>'+
    '<button class="vuelta'+(cD!=='vuelta'?' off':'')+'" onclick="cD=\'vuelta\';render()">VUELTA</button>';

  document.getElementById('tipoBar').innerHTML=
    '<button class="'+(cT==='normal'?'on':'')+'" onclick="cT=\'normal\';render()">ENTERO</button>'+
    '<button class="'+(cT==='media'?'on':'')+'" onclick="cT=\'media\';render()">MEDIA</button>';

  const ps=DATA[cR][cD];
  const nPr=ps.filter(isPr).length, nIn=ps.filter(p=>!isPr(p)).length;
  document.getElementById('tabBar').innerHTML=
    '<button class="'+(cTab==='principal'?'on':'')+'" onclick="cTab=\'principal\';render()">Paradas ('+nPr+')</button>'+
    '<button class="'+(cTab==='intermedia'?'on':'')+'" onclick="cTab=\'intermedia\';render()">Intermedios ('+nIn+')</button>';

  const showPr=cTab==='principal';
  const filtered=ps.filter(p=>showPr?isPr(p):!isPr(p));
  const groups={};
  filtered.forEach(p=>{const z=gz(p);if(!groups[z])groups[z]=[];groups[z].push(p);});

  let html='';
  ZOrder.forEach(z=>{
    if(!groups[z])return;
    const c=ZC[z]||ZC.yellow;
    html+='<div class="zone-label"><div class="zone-dot" style="background:'+ZDots[z]+'"></div><span>'+ZNames[z]+' ('+groups[z].length+')</span></div>';
    html+='<div class="grid">';
    groups[z].forEach(p=>{
      const[n,m]=gp(p,cD,cR);
      const pr=cT==='media'?m:n;
      const has=n>0||m>0;
      const pc=has?c.price:'#cbd5e1';
      const zc=has?c.bg:'#f9fafb';
      html+='<div class="btn'+(has?'':' zero')+'" style="background:'+zc+';border:1px solid '+(has?c.border:'#e5e7eb')+'"><div class="name" style="color:'+(has?c.text:'#9ca3af')+'">'+esc(p)+'</div><div class="price" style="color:'+pc+'">$'+pr.toFixed(2)+'</div></div>';
    });
    html+='</div>';
  });
  document.getElementById('gridArea').innerHTML=html;

  let loaded=0;
  ps.forEach(p=>{const[n,m]=gp(p,cD,cR);if(n>0||m>0)loaded++;});
  document.getElementById('statsBar').innerHTML='<b>'+cR+'</b> | '+cD.toUpperCase()+' | '+loaded+'/'+ps.length+' precios cargados';
}
render();
</script>
</body>
</html>'''

# Replace placeholders with actual JSON
html = html_template.replace('// __JSON_DATA_PLACEHOLDER__', 'const DATA = ' + json_data + ';')
html = html_template.replace('// __JSON_IDA_PLACEHOLDER__', 'const PRECIOS_IDA = ' + json_ida + ';')
html = html_template.replace('// __JSON_VUELTA_PLACEHOLDER__', 'const PRECIOS_VUELTA = ' + json_vuelta + ';')
html = html_template.replace('// __JSON_VMAPS_PLACEHOLDER__', 'const VUELTA_MAPS = ' + json_vmaps + ';')
html = html_template.replace('// __JSON_ZONA_PLACEHOLDER__', 'const PARADA_ZONA = ' + json_zona + ';')

output = '/home/z/my-project/download/RutaGo_Tarifas_Preview.html'
with open(output, 'w') as f:
    f.write(html)

print(f'HTML generado: {output}')
print(f'Tamano: {len(html)} bytes')

# Verify key match
miss_ida = 0
miss_vuelta = 0
for ruta, dirs in RUTAS.items():
    for p in dirs['ida']:
        if p not in precios_ida: miss_ida += 1
    for p in dirs['vuelta']:
        if p not in precios_vuelta:
            found = False
            for vm in vuelta_maps.values():
                if p in vm: found = True; break
            if not found: miss_vuelta += 1
print(f'IDA keys sin precio: {miss_ida}')
print(f'VUELTA keys sin precio: {miss_vuelta}')
