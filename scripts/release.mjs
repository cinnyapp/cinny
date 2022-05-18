import fetch from "node-fetch";
import { getOctokit, context } from "@actions/github";

async function getAssetSign(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/octet-stream",
    },
  });

  return response.text();
}

async function createTauriRelease() {
  if (process.env.GITHUB_TOKEN === undefined) {
    throw new Error("GITHUB_TOKEN is not found!");
  }

  const github = getOctokit(process.env.GITHUB_TOKEN);
  const { repos } = github.rest;
  const repoMetaData = {
    owner: context.repo.owner,
    repo: context.repo.repo,
  };

  const tagsResult = await repos.listTags({ ...repoMetaData, per_page: 10, page: 1 });
  const latestTag = tagsResult.data.find((tag) => tag.name.startsWith("v"));
  console.log(latestTag);

  const latestRelease = await repos.getReleaseByTag({ ...repoMetaData, tag: latestTag.name });
  const latestAssets = latestRelease.data.assets;

  const win64 = {};
  const linux = {};
  const darwin = {};

  const promises = latestAssets.map(async (asset) => {
    const { name, browser_download_url } = asset;

    if (/\.msi\.zip$/.test(name)) {
      win64.url = browser_download_url;
    }
    if (/\.msi\.zip\.sig$/.test(name)) {
      win64.signature = await getAssetSign(browser_download_url);
    }

    if (/\.AppImage\.tar\.gz$/.test(name)) {
      linux.url = browser_download_url;
    }
    if (/\.AppImage\.tar\.gz\.sig$/.test(name)) {
      linux.signature = await getAssetSign(browser_download_url);
    }

    if (/\.app\.tar\.gz$/.test(name)) {
      darwin.url = browser_download_url;
    }
    if (/\.app\.tar\.gz\.sig$/.test(name)) {
      darwin.signature = await getAssetSign(browser_download_url);
    }
  });

  await Promise.allSettled(promises);

  const releaseData = {
    name: latestTag.name,
    notes: `https://github.com/${repoMetaData.owner}/${repoMetaData.repo}/releases/tag/${latestTag.name}`,
    pub_date: new Date().toISOString(),
    platforms: {},
  };

  if (win64.url) releaseData.platforms["windows-x86_64"] = win64;
  else console.error('Failed to get release for win64');

  if (linux.url) releaseData.platforms["linux-x86_64"] = linux;
  else console.error('Failed to get release for linux');

  if (darwin.url) releaseData.platforms["darwin-x86_64"] = darwin;
  else console.error('Failed to get release for darwin');

  const releaseResult = await repos.getReleaseByTag({ ...repoMetaData, tag: 'tauri' });
  const tauriRelease = releaseResult.data;

  const prevReleaseAsset = tauriRelease.assets.find((asset) => asset.name === 'release.json');
  if (prevReleaseAsset) {
    await repos.deleteReleaseAsset({ ...repoMetaData, asset_id: prevReleaseAsset.id });
  }

  console.log(releaseData);
  await repos.uploadReleaseAsset({
    ...repoMetaData,
    release_id: tauriRelease.id,
    name: 'release.json',
    data: JSON.stringify(releaseData, null, 2),
  });
}
createTauriRelease();