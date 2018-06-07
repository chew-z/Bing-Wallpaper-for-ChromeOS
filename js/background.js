// @flow

'use strict'

var bing= 'https://www.bing.com';
var refresh_interval = 180;     //In minutes
var rotate_interval = 60;     //In minutes
var wallpaper_position = "STRETCH";
var download_wallpapers = true;
var WallpapersList = ["/az/hprichbg/rb/AsiaticElephant_ROW14371193881_1920x1080.jpg","/az/hprichbg/rb/TSSSF_ROW13060953605_1920x1080.jpg","/az/hprichbg/rb/SallyRideEarthKAM_ROW14261019694_1920x1080.jpg","/az/hprichbg/rb/WineDay_ROW11240086517_1920x1080.jpg","/az/hprichbg/rb/ShediacMarshland_ROW10694874486_1920x1080.jpg","/az/hprichbg/rb/TurtleTears_ROW8192928132_1920x1080.jpg","/az/hprichbg/rb/StormyCrater_ROW8142989560_1920x1080.jpg","/az/hprichbg/rb/Sunbird1_ROW12058461588_1920x1080.jpg","/az/hprichbg/rb/KhumbuTents_ROW5396100750_1920x1080.jpg","/az/hprichbg/rb/AerialPantanal_ROW7671225373_1920x1080.jpg","/az/hprichbg/rb/MooseLakeGrass_ROW13437486333_1920x1080.jpg","/az/hprichbg/rb/SamoaRowing_ROW11000444660_1920x1080.jpg","/az/hprichbg/rb/Liverpool_ROW14503032017_1920x1080.jpg","/az/hprichbg/rb/R2R2R_ROW11281647624_1920x1080.jpg","/az/hprichbg/rb/AuburnBalloons_ROW9657158205_1920x1080.jpg","/az/hprichbg/rb/HimalayanSummer_ROW11238131878_1920x1080.jpg","/az/hprichbg/rb/StaithesVillage_ROW10180973959_1920x1080.jpg"]

function roll(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/*
Logs that storage area has changed,
then for each item changed,
log its old value and its new value.
*/
function logStorageChange(changes, area) {
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
        if(key == "rotate_interval") {
            rotate_interval =  changes[key].newValue;
            chrome.alarms.clear("bing-wallpaper-rotate");
            chrome.alarms.create("bing-wallpaper-rotate", {"delayInMinutes": 3,"periodInMinutes": parseInt(rotate_interval)});
            console.log(new Date().toString() + ' Set alarm to ' + rotate_interval + ' minutes');
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


function setWallpaper(url, message) {
    let buffer = null;
    let xhr = new XMLHttpRequest(); 
    xhr.open("GET", bing + url, true); 
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
                sendNotification(message, buffer);
            });
        }
    }
    xhr.send();
}


