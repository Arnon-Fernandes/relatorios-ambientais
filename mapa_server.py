#!/usr/bin/env python3
"""
Servidor de geração de mapas para o App Relatórios SUAL
Porta: 3457
POST /mapas  — gera 4 mapas PNG em base64
GET  /status — verifica se está rodando
"""
import json, io, base64, os, sys, math
from http.server import HTTPServer, BaseHTTPRequestHandler
import geopandas as gpd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.lines import Line2D
import matplotlib.patheffects as pe
from pyproj import Transformer
import warnings
warnings.filterwarnings('ignore')

# ── CAMINHOS DOS SHAPEFILES ───────────────────────────────────────────
BASE_GIS = os.path.expanduser(
    '~/Library/CloudStorage/OneDrive-Pessoal/Documentos/BASES GIS/BAHIA')

SHP = {
    'municipios':  os.path.join(BASE_GIS, 'Limites_IBGE2006/municipios.shp'),
    'limite_ba':   os.path.join(BASE_GIS, 'Limites_IBGE2006/limite_bahia.shp'),
    'hidro_uni':   os.path.join(BASE_GIS, 'Hidrografia/bahia_unifilar.shp'),
    'hidro_bif':   os.path.join(BASE_GIS, 'Hidrografia/bahia_bifilar.shp'),
    'litologia':   os.path.join(BASE_GIS, 'Litologia/bahia_lito.shp'),
    'bacias':      os.path.join(BASE_GIS, 'SNIRH_BaciasDNAEE/SNIRH_BaciasDNAEE.shp'),
    'subbacias':   os.path.join(BASE_GIS, 'SNIRH_BaciasDNAEE/SNIRH_SUbBaciasDNAEE.shp'),
    'pocos':       os.path.join(BASE_GIS, 'Poços/pocos200203_a.shp'),
}

# Cache dos shapefiles (evita recarregar a cada requisição)
_cache = {}

def carregar(nome):
    if nome not in _cache:
        try:
            _cache[nome] = gpd.read_file(SHP[nome])
        except Exception as e:
            print(f'[AVISO] Não foi possível carregar {nome}: {e}')
            _cache[nome] = None
    return _cache[nome]

def utm_para_latlon(E, N, zona):
    """Converte UTM (SIRGAS 2000) para lat/lon WGS84"""
    try:
        num_zona = int(''.join(filter(str.isdigit, str(zona))))
        letra = ''.join(filter(str.isalpha, str(zona))).upper()
        sul = letra < 'N'
        epsg = 31960 + num_zona if sul else 31946 + num_zona
        transformer = Transformer.from_crs(f'EPSG:{epsg}', 'EPSG:4326', always_xy=True)
        lon, lat = transformer.transform(E, N)
        return lat, lon
    except:
        # Fallback: zona 24L sul
        transformer = Transformer.from_crs('EPSG:31984', 'EPSG:4326', always_xy=True)
        lon, lat = transformer.transform(E, N)
        return lat, lon

def adicionar_norte(ax, x=0.95, y=0.15):
    """Adiciona símbolo de norte ao mapa"""
    ax.annotate('N', xy=(x, y+0.08), xycoords='axes fraction',
                ha='center', va='center', fontsize=10, fontweight='bold')
    ax.annotate('', xy=(x, y+0.07), xytext=(x, y-0.01),
                xycoords='axes fraction', textcoords='axes fraction',
                arrowprops=dict(arrowstyle='->', color='black', lw=2))

def adicionar_escala(ax, lat, lon, extent_deg, fig_width_cm=15):
    """Adiciona barra de escala aproximada"""
    km_por_grau = 111.0
    graus = extent_deg * 0.3
    km = graus * km_por_grau * math.cos(math.radians(lat))
    km_round = round(km, -1) if km > 20 else round(km, 0)
    x0 = ax.get_xlim()[0] + (ax.get_xlim()[1] - ax.get_xlim()[0]) * 0.05
    y0 = ax.get_ylim()[0] + (ax.get_ylim()[1] - ax.get_ylim()[0]) * 0.05
    dx = graus
    ax.plot([x0, x0+dx], [y0, y0], 'k-', lw=3)
    ax.plot([x0, x0], [y0-0.003, y0+0.003], 'k-', lw=2)
    ax.plot([x0+dx, x0+dx], [y0-0.003, y0+0.003], 'k-', lw=2)
    ax.text(x0+dx/2, y0+0.005, f'{km_round:.0f} km', ha='center', va='bottom', fontsize=7)

