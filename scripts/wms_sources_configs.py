import os

# Non-time-enabled layers whose underlying data changes frequently. Animet forces
# a GetMap re-request for these once a minute so the map doesn't go stale; time
# enabled layers are ignored since they already refresh via their time dimension.
GEOMET_WEATHER_REFRESH_LAYERS = [
    "Current-Alerts",
    "Current-Alerts-Alpha",
    "Current-Alerts-Dev",
    "Current-Alerts-Stage"
]

wms_sources = {
    "Presets": {
        "urls": [os.environ.get("GEOMET_WEATHER_NIGHTLY_URL", default="https://geo.weather.gc.ca/geomet")],
        "version": "1.3.0",
        "display": True,
        "source_validation": "GEOMET_WEATHER_NIGHTLY_URL" in os.environ,
    },
    "Weather": {
        "urls": ["https://geo.weather.gc.ca/geomet"],
        "version": "1.3.0",
        "display": True,
        "hasInterpolation": True,
        "refresh_layers": GEOMET_WEATHER_REFRESH_LAYERS,
    },
    "Climate": {
        "urls": ["https://geo.weather.gc.ca/geomet-climate"],
        "version": "1.3.0",
        "display": True,
    },
    "WeatherNightly": {
        "urls": [os.environ.get("GEOMET_WEATHER_NIGHTLY_URL", default="")],
        "version": "1.3.0",
        "display": os.environ.get("ANIMET_NIGHTLY", default=False),
        "source_validation": True,
        "hasInterpolation": True,
        "refresh_layers": GEOMET_WEATHER_REFRESH_LAYERS,
    },
    "ClimateNightly": {
        "urls": [os.environ.get("GEOMET_CLIMATE_NIGHTLY_URL", default="")],
        "version": "1.3.0",
        "display": os.environ.get("ANIMET_NIGHTLY", default=False),
        "source_validation": True,
    },
    "WeatherDev": {
        "urls": [os.environ.get("GEOMET_WEATHER_DEV_URL", default="")],
        "version": "1.3.0",
        "display": os.environ.get("ANIMET_NIGHTLY", default=False),
        "source_validation": True,
        "hasInterpolation": True,
        "refresh_layers": GEOMET_WEATHER_REFRESH_LAYERS,
    },
    "ClimateDev": {
        "urls": [os.environ.get("GEOMET_CLIMATE_DEV_URL", default="")],
        "version": "1.3.0",
        "display": os.environ.get("ANIMET_NIGHTLY", default=False),
        "source_validation": True,
    },
    "WeatherStage": {
        "urls": [os.environ.get("GEOMET_WEATHER_STAGE_URL", default="")],
        "version": "1.3.0",
        "display": os.environ.get("ANIMET_NIGHTLY", default=False),
        "source_validation": True,
        "hasInterpolation": True,
        "refresh_layers": GEOMET_WEATHER_REFRESH_LAYERS,
    },
    "ClimateStage": {
        "urls": [os.environ.get("GEOMET_CLIMATE_STAGE_URL", default="")],
        "version": "1.3.0",
        "display": os.environ.get("ANIMET_NIGHTLY", default=False),
        "source_validation": True,
    },
    "MapProxy": {
        "urls": [os.environ.get("GEOMET_MAPPROXY_NIGHTLY_URL", default="")],
        "version": "1.3.0",
        "no_translations": True,
        "display": os.environ.get("ANIMET_NIGHTLY", default=False),
        "source_validation": True,
    },
    "ECMWF": {
        "urls": ["https://eccharts.ecmwf.int/wms/?token=public"],
        "version": "1.3.0",
        "display": True,
    },
    "NOAA": {
        "urls": [
            "https://nowcoast.noaa.gov/geoserver/ows",
            "https://opengeo.ncep.noaa.gov/geoserver/ows",
        ],
        "version": "1.3.0",
        "query_pattern": [
            "https://nowcoast.noaa.gov/geoserver{LAYER}/ows",
            "https://opengeo.ncep.noaa.gov/geoserver{LAYER}/ows",
        ],
        "names": {
            "en": [
                "nowCOAST (NOAA)",
                "National Centers for Environmental Prediction (NCEP)",
            ],
            "fr": [
                "nowCOAST (NOAA)",
                "Centres nationaux de prédiction environnementale (NCEP)",
            ],
        },
        "no_translations": True,
        "display": True,
    },
    "NASA": {
        "urls": ["https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi"],
        "version": "1.3.0",
        "display": True,
    },
    "NRCan": {
        "urls": [
            "https://maps-cartes.services.geo.ca/server_serveur/services/TC/canadian_airports_w_air_navigation_services_en/MapServer/WMSServer",
            "https://maps.geogratis.gc.ca/wms/canvec_en",
            "https://datacube.services.geo.ca/wrapper/ogc/elevation-hrdem-mosaic",
            "https://maps.geogratis.gc.ca/wms/hydro_network_en",
        ],
        "urls_fr": [
            "https://maps-cartes.services.geo.ca/server_serveur/services/TC/canadian_airports_w_air_navigation_services_fr/MapServer/WMSServer",
            "https://maps.geogratis.gc.ca/wms/canvec_fr",
            "https://datacube.services.geo.ca/wrapper/ogc/elevation-hrdem-mosaic",
            "https://maps.geogratis.gc.ca/wms/hydro_network_fr",
        ],
        "names": {
            "en": [
                "Canadian Airports",
                "CanVec",
                "Medium Resolution Digital Elevation Model (MRDEM) - CanElevation Series",
                "National Hydro Network",
            ],
            "fr": [
                "Aéroports canadiens",
                "CanVec",
                "Modèle numérique d'élévation de moyenne résolution (MNEMR) - Série CanÉlévation",
                "Réseau hydrographique national",
            ]
        },
        "version": "1.3.0",
        "display": True,
    },
    "Others": {
        "urls": [
            "https://servicescarto.mern.gouv.qc.ca/pes/services/Territoire/SDA_WMS/MapServer/WmsServer",
        ],
        "urls_fr": [
            "https://servicescarto.mern.gouv.qc.ca/pes/services/Territoire/SDA_WMS/MapServer/WmsServer",
        ],
        "names": {
            "en": [
                "QC MRNF - Territory",
            ],
            "fr": [
                "QC MRNF - Territoire",
            ]
        },
        "version": "1.3.0",
        "display": True,
    },
}
