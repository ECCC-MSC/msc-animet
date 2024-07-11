# =================================================================
#
# Authors: Etienne Pelletier <etienne.pelletier@ec.gc.ca>
#          Philippe Théroux <philippe.theroux@ec.gc.ca>
#
# Copyright (c) 2022 Etienne Pelletier
# Copyright (c) 2023-2024 Philippe Théroux
#
# Permission is hereby granted, free of charge, to any person
# obtaining a copy of this software and associated documentation
# files (the "Software"), to deal in the Software without
# restriction, including without limitation the rights to use,
# copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the
# Software is furnished to do so, subject to the following
# conditions:
#
# The above copyright notice and this permission notice shall be
# included in all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
# EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
# OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
# NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
# HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
# WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
# FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
# OTHER DEALINGS IN THE SOFTWARE.
#
# =================================================================
import glob
import json
import os
import requests
from xml.etree import ElementTree

from owslib.wms import WebMapService


TREE_JS_TEMPLATE = """\
export default {{
  '{}' : {},
  '{}' : {}
}}\
"""


def slugify_title(str):
    return str.lower().strip().replace(" ", "-")


def generate_layer_dict(list_layer_metadata):
    items = []
    for layer_metadata in list_layer_metadata:
        layer_dict = {
            # "key": slugify_title(layer_metadata.name),
            "Title": layer_metadata.title,
            "Name": layer_metadata.name,
        }
        if layer_metadata.layers:
            layer_dict["isLeaf"] = False
            layer_dict["children"] = generate_layer_dict(
                layer_metadata.layers
            )
        if len(layer_metadata.layers) == 0:
            layer_dict["isLeaf"] = True
            if layer_metadata.timepositions:
                layer_dict["isTemporal"] = True
            else:
                layer_dict["isTemporal"] = False
        items.append(layer_dict)
    return items

def findTopLevel(metadata):
    if(metadata.parent == None):
        return metadata.layers
    else:
        return findTopLevel(metadata.parent)

langs = ["en", "fr"]
with open("wms_sources_configs.json") as f:
    wmsSources = json.load(f)

trees_files = glob.glob("../src/assets/trees/tree_*.js")
layers_en_files = glob.glob("../src/locales/en/layers_*.json")
layers_fr_files = glob.glob("../src/locales/fr/layers_*.json")

file_list = trees_files + layers_en_files + layers_fr_files

for file_path in file_list:
    os.remove(file_path)

# Function to extract CRS values from the first Layer
def extract_wms_crs(url):
    # Send a GET request to the URL
    response = requests.get(url)

    # Parse the XML response
    root = ElementTree.fromstring(response.content)

    # Define the namespace dictionary
    ns = {'wms': 'http://www.opengis.net/wms'}

    # Find the first Layer element with the correct namespace prefix
    first_layer = root.find(".//wms:Layer", ns)

    # If a Layer element is found, find all CRS elements within it
    if first_layer is not None:
        crs_elements = first_layer.findall("./wms:CRS", ns)
        # Extract the text of each CRS element and store them in a list
        crs_list = [element.text for element in crs_elements]
    else:
        crs_list = []

    return crs_list

for name, params in wmsSources.items():
    name = name.lower()
    for lang in langs:
        if "?" in params["url"]:
            base_url = f"{params['url']}&lang={lang}"
        else:
            base_url = f"{params['url']}?lang={lang}"
        try:
            wms = WebMapService(
                base_url, version=params["version"]
            )
        except Exception as e:
            raise SystemExit(e)

        # get all top level layer metadata objects
        _, metadata = wms.items()[0]
        top_level_items = findTopLevel(metadata)

        get_capa_url = f"{base_url}&SERVICE=WMS&VERSION={params['version']}&REQUEST=GetCapabilities"
        crs_values = extract_wms_crs(get_capa_url)

        layers = []
        # iterate through top level items and recursively generate children as needed
        for layer_metadata in top_level_items:
            layers += generate_layer_dict([layer_metadata])
        layers_sorted = sorted(layers, key=lambda k: k["Title"])

        with open(f"../src/assets/trees/tree_{lang}_{name}.js", "w+") as f:
            f.write(
                TREE_JS_TEMPLATE.format(
                    f"proj_{name}", json.dumps(crs_values, indent=2),
                    f"tree_{lang}_{name}", json.dumps(layers_sorted, indent=2)
                )
            )

        layers_dict = {}
        for _, metadata in wms.items():
            if not metadata.layers:
                layers_dict[metadata.name] = metadata.title
        layers_dict_sorted = dict(sorted(layers_dict.items()))

        with open(f"../src/locales/{lang}/layers_{name}.json", "w+") as f:
            # write layers_dict_sorted to json file
            f.write(json.dumps(layers_dict_sorted, indent=2, ensure_ascii=False))