def fig_para_base64(fig):
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=150, bbox_inches='tight',
                facecolor='white', edgecolor='none')
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('ascii')

# ── GERAÇÃO DOS MAPAS ────────────────────────────────────────────────

def mapa_localizacao(lat, lon, municipio_nome, razao_social):
    """Mapa de localização: município + empreendimento"""
    munis = carregar('municipios')
    hidro = carregar('hidro_uni')

    EXTENT = 0.6  # graus ao redor do ponto
    xmin, xmax = lon - EXTENT, lon + EXTENT
    ymin, ymax = lat - EXTENT, lat + EXTENT

    fig, ax = plt.subplots(1, 1, figsize=(15/2.54, 12/2.54))

    # Municípios — todos em cinza claro
    if munis is not None:
        munis.plot(ax=ax, color='#E8E8E8', edgecolor='#888888', linewidth=0.3)
        # Município do empreendimento em destaque
        muni_match = munis[munis['nm_nome'].str.upper().str.contains(
            municipio_nome.upper()[:8], na=False)]
        if not muni_match.empty:
            muni_match.plot(ax=ax, color='#BDD7EE', edgecolor='#2E75B6', linewidth=1.0)

    # Hidrografia
    if hidro is not None:
        hidro_clip = hidro.cx[xmin:xmax, ymin:ymax]
        if not hidro_clip.empty:
            hidro_clip.plot(ax=ax, color='#4472C4', linewidth=0.5, alpha=0.7)

    # Ponto do empreendimento
    ax.plot(lon, lat, 'r^', markersize=10, zorder=10,
            markeredgecolor='darkred', markeredgewidth=0.5)
    ax.text(lon + 0.02, lat, razao_social[:25] + '...' if len(razao_social) > 25 else razao_social,
            fontsize=6, va='center', color='darkred',
            path_effects=[pe.withStroke(linewidth=2, foreground='white')])

    ax.set_xlim(xmin, xmax)
    ax.set_ylim(ymin, ymax)
    ax.set_xlabel('Longitude (°)', fontsize=7)
    ax.set_ylabel('Latitude (°)', fontsize=7)
    ax.tick_params(labelsize=6)
    ax.set_title(f'Figura 1 – Mapa de Localização\n{razao_social[:40]}', fontsize=8, fontweight='bold', pad=8)
    ax.grid(True, alpha=0.3, linewidth=0.3)

    legend_elements = [
        mpatches.Patch(facecolor='#BDD7EE', edgecolor='#2E75B6', label=municipio_nome),
        mpatches.Patch(facecolor='#E8E8E8', edgecolor='#888888', label='Municípios vizinhos'),
        Line2D([0],[0], color='#4472C4', linewidth=1, label='Hidrografia'),
        Line2D([0],[0], marker='^', color='w', markerfacecolor='red', markersize=8, label='Empreendimento'),
    ]
    ax.legend(handles=legend_elements, loc='lower left', fontsize=6, framealpha=0.9)
    adicionar_norte(ax)
    adicionar_escala(ax, lat, lon, EXTENT)

    ax.text(0.5, -0.12, 'Datum: SIRGAS 2000 | Projeção: Geographic WGS84 | Fonte: IBGE 2006',
            transform=ax.transAxes, ha='center', fontsize=5, color='gray')

    return fig_para_base64(fig)


