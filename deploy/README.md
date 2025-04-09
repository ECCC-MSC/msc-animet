# Deployment

The deployment instructions in this README is meant for internal use in ECCC-MSC servers.
## .env

This `.env` file is specific to the nightly server. This file will replace the default `.env` at the root application folder via the `deploy-nightly.sh` script.

## animet.conf

This is the `apache2` configuration. It enables the SPA fallback (for VueJS history mode) and ensures the path on disk is routed to the web sub-path. This apache2 configuration below seems to be the cleanest to serve the application from a `https://domain-name.ca/subpath` and to enable SPA fallback.

```conf
Alias /web/sub/path /path/on/disk/to/index.html

<Directory /path/on/disk/to/index.html/>
  Require all granted
  Options Indexes FollowSymLinks
  AllowOverride All
  FallbackResource /web/sub/path
</Directory>
```

## deploy-nightly.sh

This is the shell script to perform a nightly build. General steps are:
-  `git clone` the repository into a seperate timestamped folder name
-  Replace default `.env` with one specific to the nightly server
-  `npm install` and `npm run build`
-  Copy the `animet.conf` file into the resulting `/dist`
   - The nightly server's apache config (managed by the MSC GeoMet team) is preset to `include` the `animet.conf` from that `/dist` folder.
- Create a symlink called `latest` to the `/dist` from the timestamped app folder name
- Cron jobs on internal CMC servers is managed by the MSC GeoMet team, which will save the raw `deploy-nightly.sh` from git repo into a `/tmp` folder, execute the script and then delete it from `/tmp`

## Manual nightly deployment

This is essentially the cronjob execution:
```bash
# dev Ubuntu focal
curl https://raw.githubusercontent.com/ECCC-MSC/msc-animet/main/deploy/nightly-focal/deploy-nightly.sh -o /tmp/animet-deploy-nightly.sh && bash -f /tmp/animet-deploy-nightly.sh && rm -fr /tmp/animet-deploy-nightly.sh

# dev Ubuntu bionic (deprecated)
curl https://raw.githubusercontent.com/ECCC-MSC/msc-animet/main/deploy/nightly/deploy-nightly.sh && bash -f /tmp/animet-deploy-nightly.sh && rm -fr /tmp/animet-deploy-nightly.sh
```

## Release management
The following is done before pushing a release out to GitHub pages.
- Update `package.json` version: follows (semver)[https://semver.org/]
- Add an entry to release notes to https://github.com/ECCC-MSC/msc-animet/blob/main/RELEASE-NOTES.md
  - Follow the existing template when inputting details:
    - Version `x.y.z` (`YYYY-MM-DD`)
    - Bug Fixes, New Features, Enhancements
- `git commit && git push` your changes
- Create "New branch" in https://github.com/ECCC-MSC/msc-animet/branches
  - Name the branch based on a new x.y versioning (ie. 2.3)
- Draft a new release in https://github.com/ECCC-MSC/msc-animet/releases
  - Tag: `x.y.z` (ie. 2.3.0); Select the prompt: "Create new tag: `x.y.z` on publish"
  - Target: `x.y` branch (ie. 2.3)
  - Previous tag: Set to the previous tag version
  - Release title: `x.y.z` (ie. 2.3.0)
  - Description: "Release version x.y.z"
  - Optional: Click on "Generate release notes" to add a technical list of commits
  - Save draft
- Follow instructions on [GitHub pages deployment][#github-pages-deployment]
- Once deployment is validated, publish draft release

## GitHub pages deployment

Ensure the following is done first:
```bash
# git clone https://github.com/ECCC-MSC/msc-animet.git or your forked repo
git clone https://github.com/ECCC-MSC/msc-animet.git
cd msc-animet

# add remote to github repo, named "github"
git remote add github https://github.com/ECCC-MSC/msc-animet.git
git fetch github

# Make sure you are on the x.y tagged branch
git checkout -b x.y github/x.y

# Install
npm install

# delete existing local branch called "gh-pages"
git branch -D gh-pages

# enable execution permission
chmod +x deploy/gh-pages/deploy.sh
```

Ensure you have `git push` access to https://github.com/ECCC-MSC/msc-animet.git
- You may need to set up a Personal Access Token from Github to `git push` via command line
- profile -> settings -> developer settings -> personal access tokens -> generate new token -> scope: repo

```bash
# if you haven't, enable the configuration for git credential.helper store
git config --global credential.helper store

# you'll be prompted to enter username and password for the first time you git push
```

### npm run deploy to GH pages

Once the above is setup, you can simply run:
```bash
npm run deploy
```

### Manual deploy to GH pages

Optionally if something goes wrong with `npm run deploy`, run the steps manually in https://github.com/ECCC-MSC/msc-animet/blob/main/deploy/gh-pages/deploy.sh or use these manual steps to deploy:
```bash
# clean new branch with no git history
git checkout --orphan gh-pages

# Optional: re-run npm install if dependencies are not up to date
rm package-lock.json
# Alternatively for a clean install
rm -rf node_modules
npm install

# Ensure development ENV variables are unset
unset ANIMET_NIGHTLY
unset GEOMET_WEATHER_NIGHTLY_URL

# Optional: update layer tree. Omit this step if already updated recently
python3 -m venv --system-site-packages $PYTHON_VENV
. $PYTHON_VENV/bin/activate
pip install owslib
cd ./scripts
python3 generate_trees_layers_list.py
deactivate
cd ..
rm -rf $PYTHON_VENV

# Use the gh-pages .env
cp ./deploy/gh-pages/.env ./.env

# start build
npm run build
git --work-tree dist add --all
git --work-tree dist commit -m 'gh-pages deploy'

# push to gh-pages (deploy)
git push github HEAD:gh-pages --force

# delete production files
rm -r dist

# abandon gh-pages branch and checkout back to main branch
git checkout -f main
# or back to your x.y tagged branch
git checkout -f x.y

# delete the local gh-pages branch and leave no trace
git branch -D gh-pages
```