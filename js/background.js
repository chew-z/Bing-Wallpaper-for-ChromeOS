'use strict';

const bing = 'https://www.bing.com';
let refresh_interval = 180; // In minutes
let rotate_interval = 60; // In minutes
let wallpaper_position = 'STRETCH';
const download_wallpapers = true;
let WallpapersList = [];

function roll(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
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
        if (key == 'wallpaper_position') {
            wallpaper_position = changes[key].newValue;
        }
        if (key == 'refresh_interval') {
            refresh_interval = changes[key].newValue;
            chrome.alarms.clear('bing-wallpaper-update');
            chrome.alarms.create('bing-wallpaper-update', {
                delayInMinutes: 3,
                periodInMinutes: parseInt(refresh_interval),
            });
            console.log(`${new Date().toString()} Set alarm to ${refresh_interval} minutes`);
        }
        if (key == 'rotate_interval') {
            rotate_interval = changes[key].newValue;
            chrome.alarms.clear('bing-wallpaper-rotate');
            chrome.alarms.create('bing-wallpaper-rotate', {
                delayInMinutes: 3,
                periodInMinutes: parseInt(rotate_interval),
            });
            console.log(`${new Date().toString()} Set alarm to ${rotate_interval} minutes`);
        }
    });
    logStorageChange(changes, area);
}

function restoreOptions() {
    chrome.storage.sync.get('refresh_interval', (obj) => {
        if (obj.hasOwnProperty('refresh_interval')) {
            refresh_interval = obj.refresh_interval;
        }
    });
    chrome.storage.sync.get('wallpaper_position', (obj) => {
        if (obj.hasOwnProperty('wallpaper_position')) {
            wallpaper_position = obj.wallpaper_position;
        }
    });
}

function sendNotification(msg, buff) {
    // First we have to convert arraybuffer (of an image) to url of a blob for notification
    const blob = new Blob([buff], { type: 'image/jpeg' });
    const urlCreator = window.URL || window.webkitURL;
    const imageUrl = urlCreator.createObjectURL(blob);
    // Now we can send notification with wallpaper miniature
    chrome.notifications.create(
        'wallpaper-available',
        {
            type: 'basic',
            iconUrl: imageUrl,
            title: 'New Bing Wallpaper available',
            message: msg,
            contextMessage: 'Set as desktop wallpaper',
        },
        () => {},
    );
}

function setWallpaper(url, message) {
    let buffer = null;
    const xhr = new XMLHttpRequest();
    xhr.open('GET', bing + url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function() {
        buffer = xhr.response;
        if (buffer) {
            const filename = url.substring(url.lastIndexOf('/') + 1);
            chrome.wallpaper.setWallpaper(
                {
                    // We can provide wallpaper image either as url or arraybuffer
                    // 'url': 'https://www.bing.com'+ url,
                    data: buffer,
                    layout: wallpaper_position, // STRETCH or CENTER
                    filename: filename,
                },
                () => {
                    sendNotification(message, buffer);
                },
            );
        }
    };
    xhr.send();
}

function update() {
    console.log(`${new Date().toString()} Alarm set off! Checking if new wallpaper is available ...`);
    // First get JSON describing latest Bing wallpapers.
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8');
    xhr.responseType = 'json';
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                const json = this.response;
                // If everything OK - set newest Bing wallpaper as desktop wallpaper
                // if (json.images[0].url) {
                //     const imgURL = json.images[0].url;
                //     // let hash = json.images[0].hsh;
                //     const copy = json.images[0].copyright; // copyright is more of a description
                //     if (!WallpapersList.includes(imgURL)) {
                //         setWallpaper(imgURL, copy);
                //     }
                // }
                // myWallapersList stores paths of wallpapers downloaded so far (relative to Downloads)
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
                        const copy = image.copyright; // copyright is more of a description
                        // const filepath = `Media/Pictures/Bing${url.substring(url.lastIndexOf("/"))}`;
                        const filepath = `Media/Pictures/Bing/${url.substring(url.indexOf('id=OHR.')+7, url.indexOf('_'))}.jpg`;
                        console.log('filepath', filepath);
                        if (WallpapersList.includes(url)) {
                            console.log(`+${url}`);
                        } else {
                            console.log(`-${url}`);
                            if (WallpapersList.length < 100) {
                                // add current url to WallpapersList
                                WallpapersList.push(url);
                            } else {
                                // rotate WallpapersList
                                WallpapersList.shift();
                                WallpapersList.push(url);
                            }
                            if (download_wallpapers) {
                                chrome.downloads.download({
                                    url: bing + url,
                                    filename: filepath,
                                    conflictAction: 'overwrite',
                                });
                            }
                        }
                        // in some edge case we will set wallpaper up to 8 times
                        // so let's use rotate for that
                        // setWallpaper(url, copy);
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
    console.log(`${new Date().toString()} Alarm set off! Rotating wallpaper ..`);
    if (WallpapersList.length < 1) {
        console.log(`${new Date().toString()} WallpapersList empty`);

        return;
    }

    const r = roll(0, WallpapersList.length - 1);
    const url = WallpapersList[r];
    const filename = url.substring(url.lastIndexOf('/') + 1);
    chrome.wallpaper.setWallpaper(
        {
            // We can provide wallpaper image either as url or arraybuffer
            url: bing + url,
            // 'data': buffer,
            layout: wallpaper_position, // STRETCH or CENTER
            filename: filename,
        },
        () => {},
    );
    console.log(`${new Date().toString()} wallpaper rotated ${url}`);
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
            const filename = request.url.substring(request.url.lastIndexOf('/') + 1);
            chrome.wallpaper.setWallpaper(
                {
                    // We can provide wallpaper image either as url or arraybuffer
                    url: request.url,
                    layout: wallpaper_position, // STRETCH or CENTER
                    filename: filename,
                },
                () => {
                    console.log(`${new Date().toString()} wallpaper rotated ${request.url}`);
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
    // try updating wallpaper every half an hour
    chrome.alarms.create('bing-wallpaper-update', { delayInMinutes: 1, periodInMinutes: parseInt(refresh_interval) });
    console.log(`${new Date().toString()} Set alarm to ${refresh_interval} minutes`);
    chrome.alarms.create('bing-wallpaper-rotate', { delayInMinutes: 3, periodInMinutes: parseInt(rotate_interval) });
    console.log(`${new Date().toString()} Set alarm to ${rotate_interval} minutes`);
}

start();
