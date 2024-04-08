#!/usr/bin/env sh

PYTHON_VENV=generate-tree-venv
# abort on errors

set -e

# build

git checkout --orphan gh-pages
echo "Setting up Python environment to generate latest layer names..."
python3 -m venv --system-site-packages $PYTHON_VENV
. $PYTHON_VENV/bin/activate
pip install owslib
cd ./scripts
echo "Generating latest layer tree_en|fr_weather|climate.js ..."
python3 generate_trees_layers_list.py
deactivate
cd ..
echo "Done. Clearing Python virtual environment..."
rm -rf $PYTHON_VENV
echo "Use .env for gh-pages"
cp ./deploy/gh-pages/.env ./.env
echo "Building and bundling application files..."
npm run build
cp ./dist/index.html ./dist/404.html
git --work-tree dist add --all
git --work-tree dist commit -m 'gh-pages deploy'
echo "Pushing to gh-pages..."
# git remote add github https://github.com/ECCC-MSC/msc-animet.git
git push github HEAD:gh-pages --force
echo "Done. Clearing dist..."
rm -r dist
echo "Checkout back to main..."
git checkout -f main
echo "Deleting local gh-pages branch..."
git branch -D gh-pages
echo "Sucessfully deployed, check your settings"
