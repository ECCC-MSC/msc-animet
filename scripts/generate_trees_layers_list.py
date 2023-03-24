# =================================================================
#
# Author: Etienne Pelletier <etienne.pelletier@ec.gc.ca>
#
# Copyright (c) 2022 Etienne Pelletier
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
import json

from owslib.wms import WebMapService


TREE_JS_TEMPLATE = """\
export default {{
  {} : {}
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
        if layer_metadata.abstract:
            layer_dict["Abstract"] = (layer_metadata.abstract,)
        if layer_metadata.children:
            layer_dict["isLeaf"] = False
            layer_dict["children"] = generate_layer_dict(
                layer_metadata.children
            )
        if len(layer_metadata.children) == 0:
            layer_dict["isLeaf"] = True
            if layer_metadata.timepositions:
                layer_dict["isTemporal"] = True
            else:
                layer_dict["isTemporal"] = False
        items.append(layer_dict)
    return items


langs = ["en", "fr"]

for lang in langs:

    try:
        wms = WebMapService(
            f"https://geo.weather.gc.ca/geomet?lang={lang}", version="1.3.0"
        )
    except Exception as e:
        raise SystemExit(e)

    # get all top level layer metadata objects
    top_level_items = [
        metadata
        for _, metadata in wms.items()
        if metadata.parent.parent is None
    ]

    layers = []
    # iterate through top level items and recursively generate children as needed
    for layer_metadata in top_level_items:
        layers += generate_layer_dict([layer_metadata])
    layers_sorted = sorted(layers, key=lambda k: k["Title"])

    with open(f"../src/assets/trees/tree_{lang}.js", "w+") as f:
        f.write(
            TREE_JS_TEMPLATE.format(
                f"tree_{lang}", json.dumps(layers_sorted, indent=2)
            )
        )

    layers_dict = {}
    for layer, metadata in wms.items():
        if not metadata.children:
            layers_dict[metadata.name] = metadata.title
    layers_dict_sorted = dict(sorted(layers_dict.items()))

    with open(f"../src/locales/{lang}/layers.json", "w+") as f:
        # write layers_dict_sorted to json file
        f.write(json.dumps(layers_dict_sorted, indent=2, ensure_ascii=False))
