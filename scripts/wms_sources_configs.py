import os

wms_sources = {
    "Presets": {
        "urls": [os.environ.get("GEOMET_WEATHER_NIGHTLY_URL", default="https://geo.weather.gc.ca/geomet")],
        "version": "1.3.0",
        "display": True,
    },
    "Weather": {
        "urls": ["https://geo.weather.gc.ca/geomet"],
        "version": "1.3.0",
        "display": True,
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
    "NOAA - nowCOAST": {
        "urls": ["https://nowcoast.noaa.gov/geoserver/ows"],
        "version": "1.3.0",
        "query_pattern": "https://nowcoast.noaa.gov/geoserver{LAYER}/ows",
        "no_translations": True,
        "display": True,
    },
    "NOAA - NCEP": {
        "urls": ["https://opengeo.ncep.noaa.gov/geoserver/ows"],
        "names": {
            "fr": ["Centres nationaux de prédiction environnementale (NCEP)"],
            "en": ["National Centers for Environmental Prediction (NCEP)"],
        },
        "version": "1.3.0",
        "query_pattern": "https://opengeo.ncep.noaa.gov/geoserver{LAYER}/ows",
        "no_translations": True,
        "display": True,
    },
    "NASA": {
        "urls": ["https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi"],
        "version": "1.3.0",
        "display": True,
    },
    "NRCan": {
        "urls": ["https://maps.geogratis.gc.ca/wms/canvec_en"],
        "urls_fr": ["https://maps.geogratis.gc.ca/wms/canvec_fr"],
        "version": "1.3.0",
        "display": True,
    },
    "Others": {
        "urls": [
            "https://maps-cartes.services.geo.ca/server_serveur/services/TC/canadian_airports_w_air_navigation_services_en/MapServer/WMSServer",
            "https://datacube.services.geo.ca/wrapper/ogc/elevation-hrdem-mosaic",
            "https://servicescarto.mern.gouv.qc.ca/pes/services/Territoire/SDA_WMS/MapServer/WmsServer"
        ],
        "names": {
            "fr": [
                "Aéroports canadiens",
                "Modèle numérique d'élévation de moyenne résolution (MNEMR) - Série CanÉlévation",
                "QC MRNF - Territory",
            ],
            "en": [
                "Canadian Airports",
                "Medium Resolution Digital Elevation Model (MRDEM) - CanElevation Series",
                "QC MRNF - Territoire",
            ]
        },
        "version": "1.3.0",
        "display": True,
    },
}
