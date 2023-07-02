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

  const windowsX86_64 = {};
  const linuxX86_64 = {};
  const darwinX86_64 = {};
  // const darwinAarch64 = {};

  const promises = latestAssets.map(async (asset) => {
    const { name, browser_download_url } = asset;

    if (/\.msi\.zip$/.test(name)) {
      windowsX86_64.url = browser_download_url;
    }
    if (/\.msi\.zip\.sig$/.test(name)) {
      windowsX86_64.signature = await getAssetSign(browser_download_url);
    }

    if (/\.AppImage\.tar\.gz$/.test(name)) {
      linuxX86_64.url = browser_download_url;
    }
    if (/\.AppImage\.tar\.gz\.sig$/.test(name)) {
      linuxX86_64.signature = await getAssetSign(browser_download_url);
    }

    if (/x86_64\.app\.tar\.gz$/.test(name)) {
      darwinX86_64.url = browser_download_url;
    }
    if (/x86_64\.app\.tar\.gz\.sig$/.test(name)) {
      darwinX86_64.signature = await getAssetSign(browser_download_url);
    }

    // if (/aarch64\.app\.tar\.gz$/.test(name)) {
    //   darwinAarch64.url = browser_download_url;
    // }
    // if (/aarch64\.app\.tar\.gz\.sig$/.test(name)) {
    //   darwinAarch64.signature = await getAssetSign(browser_download_url);
    // }
  });

  await Promise.allSettled(promises);

  const releaseData = {
    name: latestTag.name,
    notes: `https://github.com/${repoMetaData.owner}/${repoMetaData.repo}/releases/tag/${latestTag.name}`,
    pub_date: new Date().toISOString(),
    platforms: {},
  };

  if (windowsX86_64.url) releaseData.platforms["windows-x86_64"] = windowsX86_64;
  else console.error('Failed to get release for windowsX86_64');

  if (linuxX86_64.url) releaseData.platforms["linux-x86_64"] = linuxX86_64;
  else console.error('Failed to get release for linuxX86_64');

  if (darwinX86_64.url) releaseData.platforms["darwin-x86_64"] = darwinX86_64;
  else console.error('Failed to get release for darwinX86_64');

  // if (darwinAarch64.url) releaseData.platforms["darwin-aarch64"] = darwinAarch64;
  // else console.error('Failed to get release for darwinAarch64');

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