// @flow

'use strict'

var refresh_interval = 30;     //In minutes
var wallpaper_position = "STRETCH";
var debug = true;

/*
Logs that storage area that changed,
then for each item changed,
log its old value and its new value.
*/
function logStorageChange(changes, area) {
    if(debug) {
        console.log("Change in storage area: " + area);
        let changedItems = Object.keys(changes);
        changedItems.forEach( (key) => {
            console.log(key + " has changed:");
            console.log("Old value: ");
            console.log(changes[key].oldValue);
            console.log("New value: ");
            console.log(changes[key].newValue);
        });
    }
}


function doStorageChange(changes, area) {
    let changedItems = Object.keys(changes);
    changedItems.forEach( (key) =>  {
        if(key == "wallpaper_position") wallpaper_position = changes[key].newValue;
        if(key == "refresh_interval") {
            refresh_interval =  changes[key].newValue;
            chrome.alarms.clear("bing-wallpaper-update");
            chrome.alarms.create("bing-wallpaper-update", {"delayInMinutes": 3,"periodInMinutes": parseInt(refresh_interval)});
            console.log(new Date().toString() + ' Set alarm to ' + refresh_interval + ' minutes');
        }
    });
    logStorageChange(changes, area);
}


function restoreOptions() {
    chrome.storage.sync.get("refresh_interval", (obj) => {
        if(obj.hasOwnProperty("refresh_interval")) refresh_interval = obj.refresh_interval;
    });
    chrome.storage.sync.get("wallpaper_position", (obj) => {
        if(obj.hasOwnProperty("wallpaper_position")) wallpaper_position = obj.wallpaper_position;
    });
}


function sendNotification(msg, buff) {
    // First we have to convert arraybuffer (of an image) to url of a blob for notification
    let blob = new Blob( [ buff ], { type: "image/jpeg" } );
    let urlCreator = window.URL || window.webkitURL;
    let imageUrl = urlCreator.createObjectURL( blob );
    // Now we can send notification with wallpaper miniature
    chrome.notifications.create("wallpaper-available", {
        type: 'basic',
        iconUrl: imageUrl,
        title: "New Bing Wallpaper available",
        message: msg,
        contextMessage: "Set as desktop wallpaper"
    },() => {}) 
}


function setWallpaper(url, hash, message) {
    let buffer = null;
    let xhr = new XMLHttpRequest(); 
    xhr.open("GET", "https://www.bing.com" + url, true); 
    xhr.responseType = "arraybuffer";
    xhr.onload = function() { 
        buffer = xhr.response;
        if (buffer) { 
            let filename = url.substring(url.lastIndexOf("/") + 1);
            chrome.wallpaper.setWallpaper({
                // We can provide wallpaper image either as url or arraybuffer
                // 'url': 'https://www.bing.com'+ url,
                'data': buffer,
                'layout': wallpaper_position,  // STRETCH or CENTER
                'filename': filename
            }, () => {
                chrome.storage.local.set({lastHash: hash});
                sendNotification(message, buffer);
            });
        }
    }
    xhr.send();
}


function onAlarm() {
    console.log(new Date().toString() + ' Alarm set off! Checking if new wallpaper is available ...');
    // First get JSON describing latest Bing wallpapers.
    let xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8');
    xhr.responseType = 'json';
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                let json = this.response;
                // If everything OK - set newest Bing wallpaper as desktop wallpaper
                if(json.images[0].url) {
                    let imgURL = json.images[0].url;
                    let hash = json.images[0].hsh;
                    let copy = json.images[0].copyright; //copyright is more of a description
                    // lastHash is a hash value of newest Bing wallpaper downloaded so far by extension
                    chrome.storage.local.get({lastHash: 'None'}, (items) => {
                        if(hash != items.lastHash)
                            // set newest as desktop wallpaper
                            setWallpaper(imgURL, hash, copy);
                        else
                            // or pass if nothing new
                            console.log(new Date().toString() + ' New wallpaper not available');
                    });
                }
                // myHashArray stores hashes of wallpapers downloaded so far
                chrome.storage.sync.get('myHashArray', (obj) => {
                    let hashArray = [];
                    if(obj.hasOwnProperty('myHashArray')) {
                        hashArray = obj.myHashArray;
                        console.log('Found in storage ' + JSON.stringify(hashArray));
                    }
                    // download all available wallpapers that we have not downloaded previously
                    json.images.forEach( (image) => {
                        let hash = image.hsh;
                        if( hashArray.includes(hash) )
                            // pass
                            console.log('Found ' + hash);
                        else {
                            // add current hash to hashArray
                            hashArray.push(hash);
                            // console.log('hashArray updated ' + JSON.stringify(hashArray));
                            let url = image.url;
                            let filename = 'Media/Pictures/Bing' + url.substring(url.lastIndexOf("/"));
                            console.log('Downloading ' + filename);
                            chrome.downloads.download({
                                url: 'https://www.bing.com' + url,
                                filename: filename,
                                conflictAction: 'overwrite'
                            });
                        }
                    });
                    // after looping over all available wallpapers update myHashArray in storage
                    chrome.storage.sync.set({ myHashArray: hashArray }, () => {
                        if (chrome.runtime.lastError)
                            console.log(chrome.runtime.lastError);
                        else
                            console.log(new Date().toString() + ' hashArray saved ' + JSON.stringify(hashArray));
                    });
                });
            } else {
                // Bing JSON isn't accessible - pass, we will retry on next alarm
                console.log("Something went wrong. Are you connected to internet?");
            }
        }
    };
    xhr.send();
}


chrome.alarms.onAlarm.addListener(onAlarm);
chrome.storage.onChanged.addListener(doStorageChange);


function start() {
    restoreOptions();
    // try refreshing wallpaper every half an hour
    chrome.alarms.create("bing-wallpaper-update", {"delayInMinutes": 3,"periodInMinutes": parseInt(refresh_interval)});
    console.log(new Date().toString() + ' Set alarm to ' + refresh_interval + ' minutes');
}


start();
