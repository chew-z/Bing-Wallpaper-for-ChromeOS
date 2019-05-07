'use strict';

const bing = 'https://www.bing.com';
let refreshInterval = 180; // In minutes
let rotateInterval = 15; // In minutes
let wallpaperPosition = 'STRETCH';

function restoreOptions() {
    chrome.storage.sync.get('rotateInterval', (obj) => {
        if (obj.hasOwnProperty('rotateInterval')) {
            rotateInterval = obj.rotateInterval;
        } else {
            rotateInterval = 15;
        }
    });
    chrome.storage.sync.get('refreshInterval', (obj) => {
        if (obj.hasOwnProperty('refreshInterval')) {
            refreshInterval = obj.refreshInterval;
        } else {
            refreshInterval = 180;
        }
    });
    chrome.storage.sync.get('wallpaperPosition', (obj) => {
        if (obj.hasOwnProperty('wallpaperPosition')) {
            wallpaperPosition = obj.wallpaperPosition;
        } else {
            wallpaperPosition = 'STRETCH';
        }
    });
}

function pathToName(fp) {
    const filepath = fp.substring(fp.indexOf('id=OHR.') + 7, fp.indexOf('_'));
    // console.log('filepath', filepath);
    const name = filepath.split(/(?=[A-Z])/).join(' ');

    return name;
}

function odd(i) {
    if (i & 1) {
        return true;
    } else {
        return false;
    }
}

function addImages(imgs) {
    const max = imgs.length;
    const wallpapers = document.getElementById('wallpapers');
    let row;
    imgs.forEach((url, i) => {
        if (!odd(i)) {
            row = document.createElement('div');
            row.className += 'row';
        }
        const column = document.createElement('div');
        column.className += 'col feature';
        column.innerHTML = `<p><a href=${bing}${url}>${pathToName(url)}</a></p>`;
        const wallpaperImage = document.createElement('img');
        wallpaperImage.className += 'wallpaper';
        wallpaperImage.src = bing + url;
        wallpaperImage.addEventListener('click', () => {
            // to background.js
            chrome.runtime.sendMessage({
                from: 'options',
                subject: 'action',
                action: 'change_wallpaper',
                url: bing + url,
            });
        });
        column.appendChild(wallpaperImage);
        row.appendChild(column);
        // every odd and last image - two images per row
        if (odd(i)) {
            wallpapers.appendChild(row);
        } else {
            if (i == max - 1) {
                wallpapers.appendChild(row);
            }
        }
    });
}

window.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded');
    chrome.storage.sync.get('myWallapersList', (obj) => {
        let wpp = [];
        if (obj.hasOwnProperty('myWallapersList')) {
            wpp = obj.myWallapersList;
            console.log(`Found in storage ${JSON.stringify(wpp)}`);
        }
        if (wpp.length) {
            // not empty list
            console.log(`Found ${wpp.length} wallpapers`);
            addImages(wpp);
        }
    });

    const refreshControl = document.getElementById('refreshInterval');
    const rotateControl = document.getElementById('rotateInterval');
    const selectPositionControl = document.getElementById('selectPosition');
    const downloadWallpapersControl = document.getElementById('downloadWallpapers');

    restoreOptions();
    refreshControl.value = refreshInterval;
    chrome.storage.sync.set({ refreshInterval: refreshControl.value });
    rotateControl.value = rotateInterval;
    chrome.storage.sync.set({ rotateInterval: rotateControl.value });
    selectPositionControl.value = wallpaperPosition;
    chrome.storage.sync.set({ wallpaperPosition: selectPositionControl.value });
    // downloadWallpapersControl.checked = background.downloadWallpapers;
    // add listeners for options change
    refreshControl.addEventListener('input', () => {
        chrome.storage.sync.set({ refreshInterval: refreshControl.value });
    });
    rotateControl.addEventListener('input', () => {
        chrome.storage.sync.set({ rotateInterval: rotateControl.value });
    });
    selectPositionControl.addEventListener('change', () => {
        chrome.storage.sync.set({ wallpaperPosition: selectPositionControl.value });
    });
    downloadWallpapersControl.addEventListener('change', () => {
        chrome.storage.sync.set({ downloadWallpapers: downloadWallpapersControl.checked });
    });
});