def mapa_geologico(lat, lon, municipio_nome, razao_social):
    """Mapa Geológico: litologia + empreendimento"""
    lito = carregar('litologia')
    munis = carregar('municipios')

    EXTENT = 0.8
    xmin, xmax = lon - EXTENT, lon + EXTENT
    ymin, ymax = lat - EXTENT, lat + EXTENT

    fig, ax = plt.subplots(1, 1, figsize=(15/2.54, 12/2.54))

    if lito is not None:
        lito_clip = lito.cx[xmin:xmax, ymin:ymax]
        if not lito_clip.empty:
            # Cores por unidade geológica
            import matplotlib.cm as cm
            n_unidades = lito_clip['SIGLA_UNID'].nunique() if 'SIGLA_UNID' in lito_clip.columns else 10
            cmap = cm.get_cmap('tab20', max(n_unidades, 1))
            if 'SIGLA_UNID' in lito_clip.columns:
                categorias = lito_clip['SIGLA_UNID'].unique()
                cores = {cat: cmap(i/len(categorias)) for i, cat in enumerate(categorias)}
                lito_clip['_cor'] = lito_clip['SIGLA_UNID'].map(cores)
                lito_clip.plot(ax=ax, color=lito_clip['_cor'].tolist(),
                               edgecolor='#555555', linewidth=0.2, alpha=0.8)
                # Legenda simplificada (máx 8 itens)
                col_desc = 'NOME_UNIDA' if 'NOME_UNIDA' in lito_clip.columns else 'SIGLA_UNID'
                patches = [mpatches.Patch(color=cores[c],
                           label=f"{c} — {lito_clip[lito_clip['SIGLA_UNID']==c][col_desc].iloc[0][:30]}")
                           for c in list(categorias)[:8]]
                ax.legend(handles=patches, loc='lower left', fontsize=5,
                          framealpha=0.9, title='Geologia', title_fontsize=6)
            else:
                lito_clip.plot(ax=ax, edgecolor='#555555', linewidth=0.2, alpha=0.8)

    if munis is not None:
        munis.cx[xmin:xmax, ymin:ymax].plot(
            ax=ax, color='none', edgecolor='#333333', linewidth=0.6)

    ax.plot(lon, lat, 'r^', markersize=10, zorder=10,
            markeredgecolor='darkred', markeredgewidth=0.5)

    ax.set_xlim(xmin, xmax)
    ax.set_ylim(ymin, ymax)
    ax.set_xlabel('Longitude (°)', fontsize=7)
    ax.set_ylabel('Latitude (°)', fontsize=7)
    ax.tick_params(labelsize=6)
    ax.set_title(f'Figura 2 – Mapa Geológico Regional\n{razao_social[:40]}', fontsize=8, fontweight='bold', pad=8)
    ax.grid(True, alpha=0.3, linewidth=0.3)
    adicionar_norte(ax)
    adicionar_escala(ax, lat, lon, EXTENT)
    ax.text(0.5, -0.12, 'Datum: SIRGAS 2000 | Fonte: CPRM / CBPM — Litologia 1:1.000.000',
            transform=ax.transAxes, ha='center', fontsize=5, color='gray')

    return fig_para_base64(fig)


