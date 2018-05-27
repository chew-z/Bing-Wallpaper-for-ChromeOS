// options.js
// @flow
// @flow-NotIssue
"use strict"


var background = chrome.extension.getBackgroundPage();

/* list all background variables and their values */
function _inspect_background() {
    console.log("background: " + Object.prototype.toString.call(background));
    for(let b in background) {
        if(window.hasOwnProperty(b)) console.log(b);
    }
}

function pathToName(fp) {
    let name = fp.substring(fp.lastIndexOf("/") + 1);
    name = name.substring(0, name.indexOf("_"));
    name = name.split(/(?=[A-Z])/).join(" ");
    return name;
}

function odd(i) {
    if(i & 1) 
        return true
    else
        return false
}


function uniqWallpapers(a) {
    // Because Chrome brogrammers are dumb and chrome.downloads.search returns duplicates
    // https://stackoverflow.com/questions/9229645/remove-duplicate-values-from-js-array
    // adjusted for our needs (unique filepath)
    let seen = {};
    return a.filter( (item) => {
        return seen.hasOwnProperty(item.filename) ? false : (seen[item.filename] = true);
    });
}


function addImage(fp, elem) {
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () { 
        if (this.readyState == 4) { 
            let urlCreator = window.URL || window.webkitURL;
            let imageUrl = urlCreator.createObjectURL(this.response);
            elem.src = imageUrl;
        } 
    }
    xhr.open('GET', "file://" + fp);
    xhr.responseType = 'blob';
    xhr.send();
}


function addImages(imgs) {
    let max = imgs.length;
    let wallpapers = document.getElementById("wallpapers");
    let row;
    imgs.forEach( (img, i) => {
        // console.log('i = ' + i);
        if ( !odd(i) ) {
            row = document.createElement("div");
            row.className += "row";
        }
        let column = document.createElement("div");
        column.className += "col feature";
        column.innerHTML = '<p><a href=' + img.url + '>' + pathToName(img.filename) + '</a></p>';
        // let a = document.createElement("a");
        // a.href = img.url;
        let wallpaper_image = document.createElement("img");
        wallpaper_image.className += "wallpaper";
        chrome.extension.isAllowedFileSchemeAccess( (allowed) => {
            if (allowed) {
                // console.log("file access allowed");
                addImage(img.filename, wallpaper_image);
            } else { // This should be fallback
                wallpaper_image.src = img.url;
            }
        });
        wallpaper_image.addEventListener('click', () => { 
            // background.js
            chrome.runtime.sendMessage({
                "from": "options",
                "subject": "action",
                "action": "change_wallpaper",
                "url": img.url
            });
        });
        column.appendChild(wallpaper_image);
        // a.appendChild(wallpaper_image);
        // column.appendChild(a);
        row.appendChild(column);
        // every odd and last image - two images per row
        if ( odd(i) ) {
            wallpapers.appendChild(row);
        } else {
            if (i == max - 1)
                wallpapers.appendChild(row);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    let refreshInterval = document.getElementById("refreshInterval");
    let rotateInterval = document.getElementById("rotateInterval");
    let selectPosition = document.getElementById("selectPosition");
    let limitDisplayed = 24; // TODO add as configurable option

    refreshInterval.value = background.refresh_interval;
    rotateInterval.value = background.rotate_interval;
    selectPosition.value = background.wallpaper_position;
    limitDisplayed = background.limit_displayed;

    // add listeners for options change
    refreshInterval.addEventListener("input", () => {
        chrome.storage.sync.set({ "refresh_interval": refreshInterval.value } );
    });
    rotateInterval.addEventListener("input", () => {
        chrome.storage.sync.set({ "rotate_interval": rotateInterval.value } );
    });
    selectPosition.addEventListener("change", () => {
        chrome.storage.sync.set({ "wallpaper_position": selectPosition.value } );
    });
    // create grid with wallpapers
    chrome.downloads.search({
        query: ["Media/Pictures/Bing"],
        filenameRegex: '.+_1920x1080\.jpg$',
        limit: limitDisplayed },
        (wpp) => {
            if(wpp.length)  // not empty list
                addImages(uniqWallpapers(wpp));
        });
    let images = document.getElementsByClassName('wallpaper');
    for (var i = 0; i < images.length; i++) {
            };
});
