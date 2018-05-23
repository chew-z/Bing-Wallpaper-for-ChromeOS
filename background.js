// @flow

'use strict'


function sendNotification(msg, buff) {
    let blob = new Blob( [ buff ], { type: "image/jpeg" } );
    let urlCreator = window.URL || window.webkitURL;
    let imageUrl = urlCreator.createObjectURL( blob );
    chrome.notifications.create("bingwall", {
        type: 'basic',
        iconUrl: imageUrl,
        title: "Bing Wallpaper for Chromebook",
        message: msg,
        contextMessage: "New wallpaper downloaded"
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
            chrome.wallpaper.setWallpaper({
                // 'url': 'https://www.bing.com'+ url,
                'data': buffer,
                'layout': 'CENTER',  // STRETCH or CENTER
                'filename': 'bing_wallpaper'
            }, () => {
                chrome.storage.local.set({lastHash: hash});
                sendNotification(message, buffer);
            });
        }
    }
    xhr.send();
}


function onAlarm() {
    console.log(new Date().toString() + 'Got Alarm! Updating wallpaper ...');
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


function start() {
    // try refreshing wallpaper every half an hour
    let alarm = 30;
    chrome.alarms.create("update", {"delayInMinutes": 3,"periodInMinutes": alarm});
    console.log(new Date().toString() + ' background set alarm to ' + alarm + ' minutes');
}


start();
