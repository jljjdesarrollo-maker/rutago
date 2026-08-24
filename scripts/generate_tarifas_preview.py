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

# Routes (without duplicates)
RUTAS = {
    'Loja - Vilcabamba': {
        'ida': [
            'Capuli', 'Dos Puentes', 'Cajanuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
            'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Pena', 'Malacatos',
            'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba',
            'Pena-Mal', 'Land-Mal', 'Chorri-Mal', 'Nango-Mal', 'Porv-Mal', 'Gran-Mal', 'Yamba-Mal',
            'Rumi-Mal', 'T.Leguas-Mal', 'P.Nuevo-Mal', 'Caja-Mal', 'D.Puen-Mal', 'Capuli-Mal',
            'S.Pedro-Vilc', 'Carar-Vilc', 'Cavian-Vilc', 'Taxich-Vilc', 'Mal-Vilc', 'Land-Vilc', 'Pena-Vilc',
            'Chorri-Vilc', 'Nango-Vilc', 'Porv-Vilc', 'Gran-Vilc', 'Yamba-Vilc', 'Rumi-Vilc', 'T.Leguas-Vilc',
            'P.Nuevo-Vilc', 'Caja-Vilc', 'D.Puen-Vilc', 'Capuli-Vilc',
        ],
        'vuelta': [
            'Vilcabamba', 'San Pedro', 'Cararango', 'Cavianga', 'Taxiche', 'Malacatos', 'La Pena', 'Landangui',
            'Chorrillos', 'Nangora', 'Porvenir', 'Granadillo', 'Yamba', 'Rumizhitana', 'Tres Leguas',
            'Pueblo Nuevo', 'Cajanuma', 'Dos Puentes', 'Capuli',
            'Mal-LaPena', 'Mal-Land', 'Mal-Chorri', 'Mal-Nango', 'Mal-Porv',
            'Mal-Gran', 'Mal-Yamba', 'Mal-Rumi', 'Mal-T.Leguas', 'Mal-P.Nuevo',
            'Mal-Caja', 'Mal-D.Puen', 'Mal-Capuli',
            'D.Puen-Loja', 'Caja-Loja', 'P.Nuevo-Loja', 'T.Leguas-Loja',
            'Rumi-Loja', 'Yamba-Loja', 'Gran-Loja', 'Porv-Loja',
            'Nango-Loja', 'Chorri-Loja', 'Land-Loja', 'Pena-Loja',
            'Mal-Loja', 'Taxich-Loja', 'Cavian-Loja', 'Carar-Loja', 'S.Pedro-Loja',
        ],
    },
    'Loja - Zahuayco': {
        'ida': [
            'Capuli', 'Dos Puentes', 'Cajanuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
            'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Pena', 'Malacatos',
            'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba', 'Masanamaca', 'Quinara',
            'Chumberos', 'Palmira', 'Zahuayco',
            'Vilc-Masan', 'Vilc-Quina', 'Vilc-Chumb', 'Vilc-Palm', 'Vilc-Zahua',
            'Mal-Masan', 'Mal-Quina', 'Mal-Chumb', 'Mal-Palm', 'Mal-Zahua',
        ],
        'vuelta': [
            'Zahuayco', 'Palmira', 'Quinara', 'Masanamaca', 'Vilcabamba', 'San Pedro', 'Cararango',
            'Cavianga', 'Taxiche', 'Malacatos', 'La Pena', 'Landangui', 'Chorrillos', 'Nangora',
            'Porvenir', 'Granadillo', 'Yamba', 'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo',
            'Cajanuma', 'Dos Puentes', 'Capuli',
        ],
    },
    'Loja - El Tambo': {
        'ida': [
            'Capuli', 'Dos Puentes', 'Cajanuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
            'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Pena', 'Malacatos',
            'Ceibopamba', 'Trinidad', 'San Jose', 'Santo Domingo', 'Naranjo Dulce', 'Zhotahuayco',
            'La Merced', 'San Agustin', 'La Era', 'La Capilla', 'San Bernaved', 'El Tambo',
            'Mal-Ceibop', 'Mal-Trinidad', 'Mal-S.Jose', 'Mal-StoDom', 'Mal-N.Dulce', 'Mal-Zhotahu',
            'Mal-LaMerc', 'Mal-S.Agust', 'Mal-LaEra', 'Mal-LaCap', 'Mal-S.Bern', 'Mal-ElTambo',
        ],
        'vuelta': [
            'El Tambo', 'San Bernaved', 'La Capilla', 'La Era', 'San Agustin', 'La Merced', 'Zhotahuayco',
            'Naranjo Dulce', 'Santo Domingo', 'San Jose', 'Ceibopamba', 'Trinidad', 'Malacatos',
            'La Pena', 'Landangui', 'Chorrillos', 'Nangora', 'Porvenir', 'Granadillo', 'Yamba',
            'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo', 'Cajanuma', 'Dos Puentes', 'Capuli',
            'Mal-LaPena', 'Mal-Land', 'Mal-Chorri', 'Mal-Nango', 'Mal-Porv',
            'Mal-Gran', 'Mal-Yamba', 'Mal-Rumi', 'Mal-T.Leguas', 'Mal-P.Nuevo',
            'Mal-Caja', 'Mal-D.Puen', 'Mal-Capuli',
            'D.Puen-Loja', 'Caja-Loja', 'P.Nuevo-Loja', 'T.Leguas-Loja',
            'Rumi-Loja', 'Yamba-Loja', 'Gran-Loja', 'Porv-Loja',
            'Nango-Loja', 'Chorri-Loja', 'Land-Loja', 'Pena-Loja', 'Mal-Loja',
            'LaCap-Loja', 'S.Bern-Loja',
        ],
    },
    'Loja - La Elvira': {
        'ida': [
            'Capuli', 'Dos Puentes', 'Cajanuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
            'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Pena', 'Malacatos',
            'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba', 'Cucanama', 'Linderos',
            'Santorum', 'Solanda', 'Moyococha', 'Tumianuma', 'Quinara', 'Comunidades', 'La Elvira',
            'Mal-Cucan', 'Mal-Lind', 'Mal-Santo', 'Mal-Solan', 'Mal-Moyoc', 'Mal-Tumia', 'Mal-Quina',
            'Mal-Comun', 'Mal-Elvira',
            'Vilc-Cucan', 'Vilc-Lind', 'Vilc-Santo', 'Vilc-Solan', 'Vilc-Moyoc', 'Vilc-Tumia', 'Vilc-Quina',
            'Vilc-Comun', 'Vilc-Elvira',
        ],
        'vuelta': [
            'La Elvira', 'Comunidades', 'Quinara', 'Tumianuma', 'Moyococha', 'Solanda', 'Santorum',
            'Linderos', 'Cucanama', 'Vilcabamba', 'San Pedro', 'Cararango', 'Cavianga', 'Taxiche',
            'Malacatos', 'La Pena', 'Landangui', 'Chorrillos', 'Nangora', 'Porvenir', 'Granadillo',
            'Yamba', 'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo', 'Cajanuma', 'Dos Puentes', 'Capuli',
            'Mal-LaPena', 'Mal-Land', 'Mal-Chorri', 'Mal-Nango', 'Mal-Porv',
            'Mal-Gran', 'Mal-Yamba', 'Mal-Rumi', 'Mal-T.Leguas', 'Mal-P.Nuevo',
            'Mal-Caja', 'Mal-D.Puen', 'Mal-Capuli',
            'D.Puen-Loja', 'Caja-Loja', 'P.Nuevo-Loja', 'T.Leguas-Loja',
            'Rumi-Loja', 'Yamba-Loja', 'Gran-Loja', 'Porv-Loja',
            'Nango-Loja', 'Chorri-Loja', 'Land-Loja', 'Pena-Loja',
            'Mal-Loja', 'Taxich-Loja', 'Cavian-Loja', 'Carar-Loja', 'S.Pedro-Loja', 'Vilc-Loja',
            'Mal-Cucan', 'Mal-Lind', 'Mal-Santo', 'Mal-Solan', 'Mal-Moyoc', 'Mal-Tumia',
            'Mal-Quina', 'Mal-Comun', 'Mal-Elvira', 'Vilc-Cucan', 'Vilc-Lind', 'Vilc-Santo',
            'Vilc-Solan', 'Vilc-Moyoc', 'Vilc-Tumia', 'Vilc-Quina', 'Vilc-Comun', 'Vilc-Elvira',
        ],
    },
    'Loja - Yangana': {
        'ida': [
            'Capuli', 'Dos Puentes', 'Cajanuma', 'Pueblo Nuevo', 'Tres Leguas', 'Rumizhitana', 'Yamba',
            'Granadillo', 'Porvenir', 'Nangora', 'Chorrillos', 'Landangui', 'La Pena', 'Malacatos',
            'Taxiche', 'Cavianga', 'Cararango', 'San Pedro', 'Vilcabamba', 'Masanamaca', 'Suro',
            'Yangana', 'Vilc-Masan', 'Vilc-Suro', 'Vilc-Yangana', 'Mal-Masan', 'Mal-Suro', 'Mal-Yangana',
        ],
        'vuelta': [
            'Yangana', 'Suro', 'Masanamaca', 'Vilcabamba', 'San Pedro', 'Cararango', 'Cavianga',
            'Taxiche', 'Malacatos', 'La Pena', 'Landangui', 'Chorrillos', 'Nangora', 'Porvenir',
            'Granadillo', 'Yamba', 'Rumizhitana', 'Tres Leguas', 'Pueblo Nuevo', 'Cajanuma',
            'Dos Puentes', 'Capuli',
            'Vilc-S.Pedro', 'Vilc-Carar', 'Vilc-Cavian', 'Vilc-Taxich', 'Vilc-Malac',
            'Vilc-Land', 'Vilc-Chorri', 'Vilc-Nango', 'Vilc-Porv', 'Vilc-Gran',
            'Vilc-Yamba', 'Vilc-Rumi', 'Vilc-T.Leguas', 'Vilc-P.Nuevo', 'Vilc-Caja',
            'Vilc-D.Puen', 'Vilc-Capuli',
            'Mal-LaPena', 'Mal-Land', 'Mal-Chorri', 'Mal-Nango', 'Mal-Porv',
            'Mal-Gran', 'Mal-Yamba', 'Mal-Rumi', 'Mal-T.Leguas', 'Mal-P.Nuevo',
            'Mal-Caja', 'Mal-D.Puen', 'Mal-Capuli',
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
.btn { border-radius: 12px; padding: 7px 8px; min-height: 50px; display: flex; flex-direction: column; justify-content: center; }
.btn .name { font-size: 10px; font-weight: 700; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.btn .price { font-size: 14px; font-weight: 900; margin-top: 1px; }

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

const ZC = {
  green:  {bg:'#f0fdf4',text:'#14532d',border:'#bbf7d0',price:'#15803d'},
  yellow: {bg:'#fffbeb',text:'#78350f',border:'#fde68a',price:'#b45309'},
  blue:   {bg:'#eff6ff',text:'#1e3a8a',border:'#bfdbfe',price:'#1d4ed8'},
  orange: {bg:'#fff7ed',text:'#7c2d12',border:'#fed7aa',price:'#c2410c'},
  purple: {bg:'#faf5ff',text:'#581c87',border:'#e9d5ff',price:'#7e22ce'},
};
const ZDots = {green:'#22c55e',yellow:'#f59e0b',blue:'#3b82f6',orange:'#f97316',purple:'#a855f7'};
const ZNames = {green:'Cerca de Loja',yellow:'Zona media',blue:'Cerca de destino',orange:'Intermedios Malacatos',purple:'Intermedios Vilcabamba'};
const ZOrder = ['green','yellow','blue','orange','purple'];

let cR=Object.keys(DATA)[0], cD='ida', cT='normal', cTab='principal';

function gz(p){if(PARADA_ZONA[p])return PARADA_ZONA[p];if(p.includes('-Mal')||p.includes('Mal-'))return'orange';if(p.includes('-Vilc')||p.includes('Vilc-'))return'purple';if(p.includes('-Loja'))return'green';return'yellow';}
function isPr(p){return!p.includes('-');}
function gp(p,d){if(d==='ida')return PRECIOS_IDA[p]||[0,0];if(PRECIOS_VUELTA[p])return PRECIOS_VUELTA[p];for(const k of Object.keys(VUELTA_MAPS)){if(VUELTA_MAPS[k][p])return VUELTA_MAPS[k][p];}return[0,0];}

function render(){
  // Route tabs
  document.getElementById('routeTabs').innerHTML=Object.keys(DATA).map(r=>
    '<button class="'+(r===cR?'active':'')+'" onclick="cR=\''+r+'\';render()">'+r.split(' - ')[1]+'</button>'
  ).join('');

  // Direction bar
  document.getElementById('dirBar').innerHTML=
    '<button class="ida'+(cD!=='ida'?' off':'')+'" onclick="cD=\'ida\';render()">IDA (hacia destino)</button>'+
    '<button class="vuelta'+(cD!=='vuelta'?' off':'')+'" onclick="cD=\'vuelta\';render()">VUELTA (hacia Loja)</button>';

  // Tipo bar
  document.getElementById('tipoBar').innerHTML=
    '<button class="'+(cT==='normal'?'on':'')+'" onclick="cT=\'normal\';render()">ENTERO</button>'+
    '<button class="'+(cT==='media'?'on':'')+'" onclick="cT=\'media\';render()">MEDIA</button>';

  // Tab bar
  const ps=DATA[cR][cD];
  const nPr=ps.filter(isPr).length, nIn=ps.filter(p=>!isPr(p)).length;
  document.getElementById('tabBar').innerHTML=
    '<button class="'+(cTab==='principal'?'on':'')+'" onclick="cTab=\'principal\';render()">Paradas ('+nPr+')</button>'+
    '<button class="'+(cTab==='intermedia'?'on':'')+'" onclick="cTab=\'intermedia\';render()">Intermedios ('+nIn+')</button>';

  // Grid
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
      const[n,m]=gp(p,cD);
      const pr=cT==='media'?m:n;
      const has=n>0||m>0;
      const pc=has?c.price:'#cbd5e1';
      html+='<div class="btn" style="background:'+c.bg+';border:1px solid '+c.border+'"><div class="name" style="color:'+c.text+'">'+p+'</div><div class="price" style="color:'+pc+'">$'+pr.toFixed(2)+'</div></div>';
    });
    html+='</div>';
  });
  document.getElementById('gridArea').innerHTML=html;

  // Stats
  let loaded=0;
  ps.forEach(p=>{const[n,m]=gp(p,cD);if(n>0||m>0)loaded++;});
  document.getElementById('statsBar').innerHTML='<b>'+cR+'</b> · '+cD.toUpperCase()+' · '+loaded+'/'+ps.length+' precios cargados';
}
render();
</script>
</body>
</html>'''

# Replace placeholders with actual JSON
html = html_template.replace('// __JSON_DATA_PLACEHOLDER__', 'const DATA = ' + json_data + ';')
html = html.replace('// __JSON_IDA_PLACEHOLDER__', 'const PRECIOS_IDA = ' + json_ida + ';')
html = html.replace('// __JSON_VUELTA_PLACEHOLDER__', 'const PRECIOS_VUELTA = ' + json_vuelta + ';')
html = html.replace('// __JSON_VMAPS_PLACEHOLDER__', 'const VUELTA_MAPS = ' + json_vmaps + ';')
html = html.replace('// __JSON_ZONA_PLACEHOLDER__', 'const PARADA_ZONA = ' + json_zona + ';')

output = '/home/z/my-project/download/RutaGo_Tarifas_Preview.html'
with open(output, 'w') as f:
    f.write(html)

print(f'HTML generado: {output}')
print(f'Tamano: {len(html)} bytes')