def mapa_hidrografia(lat, lon, municipio_nome, razao_social):
    """Mapa de Hidrografia: rios + bacias + empreendimento"""
    hidro_uni = carregar('hidro_uni')
    hidro_bif = carregar('hidro_bif')
    bacias    = carregar('bacias')
    subbacias = carregar('subbacias')
    munis     = carregar('municipios')

    EXTENT = 0.8
    xmin, xmax = lon - EXTENT, lon + EXTENT
    ymin, ymax = lat - EXTENT, lat + EXTENT

    fig, ax = plt.subplots(1, 1, figsize=(15/2.54, 12/2.54))

    ax.set_facecolor('#E8F4F8')

    if bacias is not None:
        b = bacias.cx[xmin:xmax, ymin:ymax]
        if not b.empty:
            b.plot(ax=ax, color='#C6E2FF', edgecolor='#4472C4', linewidth=0.8, alpha=0.5)

    if subbacias is not None:
        sb = subbacias.cx[xmin:xmax, ymin:ymax]
        if not sb.empty:
            sb.plot(ax=ax, color='none', edgecolor='#7BA7D4', linewidth=0.4, linestyle='--')

    if hidro_bif is not None:
        hb = hidro_bif.cx[xmin:xmax, ymin:ymax]
        if not hb.empty:
            hb.plot(ax=ax, color='#0070C0', linewidth=1.2, alpha=0.9)

    if hidro_uni is not None:
        hu = hidro_uni.cx[xmin:xmax, ymin:ymax]
        if not hu.empty:
            hu.plot(ax=ax, color='#4472C4', linewidth=0.5, alpha=0.7)

    if munis is not None:
        munis.cx[xmin:xmax, ymin:ymax].plot(
            ax=ax, color='none', edgecolor='#555555', linewidth=0.5)

    ax.plot(lon, lat, 'r^', markersize=10, zorder=10,
            markeredgecolor='darkred', markeredgewidth=0.5)

    ax.set_xlim(xmin, xmax)
    ax.set_ylim(ymin, ymax)
    ax.set_xlabel('Longitude (°)', fontsize=7)
    ax.set_ylabel('Latitude (°)', fontsize=7)
    ax.tick_params(labelsize=6)
    ax.set_title(f'Figura 3 – Mapa de Hidrografia\n{razao_social[:40]}', fontsize=8, fontweight='bold', pad=8)
    ax.grid(True, alpha=0.3, linewidth=0.3)

    legend_elements = [
        mpatches.Patch(facecolor='#C6E2FF', edgecolor='#4472C4', label='Bacia hidrográfica'),
        Line2D([0],[0], color='#0070C0', linewidth=2, label='Rio principal (bifilar)'),
        Line2D([0],[0], color='#4472C4', linewidth=1, label='Rio/córrego (unifilar)'),
        Line2D([0],[0], color='#7BA7D4', linewidth=1, linestyle='--', label='Sub-bacia'),
        Line2D([0],[0], marker='^', color='w', markerfacecolor='red', markersize=8, label='Empreendimento'),
    ]
    ax.legend(handles=legend_elements, loc='lower left', fontsize=6, framealpha=0.9)
    adicionar_norte(ax)
    adicionar_escala(ax, lat, lon, EXTENT)
    ax.text(0.5, -0.12, 'Datum: SIRGAS 2000 | Fonte: SNIRH/ANA — Hidrografia 1:1.000.000',
            transform=ax.transAxes, ha='center', fontsize=5, color='gray')

    return fig_para_base64(fig)


