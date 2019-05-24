'use strict';

const bing = 'https://www.bing.com';
const downloadWallpapers = true;
const MaxWallpapers = 24;
let refreshInterval = 180; // In minutes
let rotateInterval = 15; // In minutes
let wallpaperPosition = 'STRETCH';
let WallpapersList = [];

function roll(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pathToName(fp) {
    const filepath = fp.substring(fp.indexOf('id=OHR.') + 7, fp.indexOf('_'));
    // console.log('filepath', filepath);
    const name = filepath.split(/(?=[A-Z])/).join(' ');

    return name;
}

/*
Logs that storage area has changed,
then for each item changed,
log its old value and its new value.
*/
function logStorageChange(changes, area) {
    console.log(`Change in storage area: ${area}`);
    const changedItems = Object.keys(changes);
    changedItems.forEach((key) => {
        console.log(`${key} has changed:`);
        console.log('Old value: ');
        console.log(changes[key].oldValue);
        console.log('New value: ');
        console.log(changes[key].newValue);
    });
}

function doStorageChange(changes, area) {
    const changedItems = Object.keys(changes);
    changedItems.forEach((key) => {
        if (key == 'wallpaperPosition') {
            wallpaperPosition = changes[key].newValue;
        }
        if (key == 'refreshInterval') {
            refreshInterval = changes[key].newValue;
            chrome.alarms.clear('bing-wallpaper-update');
            chrome.alarms.create('bing-wallpaper-update', {
                delayInMinutes: 1,
                periodInMinutes: parseInt(refreshInterval),
            });
            console.log(`${new Date().toString()} Set alarm to ${refreshInterval} minutes`);
        }
        if (key == 'rotateInterval') {
            rotateInterval = changes[key].newValue;
            chrome.alarms.clear('bing-wallpaper-rotate');
            chrome.alarms.create('bing-wallpaper-rotate', {
                delayInMinutes: 3,
                periodInMinutes: parseInt(rotateInterval),
            });
            console.log(`${new Date().toString()} Set alarm to ${rotateInterval} minutes`);
        }
    });
    logStorageChange(changes, area);
}

function restoreOptions() {
    chrome.storage.sync.get('myWallapersList', (obj) => {
        if (obj.hasOwnProperty('myWallapersList')) {
            WallpapersList = obj.myWallapersList;
        }
    });
    chrome.storage.sync.get('rotateInterval', (obj) => {
        if (obj.hasOwnProperty('rotateInterval')) {
            ({ rotateInterval } = obj.rotateInterval);
        } else {
            rotateInterval = 15;
        }
    });
    chrome.storage.sync.get('refreshInterval', (obj) => {
        if (obj.hasOwnProperty('refreshInterval')) {
            ({ refreshInterval } = obj.refreshInterval);
        } else {
            refreshInterval = 180;
        }
    });
    chrome.storage.sync.get('wallpaperPosition', (obj) => {
        if (obj.hasOwnProperty('wallpaperPosition')) {
            ({ wallpaperPosition } = obj.wallpaperPosition);
        } else {
            wallpaperPosition = 'STRETCH';
        }
    });
}

function update() {
    console.log(`${new Date().toString()} Alarm set off! Checking if new wallpaper is available ...`);
    // First get JSON describing latest Bing wallpapers.
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8');
    xhr.responseType = 'json';
    xhr.onreadystatechange = function xhrState() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                const json = this.response;
                chrome.storage.sync.get('myWallapersList', (obj) => {
                    WallpapersList = [];
                    if (obj.hasOwnProperty('myWallapersList')) {
                        WallpapersList = obj.myWallapersList;
                        console.log(`Found in storage ${JSON.stringify(WallpapersList)}`);
                    }
                    // download all available wallpapers that we have not downloaded previously
                    json.images.forEach((image) => {
                        // let hash = image.hsh;
                        const { url } = image;
                        // const copy = image.copyright; // copyright is more of a description
                        const filepath = `Media/Pictures/Bing/${url.substring(
                            url.indexOf('id=OHR.') + 7,
                            url.indexOf('_'),
                        )}.jpg`;
                        if (WallpapersList.includes(url)) {
                            console.log(`+${filepath}`);
                        } else {
                            console.log(`-${filepath}`);
                            if (WallpapersList.length < MaxWallpapers) {
                                // add current url to WallpapersList
                                WallpapersList.push(url);
                            } else {
                                // rotate WallpapersList
                                WallpapersList.shift();
                                WallpapersList = WallpapersList.slice(
                                    WallpapersList.length - MaxWallpapers,
                                    MaxWallpapers + 1,
                                );
                                WallpapersList.push(url);
                                console.log(WallpapersList.length);
                            }
                            if (downloadWallpapers) {
                                chrome.downloads.download({
                                    url: bing + url,
                                    filename: filepath,
                                    conflictAction: 'overwrite',
                                });
                            }
                        }
                    });
                    // after looping over all available wallpapers update myWallapersList in storage
                    chrome.storage.sync.set({ myWallapersList: WallpapersList }, () => {
                        if (chrome.runtime.lastError) {
                            console.log(chrome.runtime.lastError);
                        } else {
                            console.log(`${new Date().toString()} WallpapersList saved `);
                        }
                    });
                });
            } else {
                // Bing JSON isn't accessible - pass, we will retry on next alarm
                console.log('Something went wrong. Are you connected to internet?');
            }
        }
    };
    xhr.send();
}