function Update() {
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
                    // let hash = json.images[0].hsh;
                    let copy = json.images[0].copyright; //copyright is more of a description
                    if( !WallpapersList.includes(imgURL) ) {
                        setWallpaper(imgURL, copy);
                    }
                }
                // myWallapersList stores paths of wallpapers downloaded so far (relative to Downloads)
                chrome.storage.sync.get('myWallapersList', (obj) => {
                    WallpapersList = [];
                    if(obj.hasOwnProperty('myWallapersList')) {
                        WallpapersList = obj.myWallapersList;
                        console.log('Found in storage ' + JSON.stringify(WallpapersList));
                    }
                    // download all available wallpapers that we have not downloaded previously
                    json.images.forEach( (image) => {
                        // let hash = image.hsh;
                        let url = image.url;
                        let filepath = 'Media/Pictures/Bing' + url.substring(url.lastIndexOf("/"));
                        if( WallpapersList.includes(url) ) 
                            console.log('+' + url);
                        else {
                            console.log('-' + url);
                            // add current url to WallpapersList
                            WallpapersList.push(url);
                            if ( download_wallpapers ) 
                                chrome.downloads.download({
                                    url: bing + url,
                                    filename: filepath,
                                    conflictAction: 'overwrite'
                                });
                        }
                    });
                    // after looping over all available wallpapers update myWallapersList in storage
                    chrome.storage.sync.set({ myWallapersList: WallpapersList }, () => {
                        if (chrome.runtime.lastError)
                            console.log(chrome.runtime.lastError);
                        else
                            console.log(new Date().toString() + ' WallpapersList saved ');
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


function Rotate() {
    console.log(new Date().toString() + ' Alarm set off! Rotating wallpaper ..');
    let r = roll(0, WallpapersList.length - 1);
    let url = WallpapersList[r];
    let filename = url.substring(url.lastIndexOf("/") + 1);
    chrome.wallpaper.setWallpaper({
        // We can provide wallpaper image either as url or arraybuffer
        'url': bing + url,
        // 'data': buffer,
        'layout': wallpaper_position,  // STRETCH or CENTER
        'filename': filename
    }, () => {
    });
    console.log(new Date().toString() + ' wallpaper rotated ' + url);
}
// When clicked extension icon
// chrome.browserAction.onClicked will not fire if the browser action has a popup
// https://developer.chrome.com/extensions/browserAction#event-onClicked
chrome.browserAction.onClicked.addListener( (activeTab) => {
    chrome.tabs.create({'url': "/html/options.html" } )
})


chrome.alarms.onAlarm.addListener( (alarm) => {
    console.log('Alarm fired!' + JSON.stringify(alarm));
    if (alarm.name == "bing-wallpaper-update") { 
        Update();
    } else {
        Rotate();
    }
});


chrome.storage.onChanged.addListener(doStorageChange);

// Handling incoming messages
chrome.runtime.onMessage.addListener( (request, sender, sendResponse) => {
    if (request.from == "options") {
        console.log("Pop from options " + request.subject + " " + request.action + " " + request.url);
        if(request.subject == 'action' && request.action == 'change_wallpaper') {
            // setWallpaper(imgURL, hash, copy);
            let filename = request.url.substring(request.url.lastIndexOf("/") + 1);
            chrome.wallpaper.setWallpaper({
                // We can provide wallpaper image either as url or arraybuffer
                'url': request.url,
                'layout': wallpaper_position,  // STRETCH or CENTER
                'filename': filename
            }, () => {
                console.log(new Date().toString() + ' wallpaper rotated ' + request.url);
            });
        }
    }
});


chrome.runtime.onUpdateAvailable.addListener( (details) => { 
    chrome.storage.sync.set({ myWallapersList: WallpapersList }, () => {
        if (chrome.runtime.lastError) {
            console.log(chrome.runtime.lastError);
            chrome.runtime.reload();
        } else {
            console.log(new Date().toString() + ' WallpapersList saved ' + JSON.stringify(WallpapersList));
            chrome.runtime.reload();
        }
    });
});

chrome.runtime.onInstalled.addListener( (details) => { 
    if(details.reason == "install"){
        console.log("This is a first install!");
        chrome.storage.sync.set({ myWallapersList: WallpapersList }, () => {
            if (chrome.runtime.lastError) {
                console.log(chrome.runtime.lastError);
            } else {
                console.log(new Date().toString() + ' WallpapersList saved ' + JSON.stringify(WallpapersList));
            }
        });

    }   else if(details.reason == "update"){
        var thisVersion = chrome.runtime.getManifest().version;
        console.log("Updated from " + details.previousVersion + " to " + thisVersion + "!");
        chrome.storage.sync.get('myWallapersList', (obj) => {
            WallpapersList = [];
            if(obj.hasOwnProperty('myWallapersList')) {
                WallpapersList = obj.myWallapersList;
                console.log('Found in storage ' + JSON.stringify(WallpapersList));
            }
        });
    }
});

function start() {
    restoreOptions();
    // try updating wallpaper every half an hour
    chrome.alarms.create("bing-wallpaper-update", {"delayInMinutes": 3,"periodInMinutes": parseInt(refresh_interval)});
    console.log(new Date().toString() + ' Set alarm to ' + refresh_interval + ' minutes');
    chrome.alarms.create("bing-wallpaper-rotate", {"delayInMinutes": 1,"periodInMinutes": parseInt(rotate_interval)});
    console.log(new Date().toString() + ' Set alarm to ' + rotate_interval + ' minutes');
}


start();