def mapa_hidrogeologico(lat, lon, municipio_nome, razao_social):
    """Mapa Hidrogeológico: poços + empreendimento"""
    munis  = carregar('municipios')
    pocos  = carregar('pocos')
    hidro  = carregar('hidro_uni')

    EXTENT = 0.6
    xmin, xmax = lon - EXTENT, lon + EXTENT
    ymin, ymax = lat - EXTENT, lat + EXTENT

    fig, ax = plt.subplots(1, 1, figsize=(15/2.54, 12/2.54))

    if munis is not None:
        munis.cx[xmin:xmax, ymin:ymax].plot(
            ax=ax, color='#F5F5DC', edgecolor='#888888', linewidth=0.5)
        muni_match = munis[munis['nm_nome'].str.upper().str.contains(
            municipio_nome.upper()[:8], na=False)]
        if not muni_match.empty:
            muni_match.plot(ax=ax, color='#E8F4E8', edgecolor='#2E7D32', linewidth=1.0)

    if hidro is not None:
        hu = hidro.cx[xmin:xmax, ymin:ymax]
        if not hu.empty:
            hu.plot(ax=ax, color='#4472C4', linewidth=0.5, alpha=0.6)

    if pocos is not None:
        pocos_clip = pocos.cx[xmin:xmax, ymin:ymax]
        if not pocos_clip.empty:
            pocos_clip.plot(ax=ax, color='#00B0F0', marker='o',
                           markersize=4, alpha=0.7, zorder=5)
            # Anotar NE se disponível
            ne_col = None  # coluna NE não disponível neste shapefile
            if ne_col and len(pocos_clip) <= 15:
                for _, row in pocos_clip.iterrows():
                    if row.geometry:
                        val = row[ne_col]
                        if val and str(val) not in ['None','nan','']:
                            ax.annotate(f'NE:{val:.0f}m' if isinstance(val,float) else f'NE:{val}',
                                       xy=(row.geometry.x, row.geometry.y),
                                       fontsize=4, color='navy',
                                       xytext=(3,3), textcoords='offset points')

    # Ponto do empreendimento
    ax.plot(lon, lat, 'r^', markersize=12, zorder=10,
            markeredgecolor='darkred', markeredgewidth=0.5)
    ax.plot(lon, lat, 'r^', markersize=12, zorder=10,
            markeredgecolor='darkred', markeredgewidth=0.5)

    ax.set_xlim(xmin, xmax)
    ax.set_ylim(ymin, ymax)
    ax.set_xlabel('Longitude (°)', fontsize=7)
    ax.set_ylabel('Latitude (°)', fontsize=7)
    ax.tick_params(labelsize=6)
    ax.set_title(f'Figura 4 – Mapa Hidrogeológico\n{razao_social[:40]}', fontsize=8, fontweight='bold', pad=8)
    ax.grid(True, alpha=0.3, linewidth=0.3)

    legend_elements = [
        mpatches.Patch(facecolor='#E8F4E8', edgecolor='#2E7D32', label=municipio_nome),
        mpatches.Patch(facecolor='#F5F5DC', edgecolor='#888888', label='Municípios vizinhos'),
        Line2D([0],[0], color='#4472C4', linewidth=1, label='Hidrografia'),
        Line2D([0],[0], marker='o', color='w', markerfacecolor='#00B0F0', markersize=7, label='Poços (SIAGAS/CPRM)'),
        Line2D([0],[0], marker='^', color='w', markerfacecolor='red', markersize=8, label='Empreendimento'),
    ]
    ax.legend(handles=legend_elements, loc='lower left', fontsize=6, framealpha=0.9)
    adicionar_norte(ax)
    adicionar_escala(ax, lat, lon, EXTENT)
    ax.text(0.5, -0.12, 'Datum: SIRGAS 2000 | Fonte: CPRM/SIAGAS — Poços 2003',
            transform=ax.transAxes, ha='center', fontsize=5, color='gray')

    return fig_para_base64(fig)


# ── SERVIDOR HTTP ────────────────────────────────────────────────────

class MapaHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        print(f'[MAPA] {args[0]} {args[1]}')

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        if self.path == '/status':
            self._json({'ok': True, 'msg': 'Servidor de mapas SUAL ativo'})
        else:
            self._json({'erro': 'Endpoint não encontrado'}, 404)

    def do_POST(self):
        if self.path != '/mapas':
            self._json({'erro': 'Endpoint não encontrado'}, 404)
            return
        try:
            length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(length))
            E    = float(body.get('coordE', 0))
            N    = float(body.get('coordN', 0))
            zona = body.get('zonaUtm', '24L')
            mun  = body.get('municipio', 'Município')
            rs   = body.get('razaoSocial', 'Empreendimento')

            if E == 0 or N == 0:
                self._json({'erro': 'Coordenadas inválidas'}, 400)
                return

            print(f'[MAPA] Gerando para {mun} | E:{E} N:{N} Zona:{zona}')
            lat, lon = utm_para_latlon(E, N, zona)
            print(f'[MAPA] Lat/Lon: {lat:.4f}, {lon:.4f}')

            resultado = {
                'localizacao':    mapa_localizacao(lat, lon, mun, rs),
                'geologico':      mapa_geologico(lat, lon, mun, rs),
                'hidrografia':    mapa_hidrografia(lat, lon, mun, rs),
                'hidrogeologico': mapa_hidrogeologico(lat, lon, mun, rs),
            }
            print('[MAPA] Mapas gerados com sucesso')
            self._json(resultado)

        except Exception as ex:
            import traceback
            print(f'[MAPA] ERRO: {ex}')
            traceback.print_exc()
            self._json({'erro': str(ex)}, 500)

    def _json(self, data, code=200):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(body))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)


if __name__ == '__main__':
    PORT = 3457
    print(f'[MAPA] Pré-carregando shapefiles...')
    for nome in SHP:
        carregar(nome)
    print(f'[MAPA] Servidor de mapas iniciado em http://localhost:{PORT}')
    HTTPServer(('', PORT), MapaHandler).serve_forever()