function rotate() {
    if (WallpapersList.length < 1) {
        console.log(`${new Date().toString()} WallpapersList empty`);

        return;
    }

    console.log(`${new Date().toString()} Alarm set off! Rotating wallpaper ..`);
    const r = roll(0, WallpapersList.length - 1);
    const url = WallpapersList[r];
    const filepath = url.substring(url.lastIndexOf('/') + 1);
    const filename = pathToName(filepath);
    chrome.wallpaper.setWallpaper(
        {
            // We can provide wallpaper image either as url or arraybuffer
            url: bing + url,
            layout: 'STRETCH', // STRETCH or CENTER
            filename: filename,
        },
        () => {},
    );
    console.log(`${new Date().toString()} wallpaper rotated ${filename}`);
}
// When clicked extension icon
// chrome.browserAction.onClicked will not fire if the browser action has a popup
// https://developer.chrome.com/extensions/browserAction#event-onClicked
chrome.browserAction.onClicked.addListener((activeTab) => {
    chrome.tabs.create({ url: '/html/options.html' });
});

chrome.alarms.onAlarm.addListener((alarm) => {
    console.log(`Alarm fired!${JSON.stringify(alarm)}`);
    if (alarm.name == 'bing-wallpaper-update') {
        update();
    } else {
        rotate();
    }
});

chrome.storage.onChanged.addListener(doStorageChange);

// Handling incoming messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.from == 'options') {
        console.log(`Pop from options ${request.subject} ${request.action} ${request.url}`);
        if (request.subject == 'action' && request.action == 'change_wallpaper') {
            // setWallpaper(imgURL, hash, copy);
            const filepath = request.url.substring(request.url.lastIndexOf('/') + 1);
            const filename = pathToName(filepath);
            const wallpaperPosition = 'STRETCH';
            chrome.wallpaper.setWallpaper(
                {
                    // We can provide wallpaper image either as url or arraybuffer
                    url: request.url,
                    layout: wallpaperPosition, // STRETCH or CENTER
                    filename: filepath,
                },
                () => {
                    console.log(`${new Date().toString()} wallpaper rotated ${filename}`);
                },
            );
        }
    }
});

chrome.runtime.onUpdateAvailable.addListener((details) => {
    chrome.storage.sync.set({ myWallapersList: WallpapersList }, () => {
        if (chrome.runtime.lastError) {
            console.log(chrome.runtime.lastError);
            chrome.runtime.reload();
        } else {
            console.log(`${new Date().toString()} WallpapersList saved ${JSON.stringify(WallpapersList)}`);
            chrome.runtime.reload();
        }
    });
});

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason == 'install') {
        console.log('This is a first install!');
        chrome.storage.sync.set({ myWallapersList: WallpapersList }, () => {
            if (chrome.runtime.lastError) {
                console.log(chrome.runtime.lastError);
            } else {
                console.log(`${new Date().toString()} WallpapersList saved ${JSON.stringify(WallpapersList)}`);
            }
        });
    } else if (details.reason == 'update') {
        const thisVersion = chrome.runtime.getManifest().version;
        console.log(`Updated from ${details.previousVersion} to ${thisVersion}!`);
        chrome.storage.sync.get('myWallapersList', (obj) => {
            WallpapersList = [];
            if (obj.hasOwnProperty('myWallapersList')) {
                WallpapersList = obj.myWallapersList;
                console.log(`Found in storage ${JSON.stringify(WallpapersList)}`);
            }
        });
    }
});

function start() {
    restoreOptions();
    chrome.alarms.create('bing-wallpaper-update', { delayInMinutes: 1, periodInMinutes: parseInt(refreshInterval) });
    console.log(`${new Date().toString()} Set alarm to ${refreshInterval} minutes`);
    chrome.alarms.create('bing-wallpaper-rotate', { delayInMinutes: 3, periodInMinutes: parseInt(rotateInterval) });
    console.log(`${new Date().toString()} Set alarm to ${rotateInterval} minutes`);
}

start();
